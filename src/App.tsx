import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './components/Icon';
import { Scenery } from './components/Scenery';
import { getDayVocabularySummary } from './data/vocabulary';
import { SentenceLesson } from './components/SentenceLesson';
import { CrosswordGame } from './components/CrosswordGame';
import { DAYS, STEPS, STEP_LABELS, dayLabel, getDayProgress, getStepStatus, useLearning, type Step } from './state/learning';

type Tab = 'map' | 'words' | 'puzzles' | 'records';
type Route = { page: Tab } | { page: 'day'; day: number } | { page: 'sentences' } | { page: 'crossword' };
const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'map', label: '학습 지도', icon: 'map' }, { id: 'words', label: '단어장', icon: 'book' },
  { id: 'puzzles', label: '퍼즐', icon: 'puzzle' }, { id: 'records', label: '학습 기록', icon: 'chart' },
];
function readRoute(): Route {
  if (location.hash === '#/learn/day/1') return { page: 'sentences' };
  if (location.hash === '#/puzzle/day/1') return { page: 'crossword' };
  const match = location.hash.match(/^#\/day\/(\d{1,2})$/);
  if (match && +match[1] >= 1 && +match[1] <= 50) return { page: 'day', day: +match[1] };
  const tab = location.hash.replace('#/', '') as Tab;
  return { page: tabs.some(item => item.id === tab) ? tab : 'map' };
}
const go = (path: string) => { location.hash = `/${path}`; };

function StatusBar() {
  const { record } = useLearning();
  return <header className="header">
    <a className="brand" href="#/map" aria-label="Word Master Adventure 학습 지도"><span className="brand-mark"><Icon name="leaf" /></span><span>WORD MASTER<small>ADVENTURE</small></span></a>
    <span className="edition">2000<span>단어의 작은 모험</span></span>
    <div className="status-bar" aria-label="학습 현황, 임시 데이터">
      <div className="stat"><Icon name="star" /><strong>{record.totalXp}</strong><span>XP</span></div>
      <div className="stat"><Icon name="flame" /><strong>{record.streakDays}</strong><span>일 연속</span></div>
      <div className="stat"><Icon name="book" /><strong>{dayLabel(record.currentDay)}</strong></div>
    </div>
  </header>;
}

function LearningMap() {
  const { record, accessPolicy } = useLearning();
  const completedDays = DAYS.filter(day => getDayProgress(record, day) === 2).length;
  return <>
    <section className="hero" aria-label="레오의 인사">
      <div className="hero-copy"><span className="eyebrow">작은 한 걸음, 커다란 모험</span><h1>단어가 쌓이면,<br/>세상이 넓어져요.</h1><div className="speech">오늘도 단어 모험을<br/>떠나볼까?</div><span className="mascot-name">너의 모험 친구, 레오</span></div>
      <img className="mascot" src="/gecko-mascot.jpg" alt="초록색 단어책을 안고 인사하는 주황색 레오파드게코 레오" width="180" height="180" fetchPriority="high"/>
      <span className="hero-spark spark-one"/><span className="hero-spark spark-two"/>
    </section>
    <section className="journey-summary" aria-label="전체 학습 진행률">
      <div><span className="section-kicker">MY ADVENTURE</span><h2>나의 단어 탐험</h2></div>
      <span className="day-count"><strong>{completedDays}</strong> / 50 DAY</span>
      <div className="progress-track" role="progressbar" aria-label="완료한 DAY" aria-valuenow={completedDays} aria-valuemin={0} aria-valuemax={50}><span style={{ width: `${completedDays * 2}%` }}/></div>
      <p>예문으로 만나고, 퍼즐로 기억해요.</p><span className="summary-dot"/>
    </section>
    <div className="map-heading"><span><span className="live-dot"/> 모험의 시작</span><span>하루에 하나씩, 차근차근</span></div>
    <section className="learning-map" aria-label="DAY 01부터 DAY 50까지 학습 지도">
      {DAYS.map((day, index) => {
        const firstX = index % 2 === 0 ? 108 : 232;
        const secondX = index % 2 === 0 ? 232 : 108;
        const dayLocked = STEPS.every(step => getStepStatus(record, day, step, accessPolicy) === 'locked');
        const vocabulary = getDayVocabularySummary(day);
        return <section className={`day-section ${dayLocked ? 'day-locked' : ''}`} key={day} aria-label={dayLabel(day)}>
          <button className="day-heading" onClick={() => go(`day/${day}`)}><span className="day-line"/><span className="day-pill">{dayLocked ? <Icon name="lock"/> : <Icon name="leaf"/>}{dayLabel(day)}<span className="day-data-status" title={vocabulary.hasData ? `영어 ${vocabulary.wordCount}개 · 새로 작성한 학습용 뜻 ${vocabulary.authoredMeaningCount}개 · 교재 뜻은 원본 미수록` : '아직 단어 데이터가 등록되지 않았어요'} aria-label={vocabulary.hasData ? `${vocabulary.wordCount}개 단어 등록, 학습용 뜻 ${vocabulary.authoredMeaningCount}개, 뜻 미등록 ${vocabulary.missingMeaningCount}개` : '단어 데이터 준비 중'}>{vocabulary.hasData ? `${vocabulary.wordCount}개 단어` : '준비 중'}</span></span><span className="day-line"/></button>
          <div className="day-path">
            <svg className="path-svg" viewBox="0 0 340 235" preserveAspectRatio="none" aria-hidden="true"><path d={`M ${firstX} 53 C ${firstX} 113, ${secondX} 93, ${secondX} 158`} fill="none" stroke="#e3e5d9" strokeWidth="14" strokeLinecap="round"/><path d={`M ${firstX} 53 C ${firstX} 113, ${secondX} 93, ${secondX} 158`} fill="none" stroke="#faf9f1" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round"/></svg>
            <Scenery variant={index}/>
            {STEPS.map((step, stepIndex) => {
              const status = getStepStatus(record, day, step, accessPolicy);
              return <div key={step} className={`node-position node-position-${stepIndex}`} style={{ left: `${(stepIndex === 0 ? firstX : secondX) / 340 * 100}%` }}>
                {status === 'available' && <span className="start-bubble">여기서 시작!<span/></span>}
                <button className={`learning-node ${status}`} onClick={() => go(day === 1 && status !== 'locked' ? step === 'sentences' ? 'learn/day/1' : 'puzzle/day/1' : `day/${day}`)} aria-label={`${dayLabel(day)} ${STEP_LABELS[step]}, ${status === 'locked' ? '잠김' : status === 'completed' ? '완료, 다시 학습' : '학습 가능'}`}>
                  <Icon name={status === 'locked' ? 'lock' : 'star'}/>{status === 'completed' && <span className="completed-check"><Icon name="check"/></span>}
                </button>
                <span className="node-label">{STEP_LABELS[step]}</span>
              </div>;
            })}
            {index === 0 && <span className="path-caption">첫 단어를 만나러 가요</span>}
          </div>
        </section>;
      })}
      <div className="finish-marker"><span><Icon name="flag"/></span><h3>50일 뒤, 더 넓어진 세상</h3><p>작은 모험이 큰 자신감이 될 거예요.</p></div>
    </section>
  </>;
}

function DayDetail({ day, onNotice }: { day: number; onNotice: (message: string) => void }) {
  const { record, accessPolicy } = useLearning();
  const done = getDayProgress(record, day);
  const locked = STEPS.every(step => getStepStatus(record, day, step, accessPolicy) === 'locked');
  const handleStep = (step: Step) => {
    const status = getStepStatus(record, day, step, accessPolicy);
    if (day === 1 && step === 'sentences' && status !== 'locked') { go('learn/day/1'); return; }
    if (day === 1 && step === 'puzzle' && status !== 'locked') { go('puzzle/day/1'); return; }
    if (status === 'locked') {
      onNotice(step === 'puzzle' ? day === 1 ? 'DAY 01 예문 8개 세트를 모두 완료하면 퍼즐이 열려요!' : '이 DAY의 퍼즐은 아직 준비 중이에요.' : '이 DAY의 예문 콘텐츠는 아직 준비 중이에요. 지금은 DAY 01 예문을 학습할 수 있어요.');
    } else onNotice('다음 업데이트에서 학습할 수 있어요!');
  };
  return <div className="detail-page">
    <a className="back-link" href="#/map"><Icon name="back"/>학습 지도로</a>
    <div className="detail-banner"><span className="detail-badge"><Icon name={locked ? 'lock' : 'leaf'}/></span><span className="section-kicker">오늘의 단어 모험</span><h1>{dayLabel(day)}</h1><p>{locked ? '다음 모험이 여기서 기다리고 있어요.' : '첫 단어와 만날 준비가 되었나요?'}</p></div>
    {locked && <div className="lock-notice"><Icon name="lock"/><p>아직 잠겨 있는 DAY예요.<br/><span>예문 콘텐츠를 준비 중이에요. DAY 01부터 만나 보세요.</span></p></div>}
    <section className="detail-progress"><div><h2>학습 진행률</h2><strong>{done / 2 * 100}%</strong></div><div className="progress-track" role="progressbar" aria-label={`${dayLabel(day)} 학습 진행률`} aria-valuenow={done * 50} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${done * 50}%` }}/></div><p>{done} / 2 단계 완료</p></section>
    <div className="lesson-cards">{STEPS.map((step, index) => {
      const status = getStepStatus(record, day, step, accessPolicy);
      return <button className={`lesson-card ${status}`} key={step} onClick={() => handleStep(step)}><span className={`lesson-icon lesson-icon-${step}`}><Icon name={step === 'sentences' ? 'book' : 'puzzle'}/></span><span className="lesson-copy"><small>STEP 0{index + 1} · {status === 'locked' ? '잠김' : status === 'completed' ? '완료' : '학습 가능'}</small><strong>{STEP_LABELS[step]}</strong><span>{step === 'sentences' ? '문장 속에서 단어를 만나요' : '퍼즐로 한 번 더 기억해요'}</span></span><Icon name={status === 'locked' ? 'lock' : status === 'completed' ? 'check' : 'arrow'}/></button>;
    })}</div>
    <p className="detail-footnote">조금씩, 꾸준히. 레오가 함께할게요.</p>
  </div>;
}

function ComingSoon({ page }: { page: Exclude<Tab, 'map'> }) {
  const content = {
    words: { icon: 'book' as const, title: '나만의 작은 단어장', description: '모험에서 만난 단어들이\n이곳에 차곡차곡 모일 거예요.', color: 'blue' },
    puzzles: { icon: 'puzzle' as const, title: '생각이 자라는 퍼즐', description: '배운 단어를 가로세로 연결하는\n즐거운 퍼즐을 준비하고 있어요.', color: 'pink' },
    records: { icon: 'chart' as const, title: '매일 조금씩 자라는 나', description: '꾸준히 걸어온 모험의 발자국을\n이곳에서 돌아볼 수 있어요.', color: 'yellow' },
  }[page];
  return <section className={`coming-soon ${content.color}`}><span className="section-kicker">YOUR NEXT ADVENTURE</span><div className="coming-art"><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><Icon name={content.icon}/><span className="art-star"><Icon name="star"/></span><Scenery/></div><span className="soon-label">열심히 준비 중이에요</span><h1>{content.title}</h1><p>{content.description}</p><div className="coming-note">다음 업데이트에서 만나요!</div><a className="primary-button" href="#/map">학습 지도로 돌아가기<Icon name="arrow"/></a></section>;
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, []);
  return <dialog ref={dialogRef} className="notice-dialog" aria-labelledby="notice-title" aria-describedby="notice-message" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="notice-content"><span className="notice-icon"><Icon name="leaf"/></span><h2 id="notice-title">모험을 준비하고 있어요</h2><p id="notice-message">{message}</p><button className="primary-button" onClick={onClose} autoFocus>좋아요, 기다릴게요<Icon name="check"/></button></div></dialog>;
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [notice, setNotice] = useState<string | null>(null);
  const mapScroll = useRef(0);
  const routeRef = useRef(route);
  useEffect(() => {
    const handler = () => {
      if (routeRef.current.page === 'map') mapScroll.current = window.scrollY;
      const nextRoute = readRoute();
      routeRef.current = nextRoute;
      setRoute(nextRoute); setNotice(null);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  useLayoutEffect(() => { window.scrollTo(0, route.page === 'map' ? mapScroll.current : 0); }, [route]);
  const activeTab = route.page === 'day' || route.page === 'sentences' ? 'map' : route.page === 'crossword' ? 'puzzles' : route.page;
  return <div className={`app-shell ${route.page === 'sentences' || route.page === 'crossword' || route.page === 'puzzles' ? 'lesson-mode' : ''}`}><a className="skip-link" href="#main-content">본문으로 건너뛰기</a><StatusBar/><main id="main-content" key={route.page === 'day' ? `day-${route.day}` : route.page}>
    {route.page === 'map' ? <LearningMap/> : route.page === 'day' ? <DayDetail day={route.day} onNotice={setNotice}/> : route.page === 'sentences' ? <SentenceLesson/> : route.page === 'crossword' || route.page === 'puzzles' ? <CrosswordGame/> : <ComingSoon page={route.page}/>}
  </main><nav className="bottom-nav" aria-label="메인 메뉴">{tabs.map(tab => <a href={`#/${tab.id}`} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} key={tab.id} aria-current={activeTab === tab.id ? 'page' : undefined}><span><Icon name={tab.icon}/></span>{tab.label}</a>)}</nav>{notice && <Notice message={notice} onClose={() => setNotice(null)}/>}</div>;
}
