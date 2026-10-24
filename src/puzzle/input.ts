import { cellKey, wordCells, type Answers, type PlacedWord } from './engine.ts';

export function enterLetters(entry: PlacedWord, index: number, text: string, answers: Answers) {
  const letters = text.normalize('NFKC').toUpperCase().replace(/[^A-Z]/g, '');
  const cells = wordCells(entry), next = { ...answers };
  let cursor = Math.max(0, Math.min(index, cells.length - 1));
  for (const letter of letters.slice(0, cells.length - cursor)) {
    const cell = cells[cursor]; next[cellKey(cell.row, cell.col)] = letter;
    cursor++;
  }
  return { answers: next, index: Math.min(cursor, cells.length - 1) };
}
export function eraseLetter(entry: PlacedWord, index: number, answers: Answers) {
  const cells = wordCells(entry), next = { ...answers };
  const current = cells[Math.max(0, Math.min(index, cells.length - 1))];
  const previous = cells[Math.max(0, index - 1)];
  if (next[cellKey(current.row, current.col)]) delete next[cellKey(current.row, current.col)];
  else delete next[cellKey(previous.row, previous.col)];
  return { answers: next, index: Math.max(0, index - 1) };
}
