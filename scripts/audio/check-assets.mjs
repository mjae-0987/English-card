// Runs in Pages/CI with Node only; generation and decoder checks remain offline.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const json = p => JSON.parse(readFileSync(path.join(root, p), 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const expected = new Map(), words = new Map();
for (let day = 1; day <= 5; day++) {
  const id = String(day).padStart(2, '0');
  for (const w of json(`src/data/vocabulary/day${id}.json`)) {
    const key = w.word.toLowerCase();
    if (!words.has(key)) words.set(key, { id: w.id, kind: 'word', text: w.word, wordIds: [] });
    words.get(key).wordIds.push(w.id);
  }
  for (const s of json(`src/data/lessons/day${id}.json`).sets)
    expected.set(s.id, { id: s.id, kind: 'story', text: s.story });
}
for (const w of words.values()) expected.set(w.id, w);
const catalog = json('src/audio/catalog.generated.json');
assert.equal(catalog.voice?.language, 'en-US', 'Missing English audio catalog');
assert.equal(catalog.items.length, expected.size, 'Missing audio assets');
const paths = new Set(), ids = new Set();
for (const item of catalog.items) {
  const source = expected.get(item.id);
  assert.ok(source && !ids.has(item.id), `Unexpected/duplicate ${item.id}`);
  ids.add(item.id);
  assert.equal(item.kind, source.kind);
  assert.equal(item.text, source.text, `Source changed: ${item.id}`);
  assert.equal(item.textSha256, sha(source.text));
  if (source.wordIds) assert.deepEqual(item.wordIds, source.wordIds);
  assert.match(item.src, /^\/audio\/(words|stories)\/[a-z0-9-]+\.mp3$/);
  assert.ok(!paths.has(item.src)); paths.add(item.src);
  const bytes = readFileSync(path.join(root, 'public', item.src));
  assert.equal(bytes.length, item.bytes);
  assert.equal(sha(bytes), item.sha256, `Corrupt ${item.src}`);
  assert.ok(bytes.length > 500 && item.duration > .15);
}
const actual = readdirSync(path.join(root, 'public/audio'), { recursive: true })
  .filter(p => p.endsWith('.mp3')).map(p => `/audio/${p}`);
assert.deepEqual(new Set(actual), paths);
console.log(`Audio assets OK: ${words.size} words + ${expected.size - words.size} full stories`);
