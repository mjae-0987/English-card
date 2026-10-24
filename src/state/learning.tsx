import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { hasStepContent } from '../data/lessons';
import { completeSentenceSet, emptySentenceProgress, isDay01SentencesComplete, loadSentenceProgress, saveSentenceProgress, type SentenceProgress } from './day01Progress';
import { crosswordWords } from '../puzzle/data';
import { generateCrossword } from '../puzzle/engine';
import { PUZZLE_STORAGE_KEY, emptyPuzzleStore, finishPuzzle, newPuzzleSession, parsePuzzleStore, type PuzzleSession, type PuzzleStore } from '../puzzle/progress';

export type Step = 'sentences' | 'puzzle';
export type NodeStatus = 'available' | 'completed' | 'locked';
export type AccessPolicy = 'sequential' | 'free';
export interface LearningRecord {
  completedSteps: string[];
  totalXp: number;
  streakDays: number;
  currentDay: number;
}
export const DAYS = Array.from({ length: 50 }, (_, index) => index + 1);
export const STEPS: Step[] = ['sentences', 'puzzle'];
export const STEP_LABELS: Record<Step, string> = { sentences: '예문 학습', puzzle: '가로세로 퍼즐' };
export const dayLabel = (day: number) => `DAY ${String(day).padStart(2, '0')}`;
export const stepKey = (day: number, step: Step) => `${day}:${step}`;

// XP and streak remain placeholders. Only DAY 01 sentence completion is derived.
export const initialRecord: LearningRecord = {
  completedSteps: [], totalXp: 0, streakDays: 0, currentDay: 1,
};
export function getStepStatus(record: LearningRecord, day: number, step: Step, policy: AccessPolicy = 'sequential'): NodeStatus {
  if (!hasStepContent(day, step)) return 'locked';
  if (step === 'puzzle' && !record.completedSteps.includes(stepKey(day, 'sentences'))) return 'locked';
  if (record.completedSteps.includes(stepKey(day, step))) return 'completed';
  if (policy === 'free') return 'available';
  const index = (day - 1) * 2 + STEPS.indexOf(step);
  if (index === 0) return 'available';
  const previousIndex = index - 1;
  const previousKey = stepKey(Math.floor(previousIndex / 2) + 1, STEPS[previousIndex % 2]);
  return record.completedSteps.includes(previousKey) ? 'available' : 'locked';
}
export function getDayProgress(record: LearningRecord, day: number) {
  return STEPS.filter(step => record.completedSteps.includes(stepKey(day, step))).length;
}
interface LearningContextValue {
  record: LearningRecord;
  accessPolicy: AccessPolicy;
  sentenceProgress: SentenceProgress;
  completeSet: (setId: string) => void;
  storageError: boolean;
  puzzleStore: PuzzleStore;
  puzzleStorageError: boolean;
  createPuzzle: () => void;
  updatePuzzle: (session: PuzzleSession, finish?: boolean) => void;
}
function readStoredProgress() {
  try { return { progress: loadSentenceProgress(window.localStorage), storageError: false }; }
  catch { return { progress: emptySentenceProgress(), storageError: true }; }
}
const LearningContext = createContext<LearningContextValue | null>(null);
function readPuzzleStore() {
  try { return { store: parsePuzzleStore(window.localStorage.getItem(PUZZLE_STORAGE_KEY), crosswordWords), error: false }; }
  catch { return { store: emptyPuzzleStore(), error: true }; }
}
export function LearningProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readStoredProgress);
  const [sentenceProgress, setSentenceProgress] = useState(initial.progress);
  const progressRef = useRef(sentenceProgress);
  const [storageError, setStorageError] = useState(initial.storageError);
  const [initialPuzzle] = useState(readPuzzleStore);
  const [puzzleStore, setPuzzleStore] = useState(initialPuzzle.store);
  const puzzleRef = useRef(puzzleStore);
  const [puzzleStorageError, setPuzzleStorageError] = useState(initialPuzzle.error);
  const record: LearningRecord = {
    ...initialRecord,
    completedSteps: [
      ...(isDay01SentencesComplete(sentenceProgress) ? [stepKey(1, 'sentences')] : []),
      ...(puzzleStore.completions.length > 0 ? [stepKey(1, 'puzzle')] : []),
    ],
  };
  const persistPuzzle = (store: PuzzleStore) => {
    puzzleRef.current = store; setPuzzleStore(store);
    try { window.localStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(store)); setPuzzleStorageError(false); }
    catch { setPuzzleStorageError(true); }
  };
  const createPuzzle = () => {
    if (!isDay01SentencesComplete(progressRef.current)) return;
    const puzzle = generateCrossword(crosswordWords);
    persistPuzzle({ ...puzzleRef.current, active: newPuzzleSession(puzzle) });
  };
  const updatePuzzle = (session: PuzzleSession, finish = false) => {
    if (!isDay01SentencesComplete(progressRef.current)) return;
    persistPuzzle(finish ? finishPuzzle(puzzleRef.current, session) : { ...puzzleRef.current, active: session });
  };
  const completeSet = (setId: string) => {
    const next = completeSentenceSet(progressRef.current, setId);
    progressRef.current = next;
    setSentenceProgress(next);
    try { saveSentenceProgress(window.localStorage, next); setStorageError(false); }
    catch { setStorageError(true); }
  };
  const accessPolicy: AccessPolicy = 'sequential';
  return <LearningContext.Provider value={{ record, accessPolicy, sentenceProgress, completeSet, storageError, puzzleStore, puzzleStorageError, createPuzzle, updatePuzzle }}>{children}</LearningContext.Provider>;
}
export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error('LearningProvider is required');
  return value;
}
