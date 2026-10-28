#!/usr/bin/env python3
"""Strict asset validation: no invented files, no changed learning text."""
import hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def sha(b):return hashlib.sha256(b).hexdigest()
def validate():
    data=json.loads((ROOT/'src/audio/catalog.generated.json').read_text());items=data['items'];expected={};word_texts={}
    for day in range(1,6):
        for w in json.loads((ROOT/f'src/data/vocabulary/day{day:02}.json').read_text()):
            word_texts.setdefault(w['word'].lower(),[]).append(w)
        for s in json.loads((ROOT/f'src/data/lessons/day{day:02}.json').read_text())['sets']:expected[s['id']]=('story',s['story'])
    for group in word_texts.values():expected[group[0]['id']]=('word',group[0]['word'])
    assert len(items)==len(expected),f"Expected {len(expected)} real audio files, found {len(items)}"
    assert len({a['id'] for a in items})==len(items) and len({a['src'] for a in items})==len(items)
    for a in items:
        assert (a['kind'],a['text'])==expected[a['id']],a['id']
        assert a['textSha256']==sha(a['text'].encode()),a['id']
        assert a['src'].startswith('/audio/') and a['src'].endswith('.mp3') and '..' not in a['src']
        file=ROOT/'public'/a['src'].lstrip('/');assert file.is_file(),a['src'];b=file.read_bytes()
        assert sha(b)==a['sha256'] and len(b)==a['bytes'] and len(b)>500,a['id']
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,channels,sample_rate','-of','json',str(file)]))
        assert probe['streams'][0]['codec_name']=='mp3' and float(probe['format']['duration'])>.15,a['id']
        assert abs(float(probe['format']['duration'])-a['duration'])<.01,a['id']
        subprocess.run(['ffmpeg','-v','error','-i',str(file),'-f','null','-'],check=True,stdout=subprocess.DEVNULL)
        if a['kind']=='word':assert a['wordIds']==[w['id'] for w in word_texts[a['text'].lower()]]
    actual={str(p.relative_to(ROOT/'public')) for p in (ROOT/'public/audio').rglob('*.mp3')}
    assert actual=={a['src'].lstrip('/') for a in items},'Uncatalogued or missing MP3'
    print(f"PASS: {len(word_texts)} word MP3s + {len(expected)-len(word_texts)} full-story MP3s; exact source text, checksums, paths, full decoding and durations match")
try:validate()
except (AssertionError,KeyError,ValueError,subprocess.CalledProcessError) as e:print('AUDIO VALIDATION FAILED:',e,file=sys.stderr);sys.exit(1)
