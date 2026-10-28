import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AudioPlayer, type AudioSnapshot, type AudioStatus } from '../audio/AudioPlayer';
import { getAudioAsset } from '../audio/catalog';
import { isEnglishVoice, type SpeechRate } from './speechPlayer';
export const SPEECH_KEY = 'word-master-adventure:speech:v1';
export type { SpeechRate } from './speechPlayer';
interface SpeechContextValue {
  supported: boolean; status: AudioStatus; speaking: string | null; error: string;
  loading: boolean; playing: boolean; source: AudioSnapshot['source'];
  voices: SpeechSynthesisVoice[]; rate: SpeechRate; playbackRate: SpeechRate; voiceURI: string;
  setRate: (value: SpeechRate) => void; setVoiceURI: (value: string) => void;
  play: (text: string, key: string) => void; speak: (text: string, key: string) => void;
  pause: () => void; resume: () => void; stop: () => void;
}
export const SpeechContext = createContext<SpeechContextValue | null>(null);
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SPEECH_KEY) ?? 'null');
    return { rate: ([0.75, 1, 1.15].includes(saved?.rate) ? saved.rate : 1) as SpeechRate, voiceURI: typeof saved?.voiceURI === 'string' ? saved.voiceURI : '' };
  } catch { return { rate: 1 as SpeechRate, voiceURI: '' }; }
}
export function SpeechProvider({ children }: { children: ReactNode }) {
  const audioSupported = typeof window !== 'undefined' && typeof window.Audio === 'function';
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [settings, setSettings] = useState(loadSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<AudioSnapshot>({ status: 'idle', key: null, source: null, error: '' });
  const [saveError, setSaveError] = useState('');
  const [player] = useState(() => {
    const p = new AudioPlayer({
      createAudio: audioSupported ? () => new Audio() : null, resolve: getAudioAsset, notify: setState,
      speech: ttsSupported ? { synth: window.speechSynthesis, create: text => new SpeechSynthesisUtterance(text) } : undefined,
      log: event => console.warn(`[audio:${event.stage}]`, { id: event.id, src: event.src, reason: event.reason }),
    });
    p.setPlaybackRate(settings.rate); p.setVoiceURI(settings.voiceURI); return p;
  });
  const stop = useCallback(() => player.stop(), [player]);
  const play = useCallback((text: string, key: string) => player.play(text, key), [player]);
  const pause = useCallback(() => player.pause(), [player]);
  const resume = useCallback(() => player.resume(), [player]);
  useEffect(() => {
    const navigate = () => stop();
    window.addEventListener('hashchange', navigate); window.addEventListener('pagehide', stop);
    // Resize/fold and ordinary renders deliberately do not stop the player.
    return () => { window.removeEventListener('hashchange', navigate); window.removeEventListener('pagehide', stop); stop(); };
  }, [stop]);
  useEffect(() => {
    if (!ttsSupported) return;
    const synth = window.speechSynthesis;
    // Some embedded browsers expose a partial TTS object. Its voice discovery
    // must never prevent the primary MP3 player from rendering or working.
    const refresh = () => {
      try { setVoices(synth?.getVoices?.().filter(isEnglishVoice) ?? []); }
      catch { setVoices([]); }
    };
    refresh(); const warmup = [setTimeout(refresh, 250), setTimeout(refresh, 1200)];
    try { synth?.addEventListener?.('voiceschanged', refresh); } catch { /* MP3 playback is independent of TTS. */ }
    return () => { warmup.forEach(clearTimeout); try { synth?.removeEventListener?.('voiceschanged', refresh); } catch { /* Optional TTS cleanup. */ } };
  }, [ttsSupported]);
  const persist = (next: typeof settings) => {
    setSettings(next);
    try { localStorage.setItem(SPEECH_KEY, JSON.stringify({ version: 1, ...next })); setSaveError(''); }
    catch { setSaveError('음성 설정을 저장하지 못했어요.'); }
  };
  return <SpeechContext.Provider value={{ supported: audioSupported || ttsSupported, status: state.status, speaking: state.key,
    error: state.error || saveError, loading: state.status === 'loading', playing: state.status === 'playing', source: state.source,
    voices, rate: settings.rate, playbackRate: settings.rate, voiceURI: settings.voiceURI,
    setRate: rate => { player.setPlaybackRate(rate); persist({ ...settings, rate }); },
    setVoiceURI: voiceURI => { player.setVoiceURI(voiceURI); persist({ ...settings, voiceURI }); },
    play, speak: play, pause, resume, stop,
  }}>{children}</SpeechContext.Provider>;
}
