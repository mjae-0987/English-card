import { useEffect, useRef, useState } from 'react';
import { getDaySets } from '../data/lessons';
import { getDayVocabulary } from '../data/vocabulary';
import { StarButton } from './StarButton';
import { SpeechShortcut, ReadingSpeed, SpeakButton } from './SpeechControls';
import { getStepStatus, dayLabel, useDayLearning } from '../state/learning';
import { useSpeech } from '../hooks/useSpeech';
import { WordMeaningDialog } from './WordMeaningDialog';
import { readView, saveView } from '../state/viewState';
import { Icon } from './Icon';
import './SentenceLesson.css';

export function SentenceLesson({ day = 1 }: { day?: number }) {
  const daySets = getDaySets(day);
  const dayWords = getDayVocabulary(day);
  const { sentenceProgress, completeSet, storageError, record, accessPolicy, lastPosition, savePosition } = useDayLearning(day);
  const [setIndex, setSetIndex] = useState(() => {
    if (lastPosition?.day === day && lastPosition.page === 'sentences') return lastPosition.setIndex;
    const next = daySets.findIndex(set => !sentenceProgress.completedSetIds.includes(set.id));
    return next < 0 ? 0 : next;
  });
  const [showTranslation, setShowTranslation] = useState(() => Boolean(readView<{ translation?: boolean }>(`lesson-${day}-${setIndex}`, {}).translation));
  const [selectedWordId, setSelectedWordId] = useState<string | null>(() => { const id = readView<{ wordId?: string }>(`lesson-${day}-${setIndex}`, {}).wordId; return daySets[setIndex].wordIds.includes(id ?? '') ? id! : null; });
  const storyScroll = useRef<HTMLDivElement>(null);
  const translationRef = useRef<HTMLParagraphElement>(null);
  const { speaking, error, speak, stop, loading } = useSpeech();
  const set = daySets[setIndex];
  const words = set.wordIds.map(id => dayWords.find(word => word.id === id)!);
  const wordsByText = new Map(words.map(word => [word.word.toLowerCase(), word]));
  const selectedWord = words.find(word => word.id === selectedWordId);
  const done = sentenceProgress.completedSetIds.includes(set.id);
  const allDone = sentenceProgress.completedSetIds.length === 8;
  const completedCount = sentenceProgress.completedSetIds.length;

  useEffect(() => { if (getStepStatus(record, day, 'sentences', accessPolicy) !== 'locked') savePosition(day, 'sentences', setIndex); return () => stop(); }, [day, setIndex]);

  useEffect(() => {
    if (storyScroll.current) storyScroll.current.scrollTop = 0;
  }, [setIndex]);

  useEffect(() => {
    const scroll = storyScroll.current;
    const translation = translationRef.current;
    if (!scroll) return;
    if (showTranslation && translation) {
      scroll.scrollTop += translation.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 12;
    } else scroll.scrollTop = 0;
  }, [showTranslation]);

  useEffect(() => { saveView(`lesson-${day}-${setIndex}`, { wordId: selectedWordId, translation: showTranslation }); }, [day, setIndex, selectedWordId, showTranslation]);

  function changeSet(index: number) {
    if (index < 0 || index >= daySets.length) return;
    stop();
    setSetIndex(index);
    setShowTranslation(false);
    setSelectedWordId(null);
  }

  if (getStepStatus(record, day, 'sentences', accessPolicy) === 'locked') return <section className="puzzle-locked"><Icon name="lock"/><h1>{dayLabel(day)} 모험이 기다려요</h1><p>이전 DAY의 퍼즐을 완료하면 열려요.</p><a href="#/map" className="primary-button">학습 지도로</a></section>;
  return <section className="sentence-page" aria-label={`${dayLabel(day)} 예문 학습`}>
    <div className="lesson-overview">
      <div className="lesson-topline"><a className="back-link" href={`#/day/${day}`}><Icon name="back"/>{dayLabel(day)}</a><SpeechShortcut/></div>
      <header className="sentence-heading"><div><span className="section-kicker">이야기로 떠나는 모험</span><h1 aria-live="polite">{set.title}</h1><p>SET {String(setIndex + 1).padStart(2, '0')} / 08 · 단어 {setIndex * 5 + 1}–{setIndex * 5 + 5}</p></div><img src="/gecko-mascot.jpg" width="66" height="66" alt="단어책을 든 레오"/></header>
      <div className="set-navigation" role="group" aria-label="8개 학습 세트 선택">{daySets.map((item, index) => {
        const completed = sentenceProgress.completedSetIds.includes(item.id);
        return <button key={item.id} onClick={() => changeSet(index)} className={`set-dot ${index === setIndex ? 'current' : ''} ${completed ? 'done' : ''}`} aria-pressed={index === setIndex} aria-label={`세트 ${index + 1}: ${item.title}${completed ? ', 완료' : ', 미완료'}`}><span>{completed ? <Icon name="check"/> : index + 1}</span></button>;
      })}</div>
      <div className="sentence-progress"><span>완료 <strong>{completedCount} / 8</strong></span><div className="progress-track" role="progressbar" aria-label={`${dayLabel(day)} 예문 세트 완료`} aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={8}><span style={{ width: `${completedCount / 8 * 100}%` }}/></div></div>
    </div>
    <div className="lesson-columns">
      <div className="lesson-reading">
        <article className="story-card">
          <div className="story-toolbar"><span><Icon name="book"/>오늘의 이야기</span><button className={`audio-button ${speaking === 'story' ? 'is-speaking' : ''} ${speaking === 'story' && loading ? 'is-loading' : ''}`} aria-busy={speaking === 'story' && loading} onClick={() => speaking === 'story' ? stop() : speak(set.story, 'story')} aria-pressed={speaking === 'story'} aria-label={speaking === 'story' ? '전체 읽기 중지' : '영어 이야기 전체 읽기'}>{speaking === 'story' && loading ? <span className="audio-spinner" aria-hidden="true"/> : <Icon name={speaking === 'story' ? 'stop' : 'speaker'}/>} {speaking === 'story' ? loading ? '불러오는 중' : '중지' : '전체 읽기'}</button></div>
          <div ref={storyScroll} className="story-scroll" tabIndex={0} role="region" aria-label="영어 이야기와 해석">
            <p className="english-story" lang="en">{set.story.split(/(\b[a-z]+\b)/gi).map((part, index) => {
              const word = wordsByText.get(part.toLowerCase());
              return word ? <button key={index} className={`story-word ${selectedWordId === word.id ? 'selected' : ''}`} onClick={() => setSelectedWordId(word.id)} aria-haspopup="dialog" aria-label={`${part}, 뜻 보기`}>{part}</button> : part;
            })}</p>
            <p ref={translationRef} className="story-translation" id="story-translation" lang="ko" hidden={!showTranslation}>{set.translation}</p>
          </div>
          <button className="translation-toggle" onClick={() => setShowTranslation(value => !value)} aria-expanded={showTranslation} aria-controls="story-translation">{showTranslation ? '해석 숨기기' : '한글 해석 보기'}<Icon name={showTranslation ? 'close' : 'arrow'}/></button>
        </article>
        <ReadingSpeed/>
        {error && <p className="speech-feedback" role="status">{error}</p>}
        <div className="lesson-actions"><div className="set-paging"><button onClick={() => changeSet(setIndex - 1)} disabled={setIndex === 0}><Icon name="back"/>이전</button><span>{setIndex + 1} / 8</span><button onClick={() => changeSet(setIndex + 1)} disabled={setIndex === 7}>다음<Icon name="arrow"/></button></div><button className={`primary-button set-complete ${done ? 'is-complete' : ''}`} onClick={() => completeSet(set.id)} disabled={done && !storageError}><Icon name="check"/>{done ? storageError ? '기록 다시 저장' : '이 세트 완료!' : '학습 완료'}</button></div>
      </div>
      <aside className="lesson-word-panel" aria-label="이번 세트 단어">
        <section className="set-word-list"><h2>오늘의 단어 <span>5개</span></h2><ul>{words.map(word => <li key={word.id}><button className="word-definition" onClick={() => setSelectedWordId(word.id)} aria-haspopup="dialog"><strong lang="en">{word.word}</strong><span>{word.meaning}</span></button><SpeakButton text={word.word} id={word.id} label={word.word}/><StarButton id={word.id} word={word.word}/></li>)}</ul></section>
        <div className="lesson-friend"><img src="/gecko-mascot.jpg" alt="단어책을 안고 응원하는 레오" width="160" height="160"/><p>단어를 콕!<br/>이야기 속 뜻을 만나 봐요.</p></div>
      </aside>
    </div>
    {storageError && <p className="storage-feedback" role="alert">기록을 저장하지 못했어요. 완료 버튼을 다시 눌러 주세요.</p>}
    {allDone && <div className="sentence-complete" role="status"><span className="completion-star"><Icon name="star"/></span><h2>{dayLabel(day)} 예문 모험 완료!</h2><p>40개 단어를 이야기 속에서 만났어요.</p><a href={`#/puzzle/day/${day}`}>퍼즐에 도전하기<Icon name="arrow"/></a></div>}
    {selectedWord && <WordMeaningDialog word={selectedWord} story={set.story} translation={set.translation} onClose={() => setSelectedWordId(null)}/>}
  </section>;
}
