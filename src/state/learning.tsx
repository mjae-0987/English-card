import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { CONTENT_DAYS, getDaySets } from '../data/lessons';
import { allVocabulary } from '../data/vocabulary';
import { completeSentenceSet, emptySentenceProgress, parseSentenceProgress, sentenceStorageKey, type SentenceProgress } from './day01Progress';
import { getCrosswordWords } from '../puzzle/data';
import { generateCrossword } from '../puzzle/engine';
import { puzzleStorageKey, emptyPuzzleStore, finishPuzzle, newPuzzleSession, parsePuzzleStore, type PuzzleSession, type PuzzleStore } from '../puzzle/progress';
import { COLLECTION_KEY, POSITION_KEY, parseCollection, recordMistakes, toggleStar, type Collection } from './collection';
export { DAYS, STEPS, STEP_LABELS, dayLabel, stepKey, getDayProgress, getStepStatus } from './progression';
export type { Step, NodeStatus, AccessPolicy, LearningRecord } from './progression';
import { initialRecord, stepKey, getStepStatus, type LearningRecord, type AccessPolicy } from './progression';

interface DayState { sentences: SentenceProgress; puzzle: PuzzleStore }
export interface Position { day: number; setIndex: number; page: 'sentences' | 'crossword'; at: string }
interface LearningContextValue {
  record: LearningRecord; accessPolicy: AccessPolicy; days: Record<number, DayState>;
  completeSet: (day: number, id: string) => void;
  createPuzzle: (day: number) => void;
  updatePuzzle: (day: number, session: PuzzleSession, finish?: boolean) => void;
  storageError: boolean; retrySave: () => void;
  collection: Collection; toggleStar: (id: string) => void;
  recordReview: (id: string, correct: boolean) => void;
  lastPosition: Position | null; savePosition: (day: number, page: Position['page'], setIndex?: number) => void;
}
const validIds = new Set(allVocabulary.map(w => w.id));
function loadState() {
  let error = false;
  const read = (key: string) => { try { return window.localStorage.getItem(key); } catch { error = true; return null; } };
  const days: Record<number, DayState> = Object.fromEntries(CONTENT_DAYS.map(day => [day, {
    sentences: parseSentenceProgress(read(sentenceStorageKey(day)), day),
    puzzle: parsePuzzleStore(read(puzzleStorageKey(day)), getCrosswordWords(day)),
  }]));
  let collection = parseCollection(read(COLLECTION_KEY), validIds);
  // Import legacy mistakes without deleting/replacing legacy completion history.
  for (const state of Object.values(days)) {
    for (const c of state.puzzle.completions) collection = recordMistakes(collection, c.wrongWordIds, c.puzzleId, c.completedAt);
    const active = state.puzzle.active;
    if (active) collection = recordMistakes(collection, active.wrongWordIds, active.puzzle.id, active.completedAt ?? new Date().toISOString());
  }
  let lastPosition: Position | null = null;
  try {
    const p = JSON.parse(read(POSITION_KEY) ?? 'null');
    if (p && CONTENT_DAYS.includes(p.day) && ['sentences', 'crossword'].includes(p.page) && Number.isInteger(p.setIndex) && p.setIndex >= 0 && p.setIndex < 8) lastPosition = p;
  } catch { /* A corrupt position does not affect progress. */ }
  return { days, collection, lastPosition, error };
}
const LearningContext = createContext<LearningContextValue | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadState);
  const [days, setDays] = useState(initial.days);
  const daysRef = useRef(days);
  const [collection, setCollection] = useState(initial.collection);
  const collectionRef = useRef(collection);
  const [lastPosition, setLastPosition] = useState(initial.lastPosition);
  const [storageError, setStorageError] = useState(initial.error);
  const failures = useRef(new Set<string>());
  const save = (key: string, value: unknown) => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); failures.current.delete(key); }
    catch { failures.current.add(key); }
    setStorageError(failures.current.size > 0);
  };
  const record: LearningRecord = {
    ...initialRecord,
    completedSteps: CONTENT_DAYS.flatMap(day => [
      ...(days[day].sentences.completedSetIds.length === 8 ? [stepKey(day, 'sentences')] : []),
      ...(days[day].puzzle.completions.length > 0 ? [stepKey(day, 'puzzle')] : []),
    ]),
  };
  record.currentDay = CONTENT_DAYS.find(day => !record.completedSteps.includes(stepKey(day, 'puzzle'))) ?? 5;
  const setDay = (day: number, state: DayState) => {
    daysRef.current = { ...daysRef.current, [day]: state }; setDays(daysRef.current);
  };
  const changeCollection = (next: Collection) => {
    collectionRef.current = next; setCollection(next); save(COLLECTION_KEY, next);
  };
  const completeSet = (day: number, setId: string) => {
    if (getStepStatus(record, day, 'sentences') === 'locked') return;
    const previous = daysRef.current[day];
    const next = completeSentenceSet(previous.sentences, setId, day);
    setDay(day, { ...previous, sentences: next }); save(sentenceStorageKey(day), next);
  };
  const createPuzzle = (day: number) => {
    if (getStepStatus(record, day, 'puzzle') === 'locked') return;
    const previous = daysRef.current[day];
    const next = { ...previous.puzzle, active: newPuzzleSession(generateCrossword(getCrosswordWords(day))) };
    setDay(day, { ...previous, puzzle: next }); save(puzzleStorageKey(day), next);
  };
  const updatePuzzle = (day: number, session: PuzzleSession, finish = false) => {
    if (getStepStatus(record, day, 'puzzle') === 'locked') return;
    const previous = daysRef.current[day];
    if (session.puzzle.id !== previous.puzzle.active?.puzzle.id) return;
    const next = finish ? finishPuzzle(previous.puzzle, session) : { ...previous.puzzle, active: session };
    setDay(day, { ...previous, puzzle: next }); save(puzzleStorageKey(day), next);
    if (session.wrongWordIds.length) changeCollection(recordMistakes(collectionRef.current, session.wrongWordIds, session.puzzle.id, new Date().toISOString()));
  };
  const savePosition = (day: number, page: Position['page'], setIndex = 0) => {
    if (!getDaySets(day).length) return;
    const next = { day, page, setIndex, at: new Date().toISOString() };
    setLastPosition(next); save(POSITION_KEY, next);
  };
  const retrySave = () => {
    for (const day of CONTENT_DAYS) {
      save(sentenceStorageKey(day), daysRef.current[day].sentences);
      save(puzzleStorageKey(day), daysRef.current[day].puzzle);
    }
    save(COLLECTION_KEY, collectionRef.current);
    if (lastPosition) save(POSITION_KEY, lastPosition);
  };
  return <LearningContext.Provider value={{ record, accessPolicy: 'sequential', days, completeSet, createPuzzle, updatePuzzle, storageError, retrySave, collection,
    toggleStar: id => { if (validIds.has(id)) changeCollection(toggleStar(collectionRef.current, id)); },
    recordReview: (wordId, correct) => { if (validIds.has(wordId)) changeCollection({ ...collectionRef.current, reviews: [...collectionRef.current.reviews, { wordId, correct, at: new Date().toISOString() }] }); },
    lastPosition, savePosition,
  }}>{children}</LearningContext.Provider>;
}
export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error('LearningProvider is required');
  return value;
}
export function useDayLearning(day: number) {
  const ctx = useLearning();
  const state = ctx.days[day] ?? { sentences: emptySentenceProgress(), puzzle: emptyPuzzleStore() };
  return { ...ctx, sentenceProgress: state.sentences, puzzleStore: state.puzzle, puzzleStorageError: ctx.storageError,
    completeSet: (id: string) => ctx.completeSet(day, id), createPuzzle: () => ctx.createPuzzle(day),
    updatePuzzle: (session: PuzzleSession, finish = false) => ctx.updatePuzzle(day, session, finish),
  };
}
