#!/usr/bin/env python3
"""Offline generation only. Download/installation are separate approved steps.
Requires piper-tts, ffmpeg and ffprobe; never sends lesson text to a remote TTS.
"""
import argparse, hashlib, importlib.metadata, json, os, subprocess, tempfile, wave
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
def sha(data): return hashlib.sha256(data).hexdigest()
def content():
    words = {}; stories = []
    for day in range(1, 6):
        for w in json.loads((ROOT / f'src/data/vocabulary/day{day:02}.json').read_text()):
            key = w['word'].lower()
            if key not in words: words[key] = dict(id=w['id'],kind='word',text=w['word'],wordIds=[])
            words[key]['wordIds'].append(w['id'])
        for s in json.loads((ROOT / f'src/data/lessons/day{day:02}.json').read_text())['sets']:
            stories.append(dict(id=s['id'],kind='story',text=s['story']))
    return [*words.values(), *stories]
def probe(file):
    raw = subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(file)])
    data = json.loads(raw); assert data['streams'][0]['codec_name'] == 'mp3'
    duration = float(data['format']['duration']); assert duration > .15
    subprocess.run(['ffmpeg','-v','error','-i',str(file),'-f','null','-'],check=True,stdout=subprocess.DEVNULL)
    return duration

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--model',type=Path); parser.add_argument('--voice-id',default='en_US-ljspeech-high'); parser.add_argument('--model-card',type=Path); parser.add_argument('--plan',action='store_true')
    args = parser.parse_args(); targets = content()
    if args.plan:
        print(json.dumps(dict(words=sum(t['kind']=='word' for t in targets),stories=sum(t['kind']=='story' for t in targets),targets=targets),ensure_ascii=False,indent=2)); return
    if not args.model or not args.model.is_file() or not args.model_card or not args.model_card.is_file():
        parser.error('Provide the approved local model and reviewed model-card paths; no automatic download is performed.')
    from piper import PiperVoice
    from piper.config import PiperConfig
    import onnxruntime
    # Bound CPU usage instead of starting a thread for every host CPU.
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    voice = PiperVoice(config=PiperConfig.from_dict(json.loads(Path(str(args.model)+'.json').read_text())),
        session=onnxruntime.InferenceSession(str(args.model),sess_options=options,providers=['CPUExecutionProvider']))
    model_hash = sha(args.model.read_bytes()); output = ROOT/'public/audio'; output.mkdir(parents=True,exist_ok=True)
    old_path = ROOT/'src/audio/catalog.generated.json'; old = json.loads(old_path.read_text()) if old_path.exists() else {}
    previous = {x['id']:x for x in old.get('items',[])}; items = []
    for index,target in enumerate(targets,1):
        text = target['text']; text_hash = sha(text.encode())
        key = sha((text_hash+model_hash+'mp3:mono:22050:64k:v1').encode())[:16]
        folder = 'words' if target['kind']=='word' else 'stories'
        filename = f"{target['id']}-{key}.mp3"; dest = output/folder/filename; dest.parent.mkdir(parents=True,exist_ok=True)
        prev = previous.get(target['id'])
        if not (prev and dest.exists() and prev['textSha256']==text_hash and prev['sha256']==sha(dest.read_bytes())):
            with tempfile.TemporaryDirectory(prefix='wma-voice-') as scratch:
                wav = Path(scratch)/'source.wav'; encoded = Path(scratch)/'voice.mp3'
                with wave.open(str(wav),'wb') as file:
                    if hasattr(voice,'synthesize_wav'): voice.synthesize_wav(text,file)
                    else: voice.synthesize(text,file)
                subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(wav),'-ac','1','-ar','22050','-codec:a','libmp3lame','-b:a','64k','-af','apad=pad_dur=0.12','-map_metadata','-1','-id3v2_version','3',str(encoded)],check=True)
                probe(encoded); dest.write_bytes(encoded.read_bytes())
        duration = probe(dest)
        minimum = .15 if target['kind']=='word' else max(3, len(text.split())/6)
        assert duration >= minimum, f"Suspiciously short {target['id']}: {duration}"
        asset = {**target, 'src':f'/audio/{folder}/{filename}','textSha256':text_hash,'sha256':sha(dest.read_bytes()),'bytes':dest.stat().st_size,'duration':round(duration,4)}
        items.append(asset); print(f"[{index}/{len(targets)}] {target['id']} {duration:.2f}s {asset['bytes']} bytes",flush=True)
    manifest = dict(version=1,voice=dict(id=args.voice_id,language='en-US',engine='piper-tts',engineVersion=importlib.metadata.version('piper-tts'),modelSha256=model_hash,modelCardSha256=sha(args.model_card.read_bytes()),generation='offline'),items=items)
    # Publish the manifest only after every real file passes the decoder checks.
    temporary = old_path.with_suffix('.tmp'); temporary.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'); os.replace(temporary,old_path)
    (output/'MODEL_CARD.txt').write_bytes(args.model_card.read_bytes())
    print(f"DONE: {len(items)} MP3 files; {sum(a['bytes'] for a in items)} bytes",flush=True)
if __name__ == '__main__': main()
