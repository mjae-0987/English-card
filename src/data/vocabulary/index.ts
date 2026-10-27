import day01 from './day01.json';
import day02 from './day02.json';
import day03 from './day03.json';
import day04 from './day04.json';
import day05 from './day05.json';
import authoredDay01 from './day01-learning-meanings.json';
import authoredDay02 from './day02-learning-meanings.json';
import authoredDay03 from './day03-learning-meanings.json';
import authoredDay04 from './day04-learning-meanings.json';
import authoredDay05 from './day05-learning-meanings.json';

export interface VocabularyEntry {
  readonly id: string;
  readonly day: number;
  readonly order: number;
  readonly word: string;
  /** Authored meanings are an overlay; the original PDF JSON stays untouched. */
  readonly meaning: string | null;
  readonly meaningOrigin?: 'learning-authored';
}

// Add the next DAY file here. Array order always follows the printed row numbers.
const vocabularyByDay: Readonly<Partial<Record<number, readonly VocabularyEntry[]>>> = {
  1: day01, 2: day02, 3: day03, 4: day04, 5: day05,
};
const emptyDay: readonly VocabularyEntry[] = [];
const authoredMeanings = new Map([authoredDay01, authoredDay02, authoredDay03, authoredDay04, authoredDay05].flatMap(data => data.entries.map(entry => [entry.wordId, entry] as const)));
const learningByDay = Object.fromEntries(Object.entries(vocabularyByDay).map(([day, words]) => [day, words!.map<VocabularyEntry>(entry => ({ ...entry, meaning: authoredMeanings.get(entry.id)?.meaning ?? entry.meaning, meaningOrigin: 'learning-authored' }))]));
export function getDayVocabulary(day: number): readonly VocabularyEntry[] {
  return learningByDay[day] ?? emptyDay;
}
export const allVocabulary = [1, 2, 3, 4, 5].flatMap(getDayVocabulary);

export function getDayVocabularySummary(day: number) {
  const entries = getDayVocabulary(day);
  const missingMeaningCount = entries.filter(entry => entry.meaning === null).length;
  return {
    hasData: entries.length > 0,
    wordCount: entries.length,
    missingMeaningCount,
    authoredMeaningCount: entries.filter(entry => entry.meaningOrigin === 'learning-authored').length,
    sourceMissingMeaningCount: (vocabularyByDay[day] ?? emptyDay).filter(entry => entry.meaning === null).length,
    meaningsComplete: entries.length > 0 && missingMeaningCount === 0,
  };
}
