import content from './day01.json';
import meanings from '../vocabulary/day01-learning-meanings.json';
import { getDayVocabulary } from '../vocabulary';

export const day01Sets = content.sets;
export const lessonContentNotice = '새로 작성한 학습용 뜻·예문 · 교재 원문 아님';
export const day01Words = getDayVocabulary(1);
export const day01MeaningNotes = new Map(meanings.entries.map(entry => [entry.wordId, entry]));

export function hasStepContent(day: number, step: 'sentences' | 'puzzle') {
  return day === 1 && (step === 'sentences' || step === 'puzzle');
}
