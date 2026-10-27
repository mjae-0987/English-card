import day01 from './day01.json';
import day02 from './day02.json';
import day03 from './day03.json';
import day04 from './day04.json';
import day05 from './day05.json';
import meanings from '../vocabulary/day01-learning-meanings.json';
import { getDayVocabulary } from '../vocabulary';
export interface LessonSet { id: string; day: number; order: number; title: string; wordIds: string[]; story: string; translation: string }
import { CONTENT_DAYS } from '../../state/progression';
export { CONTENT_DAYS } from '../../state/progression';
const lessons: Record<number, { sets: LessonSet[] }> = { 1: day01, 2: day02, 3: day03, 4: day04, 5: day05 };
export const getDaySets = (day: number): LessonSet[] => lessons[day]?.sets ?? [];
export const getWordLesson = (id: string) => CONTENT_DAYS.flatMap(getDaySets).find(set => set.wordIds.includes(id));
export const day01Sets = getDaySets(1);
export const day01Words = getDayVocabulary(1);
export const day01MeaningNotes = new Map(meanings.entries.map(entry => [entry.wordId, entry]));
export function hasStepContent(day: number, step: 'sentences' | 'puzzle') {
  return CONTENT_DAYS.includes(day) && (step === 'sentences' || step === 'puzzle');
}
