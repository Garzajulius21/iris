"""
IRIS ingestion layer.
Parses uploaded files (TXT, CSV, EML, DOCX) and pasted text into a single
plain-text document that can be sent to Claude for extraction.
"""

import csv
import io
import email
from email import policy


def parse_text(content: str) -> str:
    """Return raw text as-is."""
    return content.strip()


def parse_csv(content: str, filename: str = '') -> str:
    """Flatten a CSV into a labelled text block."""
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    if not rows:
        return ''

    lines = [f'[CSV file: {filename}]' if filename else '[CSV data]']
    lines.append(f'Columns: {", ".join(rows[0].keys())}')
    lines.append(f'Rows: {len(rows)}')
    lines.append('')

    for i, row in enumerate(rows, 1):
        parts = [f'{k}: {v}' for k, v in row.items() if v and v.strip()]
        lines.append(f'Row {i}: {" | ".join(parts)}')

    return '\n'.join(lines)


def parse_eml(content: bytes | str, filename: str = '') -> str:
    """Extract subject, sender, date, and body from an EML file."""
    if isinstance(content, str):
        content = content.encode('utf-8', errors='replace')

    msg = email.message_from_bytes(content, policy=policy.default)
    lines = [f'[Email file: {filename}]' if filename else '[Email]']

    for header in ('From', 'To', 'Subject', 'Date'):
        val = msg.get(header, '')
        if val:
            lines.append(f'{header}: {val}')

    lines.append('')

    # Extract plain text body
    body = ''
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == 'text/plain':
                body = part.get_content()
                break
    else:
        if msg.get_content_type() == 'text/plain':
            body = msg.get_content()

    if body:
        lines.append('Body:')
        lines.append(body.strip())

    return '\n'.join(lines)


def parse_docx(content: bytes, filename: str = '') -> str:
    """
    Extract all text from a .docx file, preserving heading structure
    so Claude can understand document sections.
    """
    from docx import Document
    from docx.oxml.ns import qn
    import io as _io

    doc = Document(_io.BytesIO(content))
    lines = [f'[Word document: {filename}]' if filename else '[Word document]']
    lines.append('')

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style = para.style.name if para.style else ''
        if style.startswith('Heading'):
            level = style.replace('Heading', '').strip()
            prefix = '#' * int(level) if level.isdigit() else '#'
            lines.append(f'\n{prefix} {text}')
        else:
            lines.append(text)

    # Also extract text from tables
    for table in doc.tables:
        lines.append('')
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                lines.append(' | '.join(cells))

    return '\n'.join(lines)


def combine_inputs(sources: list[dict]) -> str:
    """
    sources: list of {'label': str, 'text': str}
    Returns a single document with labelled sections.
    """
    parts = []
    for i, src in enumerate(sources, 1):
        label = src.get('label') or f'Source {i}'
        text = src.get('text', '').strip()
        if text:
            parts.append(f'--- {label} ---\n{text}')

    return '\n\n'.join(parts)
