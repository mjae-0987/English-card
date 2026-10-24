import { day01Sets, day01Words } from '../data/lessons';
import { makeBlankClue, type CrosswordWord } from './engine';

export const crosswordWords: readonly CrosswordWord[] = day01Words.map(word => {
  const story = day01Sets.find(set => set.wordIds.includes(word.id))!.story;
  return { id: word.id, word: word.word, meaning: word.meaning!, clue: makeBlankClue(story, word.word) };
});
