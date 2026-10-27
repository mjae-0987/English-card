import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
export const SPEECH_KEY = 'word-master-adventure:speech:v1';
import { SpeechPlayer, isEnglishVoice, type SpeechRate, type SpeechStatus } from './speechPlayer';
export type { SpeechRate } from './speechPlayer';
interface SpeechContextValue {
  supported: boolean; status: SpeechStatus; speaking: string | null; error: string; voices: SpeechSynthesisVoice[];
  rate: SpeechRate; voiceURI: string; setRate: (value: SpeechRate) => void; setVoiceURI: (value: string) => void;
  speak: (text: string, key: string) => void; stop: () => void;
}
export const SpeechContext = createContext<SpeechContextValue | null>(null);
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SPEECH_KEY) ?? 'null');
    return { rate: ([0.75, 1, 1.15].includes(saved?.rate) ? saved.rate : 1) as SpeechRate, voiceURI: typeof saved?.voiceURI === 'string' ? saved.voiceURI : '' };
  } catch { return { rate: 1 as SpeechRate, voiceURI: '' }; }
}
export function SpeechProvider({ children }: { children: ReactNode }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [settings, setSettings] = useState(loadSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [player] = useState(() => new SpeechPlayer(supported ? window.speechSynthesis : null, text => new SpeechSynthesisUtterance(text), setSpeaking, setError));
  const stop = useCallback(() => player.stop(), [player]);
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const refresh = () => setVoices(synth.getVoices().filter(isEnglishVoice).sort((a, b) => Number(/^en[-_]US$/i.test(b.lang)) - Number(/^en[-_]US$/i.test(a.lang))));
    refresh(); const warmup = [setTimeout(refresh, 250), setTimeout(refresh, 1200)]; synth.addEventListener('voiceschanged', refresh);
    const navigate = () => { stop(); setError(''); };
    window.addEventListener('hashchange', navigate);
    window.addEventListener('pagehide', stop);
    return () => { warmup.forEach(clearTimeout); synth.removeEventListener('voiceschanged', refresh); window.removeEventListener('hashchange', navigate); window.removeEventListener('pagehide', stop); stop(); };
  }, [supported, stop]);
  const persist = (next: typeof settings) => {
    stop(); setSettings(next);
    try { localStorage.setItem(SPEECH_KEY, JSON.stringify({ version: 1, ...next })); }
    catch { setError('음성 설정을 저장하지 못했어요.'); }
  };
  const speak = (text: string, key: string) => player.speak(text, key, settings.rate, settings.voiceURI);
  return <SpeechContext.Provider value={{ supported, status: error ? 'error' : speaking ? 'speaking' : 'idle', speaking, error, voices, ...settings, setRate: rate => persist({ ...settings, rate }), setVoiceURI: voiceURI => persist({ ...settings, voiceURI }), speak, stop }}>{children}</SpeechContext.Provider>;
}
