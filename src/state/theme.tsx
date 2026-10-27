import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
export type Theme = 'sunshine' | 'peach' | 'sand';
export const THEME_KEY = 'word-master-adventure:theme:v1';
export const THEMES: { id: Theme; name: string; description: string }[] = [
  { id: 'sunshine', name: 'A. 햇살 오렌지', description: '크림빛 바탕에 톡톡 튀는 오렌지' },
  { id: 'peach', name: 'B. 피치 크림', description: '복숭아빛 바탕에 다정한 코랄' },
  { id: 'sand', name: 'C. 샌드 오렌지', description: '햇살 담은 샌드와 따뜻한 오렌지' },
];
const ThemeContext = createContext<{ theme: Theme; selectTheme: (theme: Theme) => void; error: string } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try { const value = localStorage.getItem(THEME_KEY); return THEMES.some(t => t.id === value) ? value as Theme : 'sunshine'; } catch { return 'sunshine'; }
  });
  const [error, setError] = useState('');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'peach' ? '#FFF3ED' : theme === 'sand' ? '#FFF5E7' : '#FFF9ED');
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, error, selectTheme: next => {
    setTheme(next); try { localStorage.setItem(THEME_KEY, next); setError(''); } catch { setError('테마 설정을 저장하지 못했어요.'); }
  } }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('ThemeProvider is required'); return value; }
