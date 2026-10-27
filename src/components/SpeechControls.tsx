import { useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import type { SpeechRate } from '../hooks/SpeechProvider';
import { THEMES, useTheme } from '../state/theme';
import { Icon } from './Icon';
export function SpeechSettings() {
  const { rate, setRate, voices, voiceURI, setVoiceURI, speak, stop, speaking, error } = useSpeech();
  const { theme, selectTheme, error: themeError } = useTheme();
  return <section className="settings-page"><a className="back-link" href="#/records"><Icon name="back"/>학습 기록</a><span className="section-kicker">MAKE IT YOURS</span><h1>나만의 모험 설정</h1><p>좋아하는 색과 편안한 목소리를 골라요.</p><div className="settings-card theme-settings"><h2>모험의 색</h2><div className="theme-options">{THEMES.map(item => <button key={item.id} className={`theme-option theme-${item.id}`} aria-pressed={theme === item.id} onClick={() => selectTheme(item.id)}><span className="theme-swatch"><i/><i/><i/></span><strong>{item.name}</strong><small>{item.description}</small>{theme === item.id && <Icon name="check"/>}</button>)}</div>{themeError && <p role="status">{themeError}</p>}</div><div className="settings-card"><h2>읽기 속도</h2><div className="segmented" aria-label="읽기 속도">{([[0.75, '느리게'], [1, '보통'], [1.15, '빠르게']] as const).map(([value, label]) => <button key={value} onClick={() => setRate(value as SpeechRate)} aria-pressed={rate === value}>{label}<small>{value}×</small></button>)}</div><label className="voice-label">영어 목소리<select value={voices.some(v => v.voiceURI === voiceURI) ? voiceURI : ''} onChange={e => setVoiceURI(e.target.value)}><option value="">자동 선택 · 미국 영어 우선</option>{voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select></label><button className="primary-button" onClick={() => speaking === 'preview' ? stop() : speak('Every little step is a new adventure.', 'preview')}><Icon name={speaking === 'preview' ? 'stop' : 'speaker'}/>{speaking === 'preview' ? '재생 중지' : '목소리 들어 보기'}</button></div>{error && <p className="speech-feedback" role="status">{error}</p>}</section>;
}
export function SpeechShortcut() {
  const { rate } = useSpeech();
  return <a className="speech-shortcut" href="#/settings" aria-label="음성 설정"><Icon name="speaker"/>{rate}×</a>;
}
export function SpeakButton({ text, id, label, className = 'word-audio' }: { text: string; id: string; label: string; className?: string }) {
  const { speak, stop, speaking } = useSpeech();
  const active = speaking === id;
  const ownsPlayback = useRef(active);
  ownsPlayback.current = active;
  useEffect(() => () => { if (ownsPlayback.current) stop(); }, [stop]);
  return <button className={`${className} ${active ? 'is-speaking' : ''}`} onClick={() => active ? stop() : speak(text, id)} aria-label={`${label} ${active ? '재생 중지' : '발음 듣기'}`} aria-pressed={active}><Icon name={active ? 'stop' : 'speaker'}/></button>;
}

export function ReadingSpeed() {
  const { rate, setRate } = useSpeech();
  return <div className="reading-speed"><span>읽기 속도</span><div className="speed-options" role="group" aria-label="읽기 속도">{([[0.75, '느리게'], [1, '보통'], [1.15, '빠르게']] as const).map(([value, label]) => <button key={value} onClick={() => setRate(value)} aria-pressed={rate === value}>{label}<small>{value}×</small></button>)}</div></div>;
}
