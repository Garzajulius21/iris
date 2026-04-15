"""
IRIS backend server
Handles multi-format ingestion, Claude API section extraction,
and report assembly for the CISO-facing PDF brief.
"""

import os
import json
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from lib.ingest import parse_text, parse_csv, parse_eml, parse_docx, combine_inputs
from lib.extract import extract_section, SECTION_NAMES

app = Flask(__name__)
CORS(app, origins=['http://localhost:5175', 'http://127.0.0.1:5175'])

# In-memory session
_session = {
    'raw_notes': '',
    'sources': [],
    'report': {},
}


# ── Ingest ────────────────────────────────────────────────────────────────────

@app.route('/api/ingest', methods=['POST'])
def ingest():
    """
    Accepts multipart/form-data with:
      - files[]: one or more uploaded files (TXT, CSV, EML)
      - paste: plain-text content (optional)
    Returns the combined raw notes and a preview.
    """
    sources = []

    paste = request.form.get('paste', '').strip()
    if paste:
        sources.append({'label': 'Pasted notes', 'text': parse_text(paste)})

    files = request.files.getlist('files[]')
    for f in files:
        filename = f.filename or ''
        content = f.read()
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

        if ext == 'csv':
            text = parse_csv(content.decode('utf-8', errors='replace'), filename)
        elif ext == 'eml':
            text = parse_eml(content, filename)
        elif ext == 'docx':
            text = parse_docx(content, filename)
        else:
            # TXT or unknown — treat as plain text
            text = parse_text(content.decode('utf-8', errors='replace'))

        if text:
            sources.append({'label': filename or 'Uploaded file', 'text': text})

    if not sources:
        return jsonify({'error': 'No content provided. Upload files or paste notes.'}), 400

    raw_notes = combine_inputs(sources)
    _session['raw_notes'] = raw_notes
    _session['sources'] = [s['label'] for s in sources]
    _session['report'] = {}

    word_count = len(raw_notes.split())

    return jsonify({
        'sources': _session['sources'],
        'word_count': word_count,
        'preview': raw_notes[:500] + ('…' if len(raw_notes) > 500 else ''),
    })


# ── Process (streaming SSE) ───────────────────────────────────────────────────

@app.route('/api/process', methods=['GET'])
def process():
    """
    Server-Sent Events stream.
    Processes each section in order, emitting progress events and results.

    Event types:
      progress  — {"section": str, "status": "started"|"done"|"cached"}
      result    — {"section": str, "data": dict}
      error     — {"section": str, "message": str}
      complete  — {"report": dict}
    """
    raw_notes = _session.get('raw_notes', '')
    if not raw_notes:
        return jsonify({'error': 'No notes ingested. Call /api/ingest first.'}), 400

    def generate():
        report = {}
        errors = {}
        for section in SECTION_NAMES:
            # Check cache without making API call
            from lib import cache as _cache
            key = _cache.cache_key(section, raw_notes)
            is_cached = _cache.load(key) is not None

            yield _sse('progress', {'section': section, 'status': 'cached' if is_cached else 'started'})

            try:
                data = extract_section(section, raw_notes)
                report[section] = data
                yield _sse('result', {'section': section, 'data': data})
                yield _sse('progress', {'section': section, 'status': 'done'})
            except Exception as exc:
                msg = str(exc)
                errors[section] = msg
                yield _sse('error', {'section': section, 'message': msg})
                yield _sse('progress', {'section': section, 'status': 'error'})

        _session['report'] = report
        # Always emit complete so the client can close the stream cleanly.
        # If all sections errored, report will be empty and the client
        # will surface the per-section error messages instead.
        yield _sse('complete', {'report': report, 'errors': errors})

    return Response(stream_with_context(generate()), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


def _sse(event: str, data: dict) -> str:
    return f'event: {event}\ndata: {json.dumps(data)}\n\n'


# ── Report ────────────────────────────────────────────────────────────────────

@app.route('/api/report', methods=['GET'])
def get_report():
    if not _session['report']:
        return jsonify({'error': 'No report generated yet.'}), 404
    return jsonify({
        'report': _session['report'],
        'sources': _session['sources'],
    })


# ── Reset ─────────────────────────────────────────────────────────────────────

@app.route('/api/reset', methods=['POST'])
def reset():
    _session['raw_notes'] = ''
    _session['sources'] = []
    _session['report'] = {}
    return jsonify({'ok': True})


# ── Health ────────────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    api_key_set = bool(os.getenv('ANTHROPIC_API_KEY'))
    return jsonify({
        'status': 'ok',
        'api_key_configured': api_key_set,
        'has_notes': bool(_session['raw_notes']),
        'has_report': bool(_session['report']),
    })


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 3002))
    print(f'\nIRIS backend starting on http://localhost:{port}')
    print('Make sure ANTHROPIC_API_KEY is set in .env\n')
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(port=port, debug=debug)
