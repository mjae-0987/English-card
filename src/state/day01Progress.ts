export const PROGRESS_KEY = 'word-master-adventure:day01-sentences:v1';
export const DAY01_SET_COUNT = 8;
export const DAY01_SET_IDS = Array.from({ length: DAY01_SET_COUNT }, (_, index) => `day01-set${String(index + 1).padStart(2, '0')}`);
export interface SentenceProgress {
  version: 1;
  completedSetIds: string[];
}
export const emptySentenceProgress = (): SentenceProgress => ({ version: 1, completedSetIds: [] });
export const sentenceStorageKey = (day: number) => `word-master-adventure:day${String(day).padStart(2, '0')}-sentences:v1`;
const validSetId = (id: unknown, day = 1): id is string => typeof id === 'string' && Array.from({ length: 8 }, (_, i) => `day${String(day).padStart(2, '0')}-set${String(i + 1).padStart(2, '0')}`).includes(id);

export function parseSentenceProgress(raw: string | null, day = 1): SentenceProgress {
  if (!raw) return emptySentenceProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1 ||
      !('completedSetIds' in parsed) || !Array.isArray(parsed.completedSetIds)) return emptySentenceProgress();
    return { version: 1, completedSetIds: [...new Set(parsed.completedSetIds.filter(id => validSetId(id, day)))].sort() };
  } catch { return emptySentenceProgress(); }
}

export function completeSentenceSet(progress: SentenceProgress, setId: string, day = 1): SentenceProgress {
  if (!validSetId(setId, day) || progress.completedSetIds.includes(setId)) return progress;
  return { version: 1, completedSetIds: [...progress.completedSetIds, setId].sort() };
}

export function isDay01SentencesComplete(progress: SentenceProgress) {
  return parseSentenceProgress(JSON.stringify(progress)).completedSetIds.length === DAY01_SET_COUNT;
}

export function loadSentenceProgress(storage: Pick<Storage, 'getItem'>) {
  return parseSentenceProgress(storage.getItem(PROGRESS_KEY));
}

export function saveSentenceProgress(storage: Pick<Storage, 'setItem'>, progress: SentenceProgress) {
  storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
