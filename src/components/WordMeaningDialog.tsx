import { useEffect, useRef } from 'react';
import type { VocabularyEntry } from '../data/vocabulary';
import { Icon } from './Icon';
import { SpeakButton } from './SpeechControls';
import { useSpeech } from '../hooks/useSpeech';
import { StarButton } from './StarButton';
export function WordMeaningDialog({ word, story, translation, onClose }: { word: VocabularyEntry; story: string; translation: string; onClose: () => void }) {
  const { speaking, speak, stop, error } = useSpeech();
  const key = `dialog-${word.id}`;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!; const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="word-dialog" aria-labelledby="word-dialog-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="word-dialog-content"><button className="dialog-close" aria-label="뜻 팝업 닫기" onClick={onClose}><Icon name="close"/></button><span className="section-kicker">발견한 단어</span><div className="dialog-word"><h2 id="word-dialog-title" lang="en">{word.word}</h2><SpeakButton text={word.word} id={`dialog-${word.id}`} label={word.word}/><StarButton id={word.id} word={word.word}/></div><p className="dialog-meaning">{word.meaning}</p><div className="dialog-example"><h3>이야기 속에서</h3><p lang="en">{story}</p><p lang="ko">{translation}</p></div><button className="primary-button dialog-pronounce" onClick={() => speaking === key ? stop() : speak(word.word, key)}><Icon name={speaking === key ? 'stop' : 'speaker'}/>{speaking === key ? '중지' : '이 단어 발음 듣기'}</button>{error && <p className="speech-feedback" role="status">{error}</p>}</div>
  </dialog>;
}
