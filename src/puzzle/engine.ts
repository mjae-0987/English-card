export type Direction = 'across' | 'down';
export interface CrosswordWord { id: string; word: string; meaning: string; clue: string }
export interface PlacedWord extends CrosswordWord { row: number; col: number; direction: Direction; number: number }
export interface Crossword { id: string; rows: number; cols: number; cells: (string | null)[][]; entries: PlacedWord[] }
interface Tile { letter: string; across?: string; down?: string }
type Board = Map<string, Tile>;
export const cellKey = (row: number, col: number) => `${row},${col}`;
export function makeBlankClue(story: string, word: string) {
  if (!/^[a-z]+$/i.test(word)) throw new Error('영어 단어 형식을 확인해 주세요.');
  const pattern = new RegExp(`\\b${word}\\b`, 'i');
  const sentence = (story.match(/[^.!?]+[.!?]*/g) ?? []).find(text => pattern.test(text));
  if (!sentence) throw new Error(`예문에 단어가 없어요: ${word}`);
  return sentence.trim().replace(new RegExp(`\\b${word}\\b`, 'gi'), '________');
}
export function wordCells(entry: Pick<PlacedWord, 'row' | 'col' | 'direction' | 'word'>) {
  return Array.from({ length: entry.word.length }, (_, index) => ({
    row: entry.row + (entry.direction === 'down' ? index : 0),
    col: entry.col + (entry.direction === 'across' ? index : 0),
  }));
}
function bounds(board: Board) {
  const coordinates = [...board.keys()].map(key => key.split(',').map(Number));
  const rows = coordinates.map(([row]) => row), cols = coordinates.map(([, col]) => col);
  return { top: Math.min(...rows), bottom: Math.max(...rows), left: Math.min(...cols), right: Math.max(...cols) };
}
function place(board: Board, entry: PlacedWord) {
  wordCells(entry).forEach(({ row, col }, index) => {
    const key = cellKey(row, col);
    board.set(key, { ...board.get(key), letter: entry.word[index], [entry.direction]: entry.id });
  });
}
function placementScore(board: Board, entry: PlacedWord, b: ReturnType<typeof bounds>) {
  const cells = wordCells(entry);
  const dr = entry.direction === 'down' ? 1 : 0, dc = entry.direction === 'across' ? 1 : 0;
  if (board.has(cellKey(entry.row - dr, entry.col - dc))) return null;
  const last = cells[cells.length - 1];
  if (board.has(cellKey(last.row + dr, last.col + dc))) return null;
  let intersections = 0;
  for (const [index, { row, col }] of cells.entries()) {
    const tile = board.get(cellKey(row, col));
    if (tile) {
      if (tile.letter !== entry.word[index] || tile[entry.direction]) return null;
      intersections++;
    } else {
      const nr = entry.direction === 'across' ? 1 : 0, nc = entry.direction === 'down' ? 1 : 0;
      if (board.has(cellKey(row - nr, col - nc)) || board.has(cellKey(row + nr, col + nc))) return null;
    }
  }
  if (!intersections) return null;
  const height = Math.max(b.bottom, last.row) - Math.min(b.top, entry.row) + 1;
  const width = Math.max(b.right, last.col) - Math.min(b.left, entry.col) + 1;
  if (height > 15 || width > 15) return null;
  const oldArea = (b.bottom - b.top + 1) * (b.right - b.left + 1);
  return intersections * 35 - (height * width - oldArea) * .22 - Math.abs(height - width) * .4;
}
function shuffled<T>(items: readonly T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}
function finalize(board: Board, entries: PlacedWord[], random: () => number): Crossword {
  const b = bounds(board);
  const transpose = b.right - b.left > b.bottom - b.top;
  const placed = entries.map(entry => {
    const row = entry.row - b.top, col = entry.col - b.left;
    return { ...entry, row: transpose ? col : row, col: transpose ? row : col, direction: (transpose ? entry.direction === 'across' ? 'down' : 'across' : entry.direction) as Direction };
  });
  const rows = (transpose ? b.right - b.left : b.bottom - b.top) + 1;
  const cols = (transpose ? b.bottom - b.top : b.right - b.left) + 1;
  const cells: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const starts = [...new Set(placed.map(entry => cellKey(entry.row, entry.col)))].sort((a, c) => {
    const [ar, ac] = a.split(',').map(Number), [cr, cc] = c.split(',').map(Number);
    return ar - cr || ac - cc;
  });
  for (const entry of placed) {
    entry.number = starts.indexOf(cellKey(entry.row, entry.col)) + 1;
    wordCells(entry).forEach(({ row, col }, index) => { cells[row][col] = entry.word[index]; });
  }
  placed.sort((a, c) => a.number - c.number || a.direction.localeCompare(c.direction));
  return { id: `day01-${Date.now().toString(36)}-${Math.floor(random() * 1e12).toString(36)}`, rows, cols, cells, entries: placed };
}

/** At most 20 bounded attempts. Each additional word crosses the connected board. */
export function generateCrossword(source: readonly CrosswordWord[], random = Math.random): Crossword {
  const seen = new Set<string>();
  const words = source.filter(entry => {
    const word = entry.word.toUpperCase();
    if (!/^[A-Z]{2,15}$/.test(word) || seen.has(word)) return false;
    seen.add(word); return true;
  }).map(entry => ({ ...entry, word: entry.word.toUpperCase() }));
  if (words.length < 8) throw new Error('교차할 수 있는 단어가 부족해요.');
  let best: Crossword | null = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidates = shuffled(words, random);
    const seed = candidates.find(entry => entry.word.length >= 7 && entry.word.length <= 12) ?? candidates[0];
    const entries: PlacedWord[] = [{ ...seed, row: 0, col: 0, direction: random() > .5 ? 'across' : 'down', number: 0 }];
    const board: Board = new Map();
    place(board, entries[0]);
    const used = new Set([seed.id]);
    const target = 10 + Math.floor(random() * 4);
    while (entries.length < target) {
      let choice: PlacedWord | null = null, bestScore = -Infinity;
      const currentBounds = bounds(board);
      const letters = new Map<string, { row: number; col: number; tile: Tile }[]>();
      for (const [key, tile] of board) {
        const [row, col] = key.split(',').map(Number);
        const list = letters.get(tile.letter) ?? [];
        list.push({ row, col, tile }); letters.set(tile.letter, list);
      }
      for (const word of candidates) {
        if (used.has(word.id)) continue;
        for (let index = 0; index < word.word.length; index++) {
          for (const { row, col, tile } of letters.get(word.word[index]) ?? []) {
            for (const direction of ['across', 'down'] as const) {
              if (tile[direction]) continue;
              const entry: PlacedWord = { ...word, row: row - (direction === 'down' ? index : 0), col: col - (direction === 'across' ? index : 0), direction, number: 0 };
              const score = placementScore(board, entry, currentBounds);
              const weightedScore = score === null ? -Infinity : score + random() * 4;
              if (weightedScore > bestScore) {
                bestScore = weightedScore; choice = entry;
              }
            }
          }
        }
      }
      if (!choice) break;
      place(board, choice); entries.push(choice); used.add(choice.id);
    }
    if (entries.length < 8) continue;
    const puzzle = finalize(board, entries, random);
    if (!best || puzzle.entries.length > best.entries.length ||
      puzzle.entries.length === best.entries.length && puzzle.rows * puzzle.cols < best.rows * best.cols) best = puzzle;
    if (puzzle.entries.length >= 10 && puzzle.cols <= 13) return puzzle;
  }
  if (best) return best;
  throw new Error('읽기 좋은 퍼즐을 만들지 못했어요. 새로 만들기를 눌러 주세요.');
}

export type Answers = Record<string, string>;
export type WordResult = 'correct' | 'wrong' | 'empty';
export function checkEntry(entry: PlacedWord, answers: Answers): WordResult {
  const values = wordCells(entry).map(cell => answers[cellKey(cell.row, cell.col)] ?? '');
  if (values.every((letter, index) => letter === entry.word[index])) return 'correct';
  return values.some(Boolean) ? 'wrong' : 'empty';
}
export function isPuzzleSolved(puzzle: Crossword, answers: Answers) {
  return puzzle.entries.every(entry => checkEntry(entry, answers) === 'correct');
}

/** Independent structural check, also used before accepting a stored puzzle. */
export function isValidCrossword(value: unknown, source: readonly CrosswordWord[]): value is Crossword {
  if (!value || typeof value !== 'object') return false;
  const p = value as Crossword;
  if (typeof p.id !== 'string' || !Number.isInteger(p.rows) || !Number.isInteger(p.cols) || p.rows < 2 || p.cols < 2 || p.rows > 15 || p.cols > 15 ||
    !Array.isArray(p.cells) || p.cells.length !== p.rows || !p.cells.every(row => Array.isArray(row) && row.length === p.cols) ||
    !Array.isArray(p.entries) || p.entries.length < 8 || p.entries.length > 15) return false;
  const expected = new Map(source.map(entry => [entry.id, entry]));
  const occupied = new Map<string, { letter: string; owners: PlacedWord[] }>();
  const ids = new Set<string>(), words = new Set<string>();
  for (const entry of p.entries) {
    if (!entry || typeof entry !== 'object') return false;
    const original = expected.get(entry.id);
    if (!original || entry.word !== original.word.toUpperCase() || entry.clue !== original.clue || entry.meaning !== original.meaning ||
      ids.has(entry.id) || words.has(entry.word) || !['across', 'down'].includes(entry.direction) ||
      !Number.isInteger(entry.row) || !Number.isInteger(entry.col) || !Number.isInteger(entry.number)) return false;
    ids.add(entry.id); words.add(entry.word);
    for (const [index, cell] of wordCells(entry).entries()) {
      if (cell.row < 0 || cell.col < 0 || cell.row >= p.rows || cell.col >= p.cols) return false;
      const key = cellKey(cell.row, cell.col), tile = occupied.get(key);
      if (tile && (tile.letter !== entry.word[index] || tile.owners.some(owner => owner.direction === entry.direction))) return false;
      occupied.set(key, { letter: entry.word[index], owners: [...(tile?.owners ?? []), entry] });
    }
  }
  for (let row = 0; row < p.rows; row++) for (let col = 0; col < p.cols; col++) {
    if (p.cells[row][col] !== (occupied.get(cellKey(row, col))?.letter ?? null)) return false;
    for (const direction of ['across', 'down'] as const) {
      const dr = direction === 'down' ? 1 : 0, dc = direction === 'across' ? 1 : 0;
      if (!p.cells[row][col] || p.cells[row - dr]?.[col - dc]) continue;
      let length = 0;
      while (p.cells[row + dr * length]?.[col + dc * length]) length++;
      if (length > 1 && !p.entries.some(entry => entry.row === row && entry.col === col && entry.direction === direction && entry.word.length === length)) return false;
    }
  }
  const reachable = new Set([p.entries[0].id]);
  for (let pass = 0; pass < p.entries.length; pass++) for (const tile of occupied.values()) {
    if (tile.owners.some(owner => reachable.has(owner.id))) tile.owners.forEach(owner => reachable.add(owner.id));
  }
  if (reachable.size !== p.entries.length || !p.entries.some(e => e.direction === 'across') || !p.entries.some(e => e.direction === 'down')) return false;
  const starts = [...new Set(p.entries.map(e => cellKey(e.row, e.col)))].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number), [br, bc] = b.split(',').map(Number); return ar - br || ac - bc;
  });
  return p.entries.every(entry => entry.number === starts.indexOf(cellKey(entry.row, entry.col)) + 1) &&
    p.cells[0].some(Boolean) && p.cells[p.rows - 1].some(Boolean) && p.cells.some(row => row[0]) && p.cells.some(row => row[p.cols - 1]);
}
