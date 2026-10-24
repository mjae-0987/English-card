import { useEffect, useRef, useState } from 'react';
import { day01MeaningNotes, day01Sets, day01Words, lessonContentNotice } from '../data/lessons';
import { isDay01SentencesComplete } from '../state/day01Progress';
import { useLearning } from '../state/learning';
import { useSpeech } from '../hooks/useSpeech';
import { Icon } from './Icon';
import './SentenceLesson.css';

export function SentenceLesson() {
  const { sentenceProgress, completeSet, storageError } = useLearning();
  const [setIndex, setSetIndex] = useState(() => {
    const next = day01Sets.findIndex(set => !sentenceProgress.completedSetIds.includes(set.id));
    return next < 0 ? 0 : next;
  });
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const storyScroll = useRef<HTMLDivElement>(null);
  const translationRef = useRef<HTMLParagraphElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { supported, speaking, error, speak, stop } = useSpeech();
  const set = day01Sets[setIndex];
  const words = set.wordIds.map(id => day01Words.find(word => word.id === id)!);
  const wordsByText = new Map(words.map(word => [word.word.toLowerCase(), word]));
  const selectedWord = words.find(word => word.id === selectedWordId);
  const selectedNote = selectedWord ? day01MeaningNotes.get(selectedWord.id) : undefined;
  const done = sentenceProgress.completedSetIds.includes(set.id);
  const allDone = isDay01SentencesComplete(sentenceProgress);
  const completedCount = sentenceProgress.completedSetIds.length;

  useEffect(() => {
    if (storyScroll.current) storyScroll.current.scrollTop = 0;
    if (detailsRef.current) detailsRef.current.open = false;
  }, [setIndex]);

  useEffect(() => {
    const scroll = storyScroll.current;
    const translation = translationRef.current;
    if (!scroll) return;
    if (showTranslation && translation) {
      scroll.scrollTop += translation.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 12;
    } else scroll.scrollTop = 0;
  }, [showTranslation]);

  function changeSet(index: number) {
    if (index < 0 || index >= day01Sets.length) return;
    stop();
    setSetIndex(index);
    setShowTranslation(false);
    setSelectedWordId(null);
  }

  return <section className="sentence-page" aria-label="DAY 01 예문 학습">
    <a className="back-link" href="#/day/1"><Icon name="back"/>DAY 01으로</a>
    <header className="sentence-heading">
      <div><span className="section-kicker">DAY 01 · 레오의 작은 독서 모임</span><h1 aria-live="polite">{set.title}</h1><p>SET {String(setIndex + 1).padStart(2, '0')} / 08 <span>· 단어 {setIndex * 5 + 1}–{setIndex * 5 + 5}</span></p></div>
      <img src="/gecko-mascot.jpg" width="66" height="66" alt="단어책을 든 모험 친구 레오"/>
    </header>
    <div className="set-navigation" role="group" aria-label="8개 학습 세트 선택">
      {day01Sets.map((item, index) => {
        const completed = sentenceProgress.completedSetIds.includes(item.id);
        return <button key={item.id} onClick={() => changeSet(index)} className={`set-dot ${index === setIndex ? 'current' : ''} ${completed ? 'done' : ''}`} aria-pressed={index === setIndex} aria-label={`세트 ${index + 1}: ${item.title}${completed ? ', 완료' : ', 미완료'}`}><span>{completed ? <Icon name="check"/> : index + 1}</span></button>;
      })}
    </div>
    <div className="sentence-progress"><span>완료한 세트 <strong>{completedCount} / 8</strong></span><div className="progress-track" role="progressbar" aria-label="DAY 01 예문 세트 완료" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={8}><span style={{ width: `${completedCount / 8 * 100}%` }}/></div></div>
    <article className="story-card">
      <div className="story-toolbar"><span><Icon name="book"/>이야기로 만나는 단어</span><button className="audio-button" onClick={() => speaking === 'story' ? stop() : speak(set.story, 'story')} aria-label={speaking === 'story' ? '이야기 읽기 중지' : '영어 이야기 전체 듣기'}><Icon name={speaking === 'story' ? 'stop' : 'speaker'}/>{speaking === 'story' ? '멈추기' : '전체 듣기'}</button></div>
      <div ref={storyScroll} className="story-scroll" tabIndex={0} role="region" aria-label="영어 이야기와 해석, 긴 내용은 스크롤하세요">
        <p className="english-story" lang="en">{set.story.split(/(\b[a-z]+\b)/gi).map((part, index) => {
          const word = wordsByText.get(part.toLowerCase());
          return word ? <button key={index} className={`story-word ${selectedWordId === word.id ? 'selected' : ''}`} onClick={() => setSelectedWordId(word.id)} aria-pressed={selectedWordId === word.id} aria-label={`${part}, 뜻 보기`}>{part}</button> : part;
        })}</p>
        <p ref={translationRef} className="story-translation" id="story-translation" lang="ko" hidden={!showTranslation}>{set.translation}</p>
      </div>
      <button className="translation-toggle" onClick={() => setShowTranslation(value => !value)} aria-expanded={showTranslation} aria-controls="story-translation">{showTranslation ? '한글 해석 숨기기' : '한글 해석 보기'}<Icon name={showTranslation ? 'close' : 'arrow'}/></button>
    </article>
    <div className="word-peek" aria-live="polite" aria-atomic="true">
      {selectedWord ? <><div><strong lang="en">{selectedWord.word}</strong><span>{selectedWord.meaning}</span></div><button className="word-audio" onClick={() => speaking === selectedWord.id ? stop() : speak(selectedWord.word, selectedWord.id)} aria-label={`${selectedWord.word} ${speaking === selectedWord.id ? '발음 중지' : '발음 듣기'}`}><Icon name={speaking === selectedWord.id ? 'stop' : 'speaker'}/></button>{selectedNote?.note && <p className="word-note">{selectedNote.note}</p>}</> : <p><Icon name="leaf"/>연두색 단어를 누르면 뜻이 나타나요.</p>}
    </div>
    {(!supported || error) && <p className="speech-feedback" role="status">{error || '이 브라우저는 음성 합성을 지원하지 않아요. 다른 브라우저에서 발음을 들어 주세요.'}</p>}
    <details className="set-word-list" ref={detailsRef}>
      <summary>이번 세트 단어 5개<span>뜻과 발음 보기</span></summary>
      <ul>{words.map(word => <li key={word.id} className={selectedWordId === word.id ? 'selected' : ''}><button className="word-definition" onClick={() => setSelectedWordId(word.id)} aria-pressed={selectedWordId === word.id}><strong lang="en">{word.word}</strong><span>{word.meaning}</span></button><button className="word-audio" onClick={() => speaking === word.id ? stop() : speak(word.word, word.id)} aria-label={`${word.word} ${speaking === word.id ? '발음 중지' : '발음 듣기'}`}><Icon name={speaking === word.id ? 'stop' : 'speaker'}/></button></li>)}</ul>
      <p className="word-list-note">단어를 다시 눌러 뜻을 확인하고, 스피커로 발음을 들어요.</p>
    </details>
    <p className="authored-notice">{lessonContentNotice}</p>
    {storageError && <p className="storage-feedback" role="alert">이 브라우저에서 기록을 저장하지 못했어요. 현재 화면에서는 학습을 이어갈 수 있지만, 새로고침하면 기록이 사라질 수 있어요. 저장 공간·사이트 저장 권한을 확인한 뒤 완료 버튼으로 다시 저장해 주세요.</p>}
    <div className="lesson-actions">
      <button className={`primary-button set-complete ${done ? 'is-complete' : ''}`} onClick={() => completeSet(set.id)} disabled={done && !storageError}><Icon name="check"/>{done ? storageError ? '완료 기록 다시 저장' : '이 세트 학습 완료!' : '이 세트 학습 완료하기'}</button>
      <div className="set-paging"><button onClick={() => changeSet(setIndex - 1)} disabled={setIndex === 0}><Icon name="back"/>이전 세트</button><span>{setIndex + 1} / 8</span><button onClick={() => changeSet(setIndex + 1)} disabled={setIndex === 7}>다음 세트<Icon name="arrow"/></button></div>
    </div>
    {allDone && <div className="sentence-complete" role="status"><span className="completion-star"><Icon name="star"/></span><h2>DAY 01 예문 모험 완료!</h2><p>40개 단어를 이야기 속에서 만났어요.<br/>언제든 돌아와 다시 읽을 수 있어요.</p><a href="#/map">학습 지도에서 확인하기<Icon name="arrow"/></a></div>}
  </section>;
}
