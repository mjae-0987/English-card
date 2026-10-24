import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateCrossword, isValidCrossword, makeBlankClue, cellKey, wordCells, checkEntry, isPuzzleSolved } from '../src/puzzle/engine.ts';
import { enterLetters, eraseLetter } from '../src/puzzle/input.ts';
import { applyHint, emptyPuzzleStore, newPuzzleSession, finishPuzzle, parsePuzzleStore } from '../src/puzzle/progress.ts';

const json = file => JSON.parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url)));
const sets = json('lessons/day01.json').sets;
const meanings = new Map(json('vocabulary/day01-learning-meanings.json').entries.map(e => [e.wordId, e.meaning]));
const words = json('vocabulary/day01.json').map(e => ({ id: e.id, word: e.word, meaning: meanings.get(e.id), clue: makeBlankClue(sets.find(s => s.wordIds.includes(e.id)).story, e.word) }));
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const puzzle = generateCrossword(words, seeded(41));
const solution = p => Object.fromEntries(p.cells.flatMap((row, r) => row.flatMap((letter, c) => letter ? [[cellKey(r, c), letter]] : [])));

test('100 seeds: connected, correctly crossed, no stray adjacency, numbered and trimmed', () => {
  const sizes = new Map();
  for (let seed = 1; seed <= 100; seed++) {
    const p = generateCrossword(words, seeded(seed));
    assert.ok(isValidCrossword(p, words), `invalid seed ${seed}`);
    assert.ok(p.entries.length >= 8 && p.entries.length <= 15);
    assert.equal(new Set(p.entries.map(e => e.id)).size, p.entries.length);
    assert.equal(new Set(p.entries.map(e => e.word)).size, p.entries.length);
    assert.ok(p.cols <= p.rows && p.rows <= 15 && p.cols <= 15);
    // Independently enumerate every maximal run, not the generator's placements.
    const runs = [];
    for (const direction of ['across', 'down']) for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
      const dr = direction === 'down' ? 1 : 0, dc = direction === 'across' ? 1 : 0;
      if (!p.cells[r][c] || p.cells[r - dr]?.[c - dc]) continue;
      let word = '', i = 0;
      while (p.cells[r + dr * i]?.[c + dc * i]) { word += p.cells[r + dr * i][c + dc * i]; i++; }
      if (word.length > 1) runs.push({ row: r, col: c, direction, word });
    }
    assert.equal(runs.length, p.entries.length);
    for (const run of runs) assert.ok(p.entries.some(e => e.row === run.row && e.col === run.col && e.direction === run.direction && e.word === run.word));
    sizes.set(p.entries.length, (sizes.get(p.entries.length) ?? 0) + 1);
  }
  console.log('Generated sizes over 100 seeds:', Object.fromEntries(sizes));
});

test('clues mask every occurrence of their answer, preserving the original sentence', () => {
  for (const e of words) {
    assert.match(e.clue, /________/);
    assert.doesNotMatch(e.clue, new RegExp(`\\b${e.word}\\b`, 'i'));
    assert.ok(e.meaning);
  }
  assert.equal(makeBlankClue('Ride a bike. We ride again.', 'ride'), '________ a bike.');
  assert.equal(makeBlankClue('We ride, then ride again.', 'ride'), 'We ________, then ________ again.');
});

test('typing, overwrite, paste and backspace share one answer per crossing cell', () => {
  const entry = puzzle.entries[0];
  const first = enterLetters(entry, 0, entry.word.toLowerCase(), {});
  assert.equal(checkEntry(entry, first.answers), 'correct');
  assert.equal(first.index, entry.word.length - 1);
  const replaced = enterLetters(entry, 0, 'z', first.answers);
  assert.equal(replaced.answers[cellKey(entry.row, entry.col)], 'Z');
  assert.equal(replaced.index, 1);
  const deleted = eraseLetter(entry, 1, replaced.answers);
  assert.equal(deleted.index, 0);
  assert.equal(deleted.answers[cellKey(wordCells(entry)[1].row, wordCells(entry)[1].col)], undefined);
  assert.deepEqual(enterLetters(entry, 0, '한글123', {}), { answers: {}, index: 0 });
  assert.equal(enterLetters(entry, 0, 'ａ', {}).answers[cellKey(entry.row, entry.col)], 'A');
  let crossing;
  for (const a of puzzle.entries) for (const b of puzzle.entries) if (a.direction !== b.direction) {
    const cell = wordCells(a).find(c => wordCells(b).some(d => c.row === d.row && c.col === d.col));
    if (cell) crossing = { a, b, cell };
  }
  assert.ok(crossing);
  const index = wordCells(crossing.a).findIndex(c => c.row === crossing.cell.row && c.col === crossing.cell.col);
  const entered = enterLetters(crossing.a, index, 'X', {});
  assert.equal(entered.answers[cellKey(crossing.cell.row, crossing.cell.col)], 'X');
  const crossIndex = wordCells(crossing.b).findIndex(c => c.row === crossing.cell.row && c.col === crossing.cell.col);
  assert.equal(eraseLetter(crossing.b, crossIndex, entered.answers).answers[cellKey(crossing.cell.row, crossing.cell.col)], undefined);
});

test('grading is non-mutating, never completes wrong or blank answers', () => {
  const answers = {};
  assert.equal(checkEntry(puzzle.entries[0], answers), 'empty');
  assert.equal(isPuzzleSolved(puzzle, answers), false);
  assert.equal(finishPuzzle(emptyPuzzleStore(), newPuzzleSession(puzzle)).completions.length, 0);
  const wrong = enterLetters(puzzle.entries[0], 0, 'ZZZZZZZZZZZZZZZ', answers).answers;
  const snapshot = JSON.stringify(wrong);
  assert.equal(checkEntry(puzzle.entries[0], wrong), 'wrong');
  assert.equal(isPuzzleSolved(puzzle, wrong), false);
  assert.equal(JSON.stringify(wrong), snapshot);
  assert.equal(isPuzzleSolved(puzzle, solution(puzzle)), true);
});

test('hints reveal meaning first, exactly one shared cell next, and stop at two', () => {
  const session = newPuzzleSession(puzzle), entry = puzzle.entries[0];
  const first = applyHint(session, entry.id);
  assert.equal(first.hintLevels[entry.id], 1);
  assert.equal(first.hintCount, 1);
  assert.deepEqual(first.answers, {});
  const second = applyHint(first, entry.id);
  assert.equal(second.hintLevels[entry.id], 2);
  assert.equal(second.hintCount, 2);
  assert.equal(Object.keys(second.answers).length, 1);
  const key = second.letterHints[entry.id];
  const [row, col] = key.split(',').map(Number);
  assert.equal(second.answers[key], puzzle.cells[row][col]);
  assert.equal(applyHint(second, entry.id), second);
  assert.equal(applyHint(session, 'not-in-puzzle'), session);
  assert.deepEqual(session.answers, {});
});

test('completion, mistakes and hints survive refresh; new puzzles preserve history', () => {
  const completedAt = '2026-10-24T09:00:00.000Z';
  const session = { ...newPuzzleSession(puzzle), answers: solution(puzzle), wrongWordIds: [puzzle.entries[0].id], hintCount: 2 };
  const done = finishPuzzle(emptyPuzzleStore(), session, completedAt);
  assert.equal(done.completions.length, 1);
  assert.equal(done.active.completedAt, completedAt);
  assert.equal(finishPuzzle(done, done.active).completions.length, 1);
  const restored = parsePuzzleStore(JSON.stringify(done), words);
  assert.deepEqual(restored, done);
  const next = { ...done, active: newPuzzleSession(generateCrossword(words, seeded(42))) };
  const restoredNext = parsePuzzleStore(JSON.stringify(next), words);
  assert.equal(restoredNext.completions[0].completedAt, completedAt);
  assert.equal(restoredNext.completions[0].hintCount, 2);
  assert.deepEqual(restoredNext.completions[0].wrongWordIds, session.wrongWordIds);
  assert.equal(restoredNext.active.completedAt, null);
});

test('partial input and hint state restore; corrupted grid and mismatched source rejected', () => {
  const e = puzzle.entries[0], key = cellKey(e.row, e.col);
  const session = { ...newPuzzleSession(puzzle), answers: { [key]: e.word[0] }, hintLevels: { [e.id]: 2 }, letterHints: { [e.id]: key }, hintCount: 2 };
  assert.deepEqual(parsePuzzleStore(JSON.stringify({ ...emptyPuzzleStore(), active: session }), words).active, session);
  const invalid = structuredClone(session); invalid.puzzle.cells[e.row][e.col] = '!';
  assert.equal(parsePuzzleStore(JSON.stringify({ ...emptyPuzzleStore(), active: invalid }), words).active, null);
  assert.deepEqual(parsePuzzleStore('{broken', words), emptyPuzzleStore());
  assert.equal(isValidCrossword(puzzle, []), false);
});

test('generation fails within bounded work for insufficient or incompatible words', () => {
  assert.throws(() => generateCrossword(words.slice(0, 3), seeded(1)), /부족/);
  const incompatible = 'ABCDEFGH'.split('').map((c, i) => ({ id: String(i), word: c.repeat(3), clue: '___', meaning: '뜻' }));
  assert.throws(() => generateCrossword(incompatible, seeded(1)), /만들지/);
});
