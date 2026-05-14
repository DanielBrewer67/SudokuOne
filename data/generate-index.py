#!/usr/bin/env python3
"""
One-time preprocessing script.
Scans sudoku-3m.csv and records the byte offset of every row,
then samples a representative set per difficulty band and writes
data/puzzle-index.json for the browser to use.

Usage:
    python3 data/generate-index.py
"""

import json, os, random, sys, time

CSV_PATH        = os.path.join(os.path.dirname(__file__), 'sudoku-3m.csv')
OUT_PATH        = os.path.join(os.path.dirname(__file__), 'puzzle-index.json')
SAMPLES         = 100    # unique offsets to keep per band (except expert — keep all)
OVERSAMPLE      = 2      # draw this many times SAMPLES before filtering for uniqueness


def count_solutions(puzzle_str, limit=2):
    """Backtracking solver that stops once `limit` solutions are found."""
    grid = [0 if c == '.' else int(c) for c in puzzle_str]
    count = [0]
    calls = [0]

    def valid(pos, val):
        r, c = pos // 9, pos % 9
        for i in range(9):
            if grid[r * 9 + i] == val or grid[i * 9 + c] == val:
                return False
        br, bc = (r // 3) * 3, (c // 3) * 3
        for dr in range(3):
            for dc in range(3):
                if grid[(br + dr) * 9 + (bc + dc)] == val:
                    return False
        return True

    def solve():
        if count[0] >= limit:
            return
        calls[0] += 1
        try:
            pos = grid.index(0)
        except ValueError:
            count[0] += 1
            return
        for v in range(1, 10):
            if valid(pos, v):
                grid[pos] = v
                solve()
                grid[pos] = 0
                if count[0] >= limit:
                    return

    t0 = time.perf_counter()
    solve()
    elapsed = time.perf_counter() - t0
    print(f'    solver: {count[0]} solution(s) found, {calls[0]:,} recursive calls, {elapsed*1000:.1f} ms')
    return count[0]


def read_puzzle_at(f, offset):
    """Seek to offset and return the puzzle string (81 chars), or None on error."""
    f.seek(offset)
    line = f.readline().decode('utf-8', errors='replace').strip()
    parts = line.split(',')
    if len(parts) < 2 or len(parts[1]) != 81:
        return None
    return parts[1]

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

    # Sample each band, then filter out non-unique puzzles
    sampled = {}
    with open(CSV_PATH, 'rb') as fcsv:
        for band, offsets in buckets.items():
            # Build a pool to draw from — oversample so we have room to discard bad puzzles
            if band == 'expert' or len(offsets) <= SAMPLES:
                pool = list(offsets)
            else:
                pool = random.sample(offsets, min(len(offsets), SAMPLES * OVERSAMPLE))
            random.shuffle(pool)

            unique, skipped = [], 0
            for offset in pool:
                if len(unique) >= SAMPLES:
                    break
                puzzle_str = read_puzzle_at(fcsv, offset)
                n = len(unique) + 1
                print(f'  [{band}] checking puzzle {n}/{SAMPLES} at offset {offset}…')
                if puzzle_str and count_solutions(puzzle_str) == 1:
                    unique.append(offset)
                    print(f'  [{band}] accepted ({len(unique)} kept so far)')
                else:
                    skipped += 1
                    print(f'  [{band}] skipped (not unique) — {skipped} skipped so far')

            print(f'  {band}: {len(unique):,} unique puzzles kept, {skipped:,} non-unique skipped')
            sampled[band] = unique

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
