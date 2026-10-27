export const COLLECTION_KEY = 'word-master-adventure:collection:v1';
export const POSITION_KEY = 'word-master-adventure:position:v1';
export interface ReviewEvent { wordId: string; correct: boolean; at: string }
export interface MistakeEvent { wordId: string; puzzleId: string; at: string }
export interface Collection { version: 1; starredIds: string[]; mistakes: MistakeEvent[]; reviews: ReviewEvent[] }
export const emptyCollection = (): Collection => ({ version: 1, starredIds: [], mistakes: [], reviews: [] });
const date = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
export function parseCollection(raw: string | null, validIds: ReadonlySet<string>): Collection {
  try {
    const data = JSON.parse(raw ?? 'null');
    if (data?.version !== 1) return emptyCollection();
    return {
      version: 1,
      starredIds: [...new Set<string>((Array.isArray(data.starredIds) ? data.starredIds : []).filter((id: unknown) => typeof id === 'string' && validIds.has(id)))],
      mistakes: (Array.isArray(data.mistakes) ? data.mistakes : []).filter((e: MistakeEvent) => e && validIds.has(e.wordId) && typeof e.puzzleId === 'string' && date(e.at)),
      reviews: (Array.isArray(data.reviews) ? data.reviews : []).filter((e: ReviewEvent) => e && validIds.has(e.wordId) && typeof e.correct === 'boolean' && date(e.at)),
    };
  } catch { return emptyCollection(); }
}
export function recordMistakes(collection: Collection, wordIds: string[], puzzleId: string, at: string): Collection {
  const existing = new Set(collection.mistakes.filter(e => e.puzzleId === puzzleId).map(e => e.wordId));
  return { ...collection, mistakes: [...collection.mistakes, ...wordIds.filter(id => !existing.has(id)).map(wordId => ({ wordId, puzzleId, at }))] };
}
export function toggleStar(collection: Collection, id: string): Collection {
  return { ...collection, starredIds: collection.starredIds.includes(id) ? collection.starredIds.filter(item => item !== id) : [...collection.starredIds, id] };
}
