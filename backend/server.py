"""
IRIS backend server
Handles multi-format ingestion, Claude API section extraction,
and report assembly for the CISO-facing PDF brief.
"""

import os
import io
import json
import base64
import zipfile
import anthropic
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from lib.ingest import (
    parse_text, combine_inputs,
    parse_file_by_extension, IMAGE_EXTENSIONS, IMAGE_MIME
)
from lib.extract import extract_section, SECTION_NAMES

app = Flask(__name__)
CORS(app, origins=['http://localhost:5175', 'http://127.0.0.1:5175'])

_client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

# In-memory session
_session = {
    'raw_notes': '',
    'sources': [],
    'report': {},
}


# ── Image vision analysis ─────────────────────────────────────────────────────

def analyze_image(content: bytes, filename: str) -> str:
    """
    Send an image to Claude vision and extract all security-relevant
    information visible in the screenshot as structured text notes.
    """
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'png'
    mime = IMAGE_MIME.get(ext, 'image/png')
    image_data = base64.standard_b64encode(content).decode('utf-8')

    response = _client.messages.create(
        model=os.getenv('IRIS_MODEL', 'claude-opus-4-6'),
        max_tokens=1500,
        messages=[{
            'role': 'user',
            'content': [
                {
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': mime,
                        'data': image_data,
                    }
                },
                {
                    'type': 'text',
                    'text': (
                        'You are an IR analyst reviewing a screenshot from a cybersecurity investigation. '
                        'Extract and describe ALL visible information relevant to an incident report. '
                        'Include: alert names, log entries, timestamps, IP addresses, hostnames, '
                        'usernames, file paths, process names, error messages, SIEM detections, '
                        'EDR alerts, dashboard metrics, email content, command output, or any other '
                        'security-relevant data. Be thorough and specific. '
                        'Format your response as structured analyst notes.'
                    )
                }
            ]
        }]
    )

    description = response.content[0].text
    return f'[Screenshot analysis: {filename}]\n\n{description}'


# ── ZIP extraction ────────────────────────────────────────────────────────────

def process_zip(content: bytes, zip_filename: str) -> list[dict]:
    """
    Extract a ZIP archive and parse each file inside.
    Returns a list of {'label': str, 'text': str} source dicts,
    and a separate list of image dicts for vision processing.
    """
    text_sources = []
    image_files = []

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for name in zf.namelist():
                # Skip macOS metadata and hidden files
                if name.startswith('__MACOSX') or name.startswith('.'):
                    continue
                if name.endswith('/'):
                    continue  # directory entry

                file_content = zf.read(name)
                short_name = name.split('/')[-1]  # strip any subfolder path
                ext = short_name.rsplit('.', 1)[-1].lower() if '.' in short_name else ''

                if ext in IMAGE_EXTENSIONS:
                    image_files.append({'content': file_content, 'filename': short_name})
                else:
                    text = parse_file_by_extension(file_content, short_name)
                    if text and text.strip():
                        text_sources.append({
                            'label': f'{zip_filename} → {short_name}',
                            'text': text
                        })
    except zipfile.BadZipFile:
        pass  # Silently skip corrupt archives

    return text_sources, image_files


# ── Ingest ────────────────────────────────────────────────────────────────────

@app.route('/api/ingest', methods=['POST'])
def ingest():
    """
    Accepts multipart/form-data with:
      - files[]: one or more uploaded files
      - paste: plain-text content (optional)

    Supported file types:
      TXT, CSV, EML, DOCX, PDF, PPTX, XLSX, HTML, JSON,
      PNG, JPG, JPEG, GIF, WEBP (via Claude vision),
      ZIP (extracted and parsed recursively)
    """
    sources = []
    image_queue = []  # {'content': bytes, 'filename': str}

    paste = request.form.get('paste', '').strip()
    if paste:
        sources.append({'label': 'Pasted notes', 'text': parse_text(paste)})

    files = request.files.getlist('files[]')
    for f in files:
        filename = f.filename or ''
        content = f.read()
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

        if ext == 'zip':
            text_sources, image_files = process_zip(content, filename)
            sources.extend(text_sources)
            image_queue.extend(image_files)

        elif ext in IMAGE_EXTENSIONS:
            image_queue.append({'content': content, 'filename': filename})

        else:
            text = parse_file_by_extension(content, filename)
            if text and text.strip():
                sources.append({'label': filename or 'Uploaded file', 'text': text})

    # Run vision analysis on all images
    for img in image_queue:
        try:
            description = analyze_image(img['content'], img['filename'])
            sources.append({'label': img['filename'], 'text': description})
        except Exception as e:
            sources.append({
                'label': img['filename'],
                'text': f'[Image could not be analyzed: {e}]'
            })

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
