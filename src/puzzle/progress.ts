import { cellKey, isPuzzleSolved, isValidCrossword, wordCells, type Answers, type Crossword, type CrosswordWord } from './engine.ts';

export const puzzleStorageKey = (day: number) => `word-master-adventure:day${String(day).padStart(2, '0')}-puzzle:v1`;
export const PUZZLE_STORAGE_KEY = 'word-master-adventure:day01-puzzle:v1';
export interface PuzzleSession {
  puzzle: Crossword;
  answers: Answers;
  hintLevels: Record<string, number>;
  letterHints: Record<string, string>;
  hintCount: number;
  wrongWordIds: string[];
  completedAt: string | null;
}
export interface PuzzleCompletion {
  puzzleId: string; wordIds: string[]; wrongWordIds: string[]; hintCount: number; completedAt: string;
}
export interface PuzzleStore { version: 1; active: PuzzleSession | null; completions: PuzzleCompletion[] }
export const emptyPuzzleStore = (): PuzzleStore => ({ version: 1, active: null, completions: [] });
export function newPuzzleSession(puzzle: Crossword): PuzzleSession {
  return { puzzle, answers: {}, hintLevels: {}, letterHints: {}, hintCount: 0, wrongWordIds: [], completedAt: null };
}
export function applyHint(session: PuzzleSession, wordId: string): PuzzleSession {
  const entry = session.puzzle.entries.find(word => word.id === wordId);
  const level = session.hintLevels[wordId] ?? 0;
  if (!entry || level >= 2 || session.completedAt) return session;
  const next = { ...session, hintLevels: { ...session.hintLevels, [wordId]: level + 1 }, hintCount: session.hintCount + 1 };
  if (level === 1) {
    const cells = wordCells(entry);
    const index = cells.findIndex((cell, i) => session.answers[cellKey(cell.row, cell.col)] !== entry.word[i]);
    const position = index < 0 ? 0 : index;
    const key = cellKey(cells[position].row, cells[position].col);
    next.answers = { ...session.answers, [key]: entry.word[position] };
    next.letterHints = { ...session.letterHints, [wordId]: key };
  }
  return next;
}
const stringIds = (value: unknown, validIds: Set<string>): value is string[] => Array.isArray(value) &&
  value.every(id => typeof id === 'string' && validIds.has(id)) && new Set(value).size === value.length;
const dateValid = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));

export function parsePuzzleStore(raw: string | null, words: readonly CrosswordWord[]): PuzzleStore {
  if (!raw) return emptyPuzzleStore();
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.completions)) return emptyPuzzleStore();
    const validIds = new Set(words.map(word => word.id));
    const seen = new Set<string>();
    const completions = data.completions.filter((item: PuzzleCompletion) => {
      if (!item || typeof item.puzzleId !== 'string' || seen.has(item.puzzleId) || !dateValid(item.completedAt) ||
        !stringIds(item.wordIds, validIds) || item.wordIds.length < 8 || item.wordIds.length > 15 ||
        !stringIds(item.wrongWordIds, new Set(item.wordIds)) || !Number.isInteger(item.hintCount) || item.hintCount < 0 || item.hintCount > item.wordIds.length * 2) return false;
      seen.add(item.puzzleId); return true;
    });
    let active: PuzzleSession | null = null;
    const s = data.active;
    if (s && isValidCrossword(s.puzzle, words) && s.answers && typeof s.answers === 'object' && !Array.isArray(s.answers) &&
      s.hintLevels && typeof s.hintLevels === 'object' && s.letterHints && typeof s.letterHints === 'object' &&
      Number.isInteger(s.hintCount) && s.hintCount >= 0 && s.hintCount <= s.puzzle.entries.length * 2 &&
      stringIds(s.wrongWordIds, new Set(s.puzzle.entries.map((e: { id: string }) => e.id)))) {
      const answers: Answers = {};
      for (const [key, letter] of Object.entries(s.answers)) {
        const [row, col] = key.split(',').map(Number);
        if (cellKey(row, col) === key && s.puzzle.cells[row]?.[col] && typeof letter === 'string' && /^[A-Z]$/.test(letter)) answers[key] = letter;
      }
      const hintLevels: Record<string, number> = {}, letterHints: Record<string, string> = {};
      for (const entry of s.puzzle.entries) {
        const level = s.hintLevels[entry.id];
        if (level === 1 || level === 2) hintLevels[entry.id] = level;
        if (level === 2 && wordCells(entry).some(c => cellKey(c.row, c.col) === s.letterHints[entry.id])) letterHints[entry.id] = s.letterHints[entry.id];
      }
      active = { ...s, answers, hintLevels, letterHints, completedAt: dateValid(s.completedAt) && isPuzzleSolved(s.puzzle, answers) ? s.completedAt : null };
    }
    return { version: 1, active, completions };
  } catch { return emptyPuzzleStore(); }
}

export function finishPuzzle(store: PuzzleStore, session: PuzzleSession, date = new Date().toISOString()): PuzzleStore {
  if (!isPuzzleSolved(session.puzzle, session.answers)) return { ...store, active: session };
  const completedAt = session.completedAt ?? date;
  const record = { puzzleId: session.puzzle.id, wordIds: session.puzzle.entries.map(e => e.id), wrongWordIds: session.wrongWordIds, hintCount: session.hintCount, completedAt };
  return { version: 1, active: { ...session, completedAt }, completions: store.completions.some(item => item.puzzleId === record.puzzleId) ? store.completions : [...store.completions, record] };
}
