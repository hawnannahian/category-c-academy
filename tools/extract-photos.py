#!/usr/bin/env python3
"""Regenerate photos/q{id}.jpg from the study-guide PDF. Run from the repo root.
Each question page holds one 451x300 photo per question; the embedded JPEGs are copied byte-for-byte
(no re-encoding) and matched to the page's questions in order. Needs poppler's pdfimages."""
import collections, glob, json, shutil, subprocess, tempfile
from pathlib import Path
from PIL import Image

PDF = 'Category_C_Study_Guide_PT-BN_2026_FINAL_v4.pdf'
by_page = collections.defaultdict(list)
for q in json.load(open('questions.json')):
    by_page[q['page']].append(q['id'])
out = Path('photos'); out.mkdir(exist_ok=True)
for old in out.glob('q*.jpg'):
    old.unlink()
with tempfile.TemporaryDirectory() as tmp:
    for page, ids in sorted(by_page.items()):
        prefix = f'{tmp}/p{page}'
        subprocess.run(['pdfimages', '-j', '-f', str(page), '-l', str(page), PDF, prefix], check=True)
        files = [f for f in sorted(glob.glob(prefix + '-*')) if Image.open(f).size == (451, 300)]
        assert len(files) == len(ids), f'page {page}: {len(files)} photos for questions {ids}'
        for f, qid in zip(files, sorted(ids)):
            assert f.endswith('.jpg'), f
            shutil.copyfile(f, out / f'q{qid}.jpg')
n = len(list(out.glob('q*.jpg')))
assert n == 307, f'expected 307 photos, got {n}'
print(n, 'photos written')
