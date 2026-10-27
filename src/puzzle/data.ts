import { getDaySets } from '../data/lessons';
import { getDayVocabulary } from '../data/vocabulary';
import { makeBlankClue, type CrosswordWord } from './engine';
export function getCrosswordWords(day: number): readonly CrosswordWord[] {
  return getDayVocabulary(day).map(word => {
    const story = getDaySets(day).find(set => set.wordIds.includes(word.id))?.story;
    if (!story || !word.meaning) throw new Error('단어를 준비하지 못했어요.');
    return { id: word.id, word: word.word, meaning: word.meaning, clue: makeBlankClue(story, word.word) };
  });
}
export const crosswordWords = getCrosswordWords(1);
