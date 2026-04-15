"""
Local JSON cache for Claude API responses.
Key = SHA-256 of (section_name + raw_notes). Stored in ~/.iris_cache/.
"""

import os
import json
import hashlib
from pathlib import Path

CACHE_DIR = Path.home() / '.iris_cache'


def _ensure_dir():
    CACHE_DIR.mkdir(exist_ok=True)


def cache_key(section: str, raw_notes: str) -> str:
    return hashlib.sha256(f'{section}:{raw_notes}'.encode()).hexdigest()


def load(key: str):
    _ensure_dir()
    path = CACHE_DIR / f'{key}.json'
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return None
    return None


def save(key: str, data: dict):
    _ensure_dir()
    path = CACHE_DIR / f'{key}.json'
    path.write_text(json.dumps(data, indent=2))
