#!/usr/bin/env python3
"""Regenerate photos/q{id}.jpg from the study-guide PDF. Run from the repo root.
Crop box matches the coordinates in app.js PDF_IMAGE_Y (PDF points, top-left origin)."""
import json, re, subprocess
from pathlib import Path

PDF = 'Category_C_Study_Guide_PT-BN_2026_FINAL_v4.pdf'
X, W, H, SCALE = 438.903, 96.746, 64.5, 2.5  # 2.5 x 72 = 180 dpi
ys = json.loads(re.search(r'PDF_IMAGE_Y=(\{.*?\})', Path('app.js').read_text()).group(1))
pages = {str(q['id']): q['page'] for q in json.load(open('questions.json'))}
out = Path('photos'); out.mkdir(exist_ok=True)
for qid, y in ys.items():
    p = str(pages[qid])
    subprocess.run(['pdftoppm', '-f', p, '-l', p, '-r', str(72 * SCALE), '-x', str(round(X * SCALE)), '-y', str(round(y * SCALE)),
                    '-W', str(round(W * SCALE)), '-H', str(round(H * SCALE)), '-jpeg', '-jpegopt', 'quality=82', '-singlefile',
                    PDF, str(out / f'q{qid}')], check=True)
assert len(list(out.glob('q*.jpg'))) == len(ys) == 184, 'expected 184 photos'
print(len(ids), 'photos written')
