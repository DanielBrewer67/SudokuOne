#!/usr/bin/env python3
"""
One-time preprocessing script.
Scans sudoku-3m.csv and records the byte offset of every row,
then samples a representative set per difficulty band and writes
data/puzzle-index.json for the browser to use.

Usage:
    python3 data/generate-index.py
"""

import json, os, random, sys

CSV_PATH  = os.path.join(os.path.dirname(__file__), 'sudoku-3m.csv')
OUT_PATH  = os.path.join(os.path.dirname(__file__), 'puzzle-index.json')
SAMPLES   = 5000   # offsets to keep per band (except expert — keep all)

BANDS = {
    'easy':   (0.0, 2.5),
    'medium': (2.5, 4.5),
    'hard':   (4.5, 6.5),
    'expert': (6.5, 9.0),
}

def main():
    buckets = {b: [] for b in BANDS}
    file_size = os.path.getsize(CSV_PATH)

    print(f'Scanning {CSV_PATH} ({file_size / 1_048_576:.0f} MB)…')

    with open(CSV_PATH, 'rb') as f:
        f.readline()            # skip header
        rows_read = 0
        while True:
            offset = f.tell()
            line = f.readline()
            if not line:
                break
            rows_read += 1
            if rows_read % 500_000 == 0:
                print(f'  {rows_read:,} rows…')

            parts = line.split(b',')
            if len(parts) < 5:
                continue
            try:
                diff = float(parts[4])
            except ValueError:
                continue

            for band, (lo, hi) in BANDS.items():
                if lo <= diff < hi:
                    buckets[band].append(offset)
                    break

    print(f'Done. {rows_read:,} rows scanned.')
    for band, offsets in buckets.items():
        print(f'  {band}: {len(offsets):,} rows')

    # Sample each band (keep all expert rows since there are so few)
    sampled = {}
    for band, offsets in buckets.items():
        if band == 'expert' or len(offsets) <= SAMPLES:
            sampled[band] = offsets
        else:
            sampled[band] = random.sample(offsets, SAMPLES)
        random.shuffle(sampled[band])

    index = {
        'fileSize':    file_size,
        'csvPath':     'data/sudoku-3m.csv',
        'difficulties': sampled,
    }

    with open(OUT_PATH, 'w') as f:
        json.dump(index, f, separators=(',', ':'))

    out_size = os.path.getsize(OUT_PATH)
    print(f'Index written to {OUT_PATH} ({out_size / 1024:.0f} KB)')

if __name__ == '__main__':
    main()
