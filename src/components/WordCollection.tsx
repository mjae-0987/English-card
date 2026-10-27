import { useState } from 'react';
import { allVocabulary, type VocabularyEntry } from '../data/vocabulary';
import { getWordLesson } from '../data/lessons';
import { dayLabel, getDayProgress, useLearning } from '../state/learning';
import { useSpeech } from '../hooks/useSpeech';
import { Icon } from './Icon';
import { SpeakButton, SpeechShortcut } from './SpeechControls';
import { StarButton } from './StarButton';
type Mode = 'words' | 'stars' | 'review';
function WordCard({ word }: { word: VocabularyEntry }) {
  const { collection, recordReview } = useLearning();
  const [quiz, setQuiz] = useState(false);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [example, setExample] = useState(false);
  const { stop } = useSpeech();
  const lesson = getWordLesson(word.id);
  const successes = collection.reviews.filter(e => e.wordId === word.id && e.correct).length;
  function start() { stop(); setQuiz(true); setAnswer(''); setResult(null); setExample(false); }
  return <article className="collection-card" data-word-id={word.id}>
    <div className="collection-card-heading"><span className="section-kicker">{dayLabel(word.day)} · {String(word.order).padStart(2, '0')}</span><StarButton id={word.id} word={word.word}/></div>
    {quiz ? <form onSubmit={e => { e.preventDefault(); if (!answer.trim()) return; const correct = answer.normalize('NFKC').trim().toLowerCase() === word.word.toLowerCase(); recordReview(word.id, correct); setResult(correct); }}>
      <h2>{word.meaning}</h2><label className="review-label">영어로 써 볼까요?<input aria-label={`${word.meaning} 영어 철자`} value={answer} onChange={e => { setAnswer(e.target.value); setResult(null); }} type="text" lang="en" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done" readOnly={result === true}/></label>
      <div className={`review-result ${result === false ? 'incorrect' : ''}`} role="status">{result === true ? `정답이에요! ${word.word}` : result === false ? '한 번 더 생각해 볼까요?' : '한글 뜻을 보고 철자를 입력해요.'}</div>
      {result === true ? <button type="button" className="primary-button" onClick={() => setQuiz(false)}><Icon name="check"/>단어로 돌아가기</button> : <button className="primary-button" type="submit" disabled={!answer.trim()}>정답 확인<Icon name="check"/></button>}
      <button type="button" className="puzzle-secondary" onClick={() => setQuiz(false)}>복습 닫기</button>
    </form> : <><div className="collection-word"><div><h2 lang="en">{word.word}</h2><p>{word.meaning}</p></div><SpeakButton text={word.word} id={`word-${word.id}`} label={word.word}/></div>
      <div className="collection-tools"><button onClick={() => setExample(v => !v)} aria-expanded={example}><Icon name="book"/>{example ? '예문 닫기' : '예문 보기'}</button><button onClick={start}><Icon name="puzzle"/>철자 복습</button></div>
      {example && lesson && <div className="collection-example"><p lang="en">{lesson.story}</p><SpeakButton text={lesson.story} id={`example-${word.id}`} label="예문 전체"/><p lang="ko">{lesson.translation}</p></div>}
      {successes > 0 && <p className="review-success"><Icon name="check"/>복습 성공 {successes}회</p>}
    </>}
  </article>;
}
export function WordCollection({ mode }: { mode: Mode }) {
  const { collection } = useLearning();
  const { error, stop } = useSpeech();
  const [day, setDay] = useState(0);
  const wrong = new Set(collection.mistakes.map(e => e.wordId));
  const words = allVocabulary.filter(w => (!day || w.day === day) && (mode === 'stars' ? collection.starredIds.includes(w.id) : mode === 'review' ? wrong.has(w.id) : true));
  const title = mode === 'stars' ? '다시 만나고 싶은 단어' : mode === 'review' ? '한 번 더, 더 단단하게' : '나의 작은 단어장';
  return <section className="collection-page"><div className="page-top"><div><span className="section-kicker">MY WORD COLLECTION</span><h1>{title}</h1></div><SpeechShortcut/></div>
    <div className="collection-tabs" aria-label="단어장 메뉴">{([['words', '전체 단어'], ['stars', '별표'], ['review', '오답 복습']] as const).map(([id, label]) => <a href={`#/${id}`} key={id} aria-current={mode === id ? 'page' : undefined}>{label}<span>{id === 'words' ? 200 : id === 'stars' ? collection.starredIds.length : wrong.size}</span></a>)}</div>
    <label className="day-filter">DAY<select value={day} onChange={e => { stop(); setDay(+e.target.value); }}><option value={0}>모든 DAY</option>{[1,2,3,4,5].map(d => <option value={d} key={d}>{dayLabel(d)}</option>)}</select><span>{words.length}개 단어</span></label>
    {error && <p className="speech-feedback" role="status">{error}</p>}
    {words.length ? <div className="collection-list">{words.map(w => <WordCard key={w.id} word={w}/>)}</div> : <div className="empty-card"><img src="/gecko-mascot.jpg" alt="단어책을 든 레오" width="140" height="140"/><h2>{mode === 'stars' ? '마음에 담을 단어를 찾아요' : mode === 'review' ? '틀린 단어가 없어요!' : '이 DAY에는 단어가 없어요'}</h2><p>{mode === 'stars' ? '단어 옆의 ☆를 눌러 모아 보세요.' : mode === 'review' ? '퍼즐에서 다시 도전할 단어를 여기 모아 둘게요.' : '다른 DAY를 골라 주세요.'}</p><a className="primary-button" href={mode === 'stars' ? '#/words' : '#/map'}>{mode === 'stars' ? '단어 둘러보기' : '학습 지도로'}</a></div>}
  </section>;
}
export function LearningRecords() {
  const { record, days, collection, lastPosition } = useLearning();
  const completed = [1,2,3,4,5].filter(d => getDayProgress(record,d) === 2).length;
  return <section className="records-page"><div className="page-top"><div><span className="section-kicker">MY ADVENTURE</span><h1>차곡차곡 쌓인 발자국</h1></div><a href="#/settings" className="speech-shortcut"><Icon name="speaker"/>설정</a></div><div className="record-summary"><img src="/gecko-mascot.jpg" alt="학습을 응원하는 레오" width="94" height="94"/><div><strong>{completed}<small> / 5 DAY</small></strong><p>오늘도 한 걸음 자랐어요.</p></div></div>
    {lastPosition && <a className="primary-button resume-button" href={`#/${lastPosition.page === 'sentences' ? 'learn' : 'puzzle'}/day/${lastPosition.day}`}>이어서 학습하기 · {dayLabel(lastPosition.day)}<Icon name="arrow"/></a>}
    <div className="record-links"><a href="#/review"><Icon name="puzzle"/>오답 복습<strong>{new Set(collection.mistakes.map(e => e.wordId)).size}</strong></a><a href="#/stars"><Icon name="star"/>별표 단어<strong>{collection.starredIds.length}</strong></a></div>
    <div className="record-list">{[1,2,3,4,5].map(d => <a href={`#/day/${d}`} key={d}><span><strong>{dayLabel(d)}</strong><small>예문 {days[d].sentences.completedSetIds.length}/8 · 퍼즐 {days[d].puzzle.completions.length}회 완료</small></span><Icon name={getDayProgress(record,d) === 2 ? 'check' : 'arrow'}/></a>)}</div>
    <div className="review-timeline"><h2>최근 복습</h2>{collection.reviews.length ? [...collection.reviews].reverse().slice(0,10).map((e,i) => <p key={i}><span>{allVocabulary.find(w => w.id === e.wordId)?.word}</span><strong>{e.correct ? '성공' : '다시 도전'}</strong><time>{new Date(e.at).toLocaleDateString('ko-KR')}</time></p>) : <p>단어장 속 철자 복습에 도전해 보세요.</p>}</div>
  </section>;
}
