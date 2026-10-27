import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateCrossword, isValidCrossword, makeBlankClue } from '../src/puzzle/engine.ts';
import { completeSentenceSet, emptySentenceProgress, parseSentenceProgress, sentenceStorageKey } from '../src/state/day01Progress.ts';
import { emptyPuzzleStore, newPuzzleSession, finishPuzzle, parsePuzzleStore, puzzleStorageKey } from '../src/puzzle/progress.ts';
import { emptyCollection, parseCollection, recordMistakes, toggleStar } from '../src/state/collection.ts';
const json = file => JSON.parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url)));
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const allIds = new Set();
for (let day = 1; day <= 5; day++) {
  const prefix = `day${String(day).padStart(2, '0')}`;
  const words = json(`vocabulary/${prefix}.json`);
  const meanings = json(`vocabulary/${prefix}-learning-meanings.json`);
  const sets = json(`lessons/${prefix}.json`).sets;
  test(`${prefix}: 40 source words, meanings, 8 ordered sets, no mixed IDs`, () => {
    assert.equal(words.length, 40); assert.equal(meanings.entries.length, 40); assert.equal(sets.length, 8);
    assert.equal(meanings.origin, 'learning-authored');
    assert.deepEqual(sets.flatMap(s => s.wordIds), words.map(w => w.id));
    assert.deepEqual(meanings.entries.map(e => e.wordId), words.map(w => w.id));
    for (const [i,w] of words.entries()) {
      assert.equal(w.order, i+1); assert.equal(w.day, day); assert.equal(w.meaning, null);
      assert.ok(!allIds.has(w.id)); allIds.add(w.id);
      assert.ok(meanings.entries[i].meaning.trim());
      const set = sets[Math.floor(i/5)];
      assert.equal(set.day, day); assert.equal(set.order, Math.floor(i/5)+1); assert.equal(set.wordIds.length, 5);
      assert.match(set.story, new RegExp(`\\b${w.word}\\b`, 'i')); assert.match(set.translation, /[가-힣]/);
    }
  });
  const crosswordWords = words.map((w,i) => ({ ...w, meaning: meanings.entries[i].meaning, clue: makeBlankClue(sets[Math.floor(i/5)].story, w.word) }));
  test(`${prefix}: 100 random connected puzzles, source isolation, clues masked`, () => {
    for (const w of crosswordWords) { assert.doesNotMatch(w.clue, new RegExp(`\\b${w.word}\\b`, 'i')); assert.match(w.clue, /________/); }
    for (let seed=1; seed<=100; seed++) {
      const puzzle = generateCrossword(crosswordWords, seeded(day*1000+seed));
      assert.ok(isValidCrossword(puzzle, crosswordWords));
      assert.ok(puzzle.entries.length>=8 && puzzle.entries.length<=15);
      assert.ok(puzzle.entries.every(e => e.id.startsWith(prefix+'-')));
      assert.deepEqual(new Set(puzzle.entries.map(e=>e.direction)), new Set(['across','down']));
    }
  });
  test(`${prefix}: sentence progress and puzzle histories restore separately`, () => {
    let progress = emptySentenceProgress();
    for (const set of sets) progress = completeSentenceSet(progress, set.id, day);
    assert.equal(progress.completedSetIds.length, 8);
    assert.deepEqual(parseSentenceProgress(JSON.stringify(progress), day), progress);
    assert.equal(parseSentenceProgress(JSON.stringify(progress), day===1 ? 2 : 1).completedSetIds.length, 0);
    const puzzle = generateCrossword(crosswordWords, seeded(day));
    const answers = Object.fromEntries(puzzle.cells.flatMap((r,i)=>r.flatMap((c,j)=>c?[[`${i},${j}`,c]]:[])));
    const done = finishPuzzle(emptyPuzzleStore(), { ...newPuzzleSession(puzzle), answers, wrongWordIds: [puzzle.entries[0].id] }, '2026-10-27T00:00:00.000Z');
    assert.deepEqual(parsePuzzleStore(JSON.stringify(done), crosswordWords), done);
    const next = { ...done, active: newPuzzleSession(generateCrossword(crosswordWords, seeded(day+5))) };
    assert.equal(parsePuzzleStore(JSON.stringify(next), crosswordWords).completions.length, 1);
  });
}
test('DAY 01 keeps its original storage keys', () => {
  assert.equal(sentenceStorageKey(1), 'word-master-adventure:day01-sentences:v1');
  assert.equal(puzzleStorageKey(1), 'word-master-adventure:day01-puzzle:v1');
});
test('star toggling is independent of mistakes and review history; malformed data sanitized', () => {
  const id = 'day01-001';
  let collection = recordMistakes(emptyCollection(), [id], 'old-puzzle', '2026-10-27T00:00:00Z');
  collection = recordMistakes(collection, [id], 'old-puzzle', '2026-10-27T00:01:00Z');
  assert.equal(collection.mistakes.length,1);
  collection = recordMistakes(collection, [id], 'new-puzzle', '2026-10-27T00:02:00Z');
  collection = toggleStar(collection, id);
  assert.deepEqual(collection.starredIds,[id]);
  collection = { ...collection, reviews: [{ wordId:id, correct:false, at:'2026-10-27T00:03:00Z' }, { wordId:id, correct:true, at:'2026-10-27T00:04:00Z' }] };
  collection = toggleStar(collection,id);
  assert.equal(collection.starredIds.length,0); assert.equal(collection.mistakes.length,2); assert.equal(collection.reviews.length,2);
  assert.deepEqual(parseCollection(JSON.stringify(collection),new Set([id])),collection);
  assert.deepEqual(parseCollection('{broken',new Set([id])),emptyCollection());
  assert.deepEqual(parseCollection(JSON.stringify({version:1,starredIds:['invalid'],mistakes:[null],reviews:[{}]}),new Set([id])),emptyCollection());
});
