#!/usr/bin/env python3
"""Check authored learning data without npm; preserve the PDF source datasets."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data'


def check(condition, message):
    if not condition:
        raise ValueError(message)


def validate():
    source_days = [json.loads((DATA / f'vocabulary/day{day:02d}.json').read_text()) for day in range(1, 6)]
    source_words = source_days[0]
    all_ids = []
    for day, entries in enumerate(source_days, 1):
        check(len(entries) == 40, f'DAY {day}: source count')
        for order, entry in enumerate(entries, 1):
            check(entry['id'] == f'day{day:02d}-{order:03d}', 'Source ID changed')
            check(entry['day'] == day and entry['order'] == order, 'Source order changed')
            check(entry['meaning'] is None, 'Original PDF meanings must remain unchanged')
            all_ids.append(entry['id'])
    check(len(set(all_ids)) == 200, 'Duplicate source ID')

    authored = json.loads((DATA / 'vocabulary/day01-learning-meanings.json').read_text())
    check(authored['day'] == 1 and authored['origin'] == 'learning-authored', 'Missing authored meaning provenance')
    check('교재 원문' in authored['notice'], 'Missing source distinction')
    check(authored['uncertainWordIds'] == [], 'Unresolved meanings require review')
    check([entry['wordId'] for entry in authored['entries']] == [word['id'] for word in source_words], 'Meaning mapping/order mismatch')
    for entry in authored['entries']:
        check(isinstance(entry['meaning'], str) and re.search('[가-힣]', entry['meaning']), 'Missing Korean meaning')
        check(entry['partOfSpeech'] and entry['reviewStatus'] == 'reviewed', 'Missing meaning review')

    content = json.loads((DATA / 'lessons/day01.json').read_text())
    check(content['day'] == 1 and content['origin'] == 'learning-authored', 'Missing story provenance')
    check(len(content['sets']) == 8, 'Expected 8 sets')
    used = []
    for index, lesson in enumerate(content['sets']):
        check(lesson['id'] == f'day01-set{index + 1:02d}', 'Set ID mismatch')
        check(lesson['day'] == 1 and lesson['order'] == index + 1, 'Set order mismatch')
        targets = source_words[index * 5:index * 5 + 5]
        check(lesson['wordIds'] == [word['id'] for word in targets], 'Set must contain exactly 5 consecutive words')
        check(lesson['title'] and re.search('[가-힣]', lesson['translation']), 'Missing title or Korean translation')
        tokens = set(re.findall(r'\b[a-z]+\b', lesson['story'].lower()))
        for word in targets:
            check(word['word'] in tokens, f'Target absent from story: {word["word"]}')
        used.extend(lesson['wordIds'])
        print(f'SET {index + 1:02d}: 5 target words present, English story + Korean translation PASS')
    check(used == [word['id'] for word in source_words] and len(set(used)) == 40, 'Missing or duplicated lesson target')
    print('PASS: 40 authored meanings, 8 ordered sets, 40 unique targets; 200 original entries retained.')


if __name__ == '__main__':
    validate()
