export const CONTENT_DAYS = [1, 2, 3, 4, 5];
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

// XP rewards are outside this stage; progression is derived from saved DAY records.
export const initialRecord: LearningRecord = {
  completedSteps: [], totalXp: 0, streakDays: 0, currentDay: 1,
};
export function getStepStatus(record: LearningRecord, day: number, step: Step, policy: AccessPolicy = 'sequential'): NodeStatus {
  if (!CONTENT_DAYS.includes(day)) return 'locked';
  if (step === 'puzzle' && !record.completedSteps.includes(stepKey(day, 'sentences'))) return 'locked';
  if (record.completedSteps.includes(stepKey(day, step))) return 'completed';
  if (policy === 'free') return 'available';
  if (day > 1 && !record.completedSteps.includes(stepKey(day - 1, 'puzzle'))) return 'locked';
  const index = (day - 1) * 2 + STEPS.indexOf(step);
  if (index === 0) return 'available';
  const previousIndex = index - 1;
  const previousKey = stepKey(Math.floor(previousIndex / 2) + 1, STEPS[previousIndex % 2]);
  return record.completedSteps.includes(previousKey) ? 'available' : 'locked';
}
export function getDayProgress(record: LearningRecord, day: number) {
  return STEPS.filter(step => record.completedSteps.includes(stepKey(day, step))).length;
}

