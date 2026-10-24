import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROGRESS_KEY, DAY01_SET_IDS, completeSentenceSet, emptySentenceProgress,
  isDay01SentencesComplete, loadSentenceProgress, parseSentenceProgress, saveSentenceProgress,
} from '../src/state/day01Progress.ts';

test('missing, damaged and incompatible storage starts safely', () => {
  for (const input of [null, '', '{broken', 'null', '[]', 'false', '{"version":2,"completedSetIds":[]}']) {
    assert.deepEqual(parseSentenceProgress(input), emptySentenceProgress());
  }
});

test('invalid and duplicate IDs cannot falsely complete the lesson', () => {
  const progress = parseSentenceProgress(JSON.stringify({ version: 1, completedSetIds: [
    'day01-set01', 'day01-set01', 'day01-set09', 'day02-set01', 'day01-set02\n', 2, null, {},
  ] }));
  assert.deepEqual(progress.completedSetIds, ['day01-set01']);
  assert.equal(isDay01SentencesComplete(progress), false);
  assert.deepEqual(completeSentenceSet(progress, 'day02-set01'), progress);
});

test('all eight distinct sets are required; revisiting is idempotent', () => {
  let progress = emptySentenceProgress();
  for (const id of DAY01_SET_IDS.slice(0, 7)) progress = completeSentenceSet(progress, id);
  assert.equal(isDay01SentencesComplete(progress), false);
  const oldProgress = progress;
  assert.equal(completeSentenceSet(progress, DAY01_SET_IDS[0]), oldProgress);
  progress = completeSentenceSet(progress, DAY01_SET_IDS[7]);
  assert.equal(isDay01SentencesComplete(progress), true);
  assert.equal(oldProgress.completedSetIds.length, 7);
  assert.equal(progress.completedSetIds.length, 8);
});

test('partial and full progress survive serialization and a fresh load', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(loadSentenceProgress(storage), emptySentenceProgress());
  let progress = completeSentenceSet(emptySentenceProgress(), DAY01_SET_IDS[3]);
  saveSentenceProgress(storage, progress);
  assert.ok(values.has(PROGRESS_KEY));
  assert.deepEqual(loadSentenceProgress(storage), progress);
  for (const id of DAY01_SET_IDS) progress = completeSentenceSet(progress, id);
  saveSentenceProgress(storage, progress);
  assert.equal(isDay01SentencesComplete(loadSentenceProgress(storage)), true);
});

test('storage permission or quota errors reach the provider for its visible warning', () => {
  const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  assert.throws(() => loadSentenceProgress(blocked), /SecurityError/);
  assert.throws(() => saveSentenceProgress(blocked, emptySentenceProgress()), /QuotaExceededError/);
});
