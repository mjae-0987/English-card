export const VIEW_KEY = 'word-master-adventure:view:v1';
export function readView<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(`${VIEW_KEY}:${key}`) ?? 'null') ?? fallback; } catch { return fallback; }
}
export function saveView(key: string, value: unknown) {
  try { localStorage.setItem(`${VIEW_KEY}:${key}`, JSON.stringify(value)); } catch { /* Learning records have their own visible save errors. */ }
}
