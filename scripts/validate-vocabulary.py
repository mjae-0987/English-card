#!/usr/bin/env python3
"""Validate JSON without npm; optionally compare every row with the original PDF.

Usage: python3 scripts/validate-vocabulary.py [path/to/source.pdf]
PDF comparison requires the existing system command pdftotext (Poppler).
"""
import hashlib
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/vocabulary'


def check(condition, message):
    if not condition:
        raise ValueError(message)


def validate():
    source = json.loads((DATA / 'source.json').read_text(encoding='utf-8'))
    records = {}
    ids, words = set(), set()
    check([item['day'] for item in source['days']] == list(range(1, 6)), 'Expected DAY 01–05')
    check(source['meaningStatus'] == 'missing-in-source', 'Missing meaning provenance')
    for info in source['days']:
        day = info['day']
        entries = json.loads((DATA / info['file']).read_text(encoding='utf-8'))
        check(len(entries) == info['expectedWordCount'] == 40, f'DAY {day}: count mismatch')
        for order, entry in enumerate(entries, 1):
            check(set(entry) == {'id', 'day', 'order', 'word', 'meaning'}, 'Unexpected entry fields')
            check(entry['id'] == f'day{day:02d}-{order:03d}', f'DAY {day}: ID mismatch')
            check(type(entry['day']) is int and entry['day'] == day, 'DAY mismatch')
            check(type(entry['order']) is int and entry['order'] == order, 'Row order mismatch')
            check(entry['id'] not in ids, f'Duplicate ID: {entry["id"]}')
            check(re.fullmatch('[a-z]+', entry['word']) is not None, 'Unexpected English spelling')
            check(entry['word'] not in words, f'Duplicate word: {entry["word"]}')
            check(entry['meaning'] is None, 'A meaning was added despite blank source cells')
            ids.add(entry['id'])
            words.add(entry['word'])
        check(sum(e['meaning'] is None for e in entries) == info['missingMeaningCount'], 'Meaning count mismatch')
        records[day] = entries

    if len(sys.argv) > 1:
        pdf = Path(sys.argv[1])
        check(hashlib.sha256(pdf.read_bytes()).hexdigest() == source['sourceSha256'], 'Wrong source PDF hash')
        # Independent extraction 1: printed rows in the two-column layout.
        base = ['pdftotext', '-f', '1', '-l', '3']
        layout = subprocess.run(base + ['-layout', str(pdf), '-'], check=True, capture_output=True).stdout.decode('utf-8')
        extracted = {}
        for page in layout.split('\f')[:3]:
            header = re.search(r'Test Range\s+Day(\d+)\s+Test Range\s+Day(\d+)', page)
            check(header is not None, 'Missing PDF DAY headers')
            left_day, right_day = map(int, header.groups())
            rows = [re.fullmatch(r'\s*(\d+)\s+([a-z]+)\s+(\d+)\s+([a-z]+)\s*', line) for line in page.splitlines()]
            rows = [row for row in rows if row]
            check(len(rows) == 40, 'PDF page row count mismatch')
            for day, number_group, word_group in [(left_day, 1, 2), (right_day, 3, 4)]:
                if day not in records:
                    continue
                check([int(row[number_group]) for row in rows] == list(range(1, 41)), 'PDF numbering mismatch')
                extracted[day] = [row[word_group] for row in rows]
                check(extracted[day] == [e['word'] for e in records[day]], f'DAY {day}: layout spelling/order mismatch')
        check(set(extracted) == set(records), 'Missing extracted DAY')

        # Independent extraction 2: text coordinates in each table cell.
        bbox = subprocess.run(base + ['-bbox-layout', str(pdf), '-'], check=True, capture_output=True).stdout
        document = ET.fromstring(bbox)
        ns = {'x': 'http://www.w3.org/1999/xhtml'}
        pages = document.findall('.//x:page', ns)
        check(len(pages) == 3, 'Expected three PDF source pages')
        for info in source['days']:
            day = info['day']
            offset = 0 if info['column'] == 'left' else 266.2557
            tokens = pages[info['page'] - 1].findall('.//x:word', ns)
            tokens = [t for t in tokens if 145 <= float(t.attrib['yMin']) < 765]
            numbers = sorted((t for t in tokens if 60 + offset < float(t.attrib['xMin']) < 85 + offset), key=lambda t: float(t.attrib['yMin']))
            check([t.text for t in numbers] == [str(i) for i in range(1, 41)], 'PDF coordinate row numbers mismatch')
            for row, entry in zip(numbers, records[day]):
                y = float(row.attrib['yMin'])
                cells = [t for t in tokens if abs(float(t.attrib['yMin']) - y) < 1]
                english = [t.text for t in cells if 90 + offset <= float(t.attrib['xMin']) and float(t.attrib['xMax']) <= 180 + offset]
                meanings = [t.text for t in cells if 180 + offset <= float(t.attrib['xMin']) < 293 + offset]
                check(english == [entry['word']], f'{entry["id"]}: PDF cell spelling mismatch')
                check(not meanings, f'{entry["id"]}: source meaning cell is not blank')
        print('PDF hash, layout extraction, coordinate extraction and 200 blank meaning cells: PASS')
    else:
        print('Source PDF comparison SKIPPED: pass the original PDF path to verify it.')

    for day, entries in records.items():
        print(f'DAY {day:02d}: {len(entries)} entries; missing meanings: {sum(e["meaning"] is None for e in entries)}')
    print(f'JSON validation PASS: {len(ids)} unique IDs, {len(words)} unique words, sequential order, no added meanings.')


if __name__ == '__main__':
    try:
        validate()
    except (ValueError, OSError, KeyError, TypeError, subprocess.CalledProcessError, ET.ParseError) as error:
        print(f'Validation FAILED: {error}', file=sys.stderr)
        sys.exit(1)
