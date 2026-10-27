import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { cellKey, checkEntry, isPuzzleSolved, wordCells, type PlacedWord, type WordResult } from '../puzzle/engine';
import { enterLetters, eraseLetter } from '../puzzle/input';
import { applyHint } from '../puzzle/progress';
import { getStepStatus, useDayLearning } from '../state/learning';
import { readView, saveView } from '../state/viewState';
import { StarButton } from './StarButton';
import { Icon } from './Icon';
import './CrosswordGame.css';

export function CrosswordGame({ day = 1 }: { day?: number }) {
  const dayText = `DAY ${String(day).padStart(2, '0')}`;
  const { record, accessPolicy, puzzleStore, puzzleStorageError, createPuzzle, updatePuzzle, savePosition } = useDayLearning(day);
  const unlocked = getStepStatus(record, day, 'puzzle', accessPolicy) !== 'locked';
  const session = puzzleStore.active;
  const puzzle = session?.puzzle;
  const [selectedId, setSelectedId] = useState<string | null>(() => { const v = readView<{ puzzleId?: string; selectedId?: string }>(`puzzle-${day}`, {}); return v.puzzleId === puzzle?.id && puzzle?.entries.some(e => e.id === v.selectedId) ? v.selectedId! : null; });
  const [selectedCell, setSelectedCell] = useState<string | null>(() => { const v = readView<{ puzzleId?: string; selectedCell?: string }>(`puzzle-${day}`, {}); return v.puzzleId === puzzle?.id && typeof v.selectedCell === 'string' ? v.selectedCell : null; });
  const [keyboardMode, setKeyboardMode] = useState<'screen' | 'system'>(() => readView<string>('keyboard', 'screen') === 'system' ? 'system' : 'screen');
  const [clueDirection, setClueDirection] = useState<'across' | 'down'>(() => { const v = readView<{ selectedId?: string }>(`puzzle-${day}`, {}); return puzzle?.entries.find(e => e.id === v.selectedId)?.direction ?? 'across'; });
  const [results, setResults] = useState<Record<string, WordResult>>({});
  const [message, setMessage] = useState('');
  const [generationError, setGenerationError] = useState('');
  const [review, setReview] = useState(false);
  const attempted = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const compositionValue = useRef<string | null>(null);
  const deleteHandler = useRef(() => {});
  const entry = puzzle?.entries.find(item => item.id === selectedId) ?? puzzle?.entries[0];
  const positions = entry ? wordCells(entry) : [];
  const activeKey = selectedCell && positions.some(cell => cellKey(cell.row, cell.col) === selectedCell) ? selectedCell : positions[0] ? cellKey(positions[0].row, positions[0].col) : '';
  const activeIndex = Math.max(0, positions.findIndex(cell => cellKey(cell.row, cell.col) === activeKey));
  const isComplete = Boolean(session?.completedAt);
  const selectedKeys = new Set(positions.map(cell => cellKey(cell.row, cell.col)));

  useEffect(() => { if (puzzle) saveView(`puzzle-${day}`, { puzzleId: puzzle.id, selectedId: entry?.id, selectedCell: activeKey }); }, [day, puzzle?.id, entry?.id, activeKey]);
  useEffect(() => { saveView('keyboard', keyboardMode); }, [keyboardMode]);

  function newGame() {
    try {
      createPuzzle(); setSelectedId(null); setSelectedCell(null); setResults({});
      setMessage('새 퍼즐로 다시 도전해요!');
      setGenerationError(''); setReview(false);
    } catch (error) { setGenerationError(error instanceof Error ? error.message : '퍼즐 생성에 실패했어요. 다시 시도해 주세요.'); }
  }

  useEffect(() => { if (unlocked) savePosition(day, 'crossword'); }, [day, unlocked]);

  useEffect(() => {
    if (unlocked && !session && !attempted.current) { attempted.current = true; newGame(); }
  });

  useLayoutEffect(() => {
    if (document.activeElement === inputRef.current) inputRef.current?.select();
  }, [activeKey, session?.answers[activeKey]]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const beforeInput = (event: InputEvent) => {
      if (event.inputType === 'deleteContentBackward' && !event.isComposing) {
        event.preventDefault(); deleteHandler.current();
      }
    };
    input.addEventListener('beforeinput', beforeInput);
    const resize = () => {
      if (document.activeElement === input) editorRef.current?.scrollIntoView({ block: 'nearest' });
    };
    window.visualViewport?.addEventListener('resize', resize);
    return () => { input.removeEventListener('beforeinput', beforeInput); window.visualViewport?.removeEventListener('resize', resize); };
  }, [puzzle?.id, review, isComplete]);

  function focusInput() { inputRef.current?.focus({ preventScroll: true }); inputRef.current?.select(); }
  function chooseWord(word: PlacedWord, key?: string) {
    const cells = wordCells(word);
    const firstEmpty = cells.find(cell => !session?.answers[cellKey(cell.row, cell.col)]) ?? cells[0];
    setSelectedId(word.id); setClueDirection(word.direction); setSelectedCell(key ?? cellKey(firstEmpty.row, firstEmpty.col));
    focusInput();
  }
  function chooseCell(row: number, col: number) {
    if (!puzzle) return;
    const key = cellKey(row, col);
    const owners = puzzle.entries.filter(word => wordCells(word).some(c => c.row === row && c.col === col));
    const other = key === activeKey && owners.length > 1 ? owners.find(word => word.id !== entry?.id) : undefined;
    const next = other ?? owners.find(word => word.direction === entry?.direction) ?? owners[0];
    if (next) chooseWord(next, key);
  }
  function clearAffectedFeedback(changedKeys: string[]) {
    if (!puzzle) return;
    const affected = puzzle.entries.filter(word => wordCells(word).some(c => changedKeys.includes(cellKey(c.row, c.col))));
    setResults(current => Object.fromEntries(Object.entries(current).filter(([id]) => !affected.some(word => word.id === id))));
    setMessage('');
  }
  function acceptText(text: string) {
    if (!entry || !session || isComplete || !/[a-zＡ-Ｚａ-ｚ]/i.test(text)) return;
    const next = enterLetters(entry, activeIndex, text, session.answers);
    clearAffectedFeedback(Object.keys(next.answers).filter(key => next.answers[key] !== session.answers[key]));
    updatePuzzle({ ...session, answers: next.answers });
    const nextCell = positions[next.index]; setSelectedCell(cellKey(nextCell.row, nextCell.col));
  }
  function backspace() {
    if (!entry || !session || isComplete) return;
    const next = eraseLetter(entry, activeIndex, session.answers);
    clearAffectedFeedback(Object.keys(session.answers).filter(key => session.answers[key] !== next.answers[key]));
    updatePuzzle({ ...session, answers: next.answers });
    const nextCell = positions[next.index]; setSelectedCell(cellKey(nextCell.row, nextCell.col));
  }
  deleteHandler.current = backspace;
  function changeDirection() {
    if (!puzzle || !entry) return;
    const other = puzzle.entries.find(word => word.direction !== entry.direction && wordCells(word).some(c => cellKey(c.row, c.col) === activeKey));
    const next = other ?? puzzle.entries.find(word => word.direction !== entry.direction);
    if (next) chooseWord(next, other ? activeKey : undefined);
  }
  function grade(all: boolean) {
    if (!session || !entry || isComplete) return;
    const graded = all ? session.puzzle.entries : [entry];
    const scores = Object.fromEntries(graded.map(word => [word.id, checkEntry(word, session.answers)]));
    setResults(current => ({ ...current, ...scores }));
    const wrong = graded.filter(word => scores[word.id] === 'wrong').map(word => word.id);
    const next = { ...session, wrongWordIds: [...new Set([...session.wrongWordIds, ...wrong])] };
    updatePuzzle(next, true);
    if (isPuzzleSolved(session.puzzle, session.answers)) { inputRef.current?.blur(); window.scrollTo(0, 0); }
    else {
      const correct = Object.values(scores).filter(score => score === 'correct').length;
      setMessage(all ? `${correct}/${graded.length}개 정답이에요. 빨간 단어와 빈칸을 수정해 주세요.` : scores[entry.id] === 'correct' ? '맞았어요! 다음 단어에도 도전해 볼까요?' : scores[entry.id] === 'empty' ? '아직 빈 단어예요. 알파벳을 입력해 주세요.' : '다시 생각해 볼까요? 입력한 글자를 고칠 수 있어요.');
    }
  }
  function hint() {
    if (!session || !entry || isComplete) return;
    const level = session.hintLevels[entry.id] ?? 0;
    if (level >= 2) return;
    const next = applyHint(session, entry.id);
    if (level === 1) {
      const key = next.letterHints[entry.id];
      setSelectedCell(key); clearAffectedFeedback([key]);
      setMessage('노란 표시가 있는 칸에 알파벳 한 글자를 공개했어요.');
    } else setMessage('한글 뜻을 힌트로 열었어요.');
    updatePuzzle(next);
  }

  if (!unlocked) return <section className="puzzle-locked"><span className="detail-badge"><Icon name="lock"/></span><h1>퍼즐 모험을 열어 볼까요?</h1><p>{dayText} 예문 8개 세트를 모두 완료하면<br/>가로세로 퍼즐이 열려요.</p><a className="primary-button" href={`#/learn/day/${day}`}>예문 학습하러 가기<Icon name="arrow"/></a></section>;
  if (!session || !puzzle || !entry) return <section className="puzzle-locked"><Icon name="puzzle"/><h1>{generationError ? '퍼즐을 다시 준비해 볼까요?' : '단어들을 연결하고 있어요'}</h1><p role="status">{generationError || '교차가 잘 맞는 조합을 찾는 중이에요.'}</p>{generationError && <button className="primary-button" onClick={newGame}>다시 생성하기</button>}</section>;
  if (isComplete && !review) return <section className="puzzle-celebration"><img src="/gecko-mascot.jpg" alt="단어책을 들고 축하하는 레오" width="200" height="200"/><span className="soon-label">{dayText} 모험 완료</span><h1>모든 단어를 연결했어요!</h1><p>{puzzle.entries.length}개 단어를 멋지게 완성했어요.<br/>레오와 한 걸음 더 성장했어요.</p><div className="puzzle-completion-stats"><span>힌트 <strong>{session.hintCount}회</strong></span><span>다시 도전한 단어 <strong>{session.wrongWordIds.length}개</strong></span><span>{new Date(session.completedAt!).toLocaleDateString('ko-KR')}</span></div>{session.wrongWordIds.length > 0 && <p className="puzzle-review-words">다시 기억해요: {puzzle.entries.filter(word => session.wrongWordIds.includes(word.id)).map(word => word.word.toLowerCase()).join(', ')}</p>}{generationError && <p className="storage-feedback" role="alert">{generationError}</p>}{puzzleStorageError && <p className="storage-feedback" role="alert">완료 기록을 저장하지 못했어요. 아래 버튼으로 다시 저장해 주세요.</p>}{puzzleStorageError && <button className="primary-button" onClick={() => updatePuzzle(session, true)}>완료 기록 다시 저장</button>}<button className="primary-button" onClick={newGame}>새 퍼즐로 다시 풀기<Icon name="puzzle"/></button><button className="puzzle-secondary" onClick={() => setReview(true)}>완성한 퍼즐 돌아보기</button><a className="puzzle-secondary" href="#/map">학습 지도에서 완료 별 보기<Icon name="star"/></a><p className="puzzle-history-note">지금까지 완료한 퍼즐 {puzzleStore.completions.length}개</p></section>;

  const hintLevel = session.hintLevels[entry.id] ?? 0;
  const directionLabel = entry.direction === 'across' ? '가로' : '세로';
  const starts = new Map(puzzle.entries.map(word => [cellKey(word.row, word.col), word.number]));
  const hintedKeys = new Set(Object.values(session.letterHints));
  return <section className="crossword-page">
    <div className="puzzle-topline"><a className="back-link" href={`#/day/${day}`}><Icon name="back"/>{dayText}</a><button className="puzzle-new" onClick={newGame}>새 퍼즐<Icon name="puzzle"/></button></div>
    <div className="puzzle-heading"><div><span className="section-kicker">WORD CONNECTION · {dayText}</span><h1>단어를 잇는 작은 모험</h1><p>{puzzle.entries.length}개 단어 · 가로와 세로를 연결해요</p></div><img src="/gecko-mascot.jpg" alt="퍼즐을 응원하는 레오" width="54" height="54"/></div>
    <div className="puzzle-layout"><div className="puzzle-board-panel">    <p className="puzzle-instruction">칸을 누르고 영어로 입력해요. 교차 칸을 다시 누르면 방향이 바뀌어요.</p>
    <div className="puzzle-board"><table aria-label={`${dayText} 영어 가로세로 퍼즐`} className="puzzle-grid"><tbody>{puzzle.cells.map((row, r) => <tr key={r}>{row.map((letter, c) => {
      const key = cellKey(r, c), number = starts.get(key);
      const owners = puzzle.entries.filter(word => wordCells(word).some(cell => cell.row === r && cell.col === c));
      const feedback = owners.some(word => results[word.id] === 'wrong') ? 'wrong' : owners.some(word => results[word.id] === 'correct') ? 'correct' : '';
      return <td key={c} className={letter ? '' : 'puzzle-block'}>{letter && <button className={`puzzle-cell ${selectedKeys.has(key) ? 'in-word' : ''} ${activeKey === key ? 'current' : ''} ${feedback} ${hintedKeys.has(key) ? 'hint-given' : ''}`} data-cell={key} onClick={() => chooseCell(r, c)} aria-label={`${r + 1}행 ${c + 1}열${number ? `, ${number}번 시작` : ''}, ${session.answers[key] || '빈칸'}${hintedKeys.has(key) ? ', 힌트 글자' : ''}`} aria-pressed={activeKey === key}>{number && <small>{number}</small>}<span>{session.answers[key]}</span></button>}</td>;
    })}</tr>)}</tbody></table></div>
    <div className="puzzle-legend"><span>오렌지: 선택 단어</span><span>노랑: 정답</span><span>분홍: 다시 도전</span></div>
    </div><div className="puzzle-control-panel">    <div className="puzzle-editor" ref={editorRef}>
      <div className="current-clue-heading"><strong>{entry.number} {directionLabel}<small> · {entry.word.length}글자</small></strong><StarButton id={entry.id}/><button onClick={changeDirection} aria-label="가로 세로 방향 전환">방향 전환<Icon name="arrow"/></button></div>
      <p className="current-clue" lang="en">{entry.clue}</p>
      {hintLevel >= 1 && <p className="current-meaning">뜻 힌트: {entry.meaning}</p>}
      <div className="cell-editor-row"><label><span>{activeIndex + 1}/{entry.word.length}번째 칸</span><input ref={inputRef} className="cell-input" type="text" inputMode={keyboardMode === 'screen' ? 'none' : 'text'} lang="en" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="next" readOnly={isComplete} value={session.answers[activeKey] ?? ''} aria-label={`${entry.number} ${directionLabel} 단어의 ${activeIndex + 1}번째 알파벳 입력`} onFocus={event => event.currentTarget.select()} onChange={event => {
        if (composing.current || (event.nativeEvent as InputEvent).isComposing) return;
        if (compositionValue.current === event.currentTarget.value) { compositionValue.current = null; return; }
        const value = event.currentTarget.value;
        const native = event.nativeEvent as InputEvent;
        if (!value) backspace();
        else if (native.inputType === 'insertText' && native.data) acceptText(native.data);
        else acceptText(value);
      }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={event => {
        composing.current = false; compositionValue.current = event.currentTarget.value;
        acceptText(event.currentTarget.value); queueMicrotask(() => { compositionValue.current = null; });
      }} onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Backspace') { event.preventDefault(); backspace(); }
        if (event.key === 'Enter') { event.preventDefault(); grade(false); }
        if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
          event.preventDefault(); const index = Math.max(0, Math.min(positions.length - 1, activeIndex + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1)));
          setSelectedCell(cellKey(positions[index].row, positions[index].col));
        }
      }}/></label><span className="word-pattern" aria-hidden="true">{positions.map(cell => session.answers[cellKey(cell.row, cell.col)] || '·').join(' ')}</span><button className="puzzle-word-check" onClick={() => grade(false)} disabled={isComplete}>단어 확인</button></div>
    </div>
    <div className="puzzle-keyboard-bar"><span>알파벳 입력</span><button className="keyboard-mode" onClick={() => { flushSync(() => setKeyboardMode(keyboardMode === 'screen' ? 'system' : 'screen')); inputRef.current?.blur(); focusInput(); }}>{keyboardMode === 'screen' ? '기기 키보드 쓰기' : '화면 키보드 쓰기'}</button></div>
    {keyboardMode === 'screen' && <div className="english-keyboard" role="group" aria-label="영어 화면 키보드">{['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, i) => <div className="key-row" key={row}>{row.split('').map(letter => <button key={letter} data-letter={letter} aria-label={`알파벳 ${letter}`} disabled={isComplete} onPointerDown={e => e.preventDefault()} onClick={() => { acceptText(letter); focusInput(); }}>{letter}</button>)}{i === 2 && <button className="key-delete" aria-label="한 글자 지우기" onPointerDown={e => e.preventDefault()} onClick={() => { backspace(); focusInput(); }} disabled={isComplete}>⌫</button>}</div>)}</div>}
    <div className="puzzle-actions"><button onClick={hint} disabled={hintLevel >= 2 || isComplete}><Icon name="leaf"/>{hintLevel === 0 ? '1단계 · 뜻 힌트' : hintLevel === 1 ? '2단계 · 한 글자' : '힌트 사용 완료'}</button><button className="primary-button" onClick={() => grade(true)} disabled={isComplete}><Icon name="check"/>전체 채점</button></div>
    <p className="puzzle-message" role="status">{message || `사용한 힌트 ${session.hintCount}회 · 틀린 단어 ${session.wrongWordIds.length}개 기록`}</p>
    {generationError && <p className="storage-feedback" role="alert">{generationError}</p>}
    {puzzleStorageError && <div className="storage-feedback" role="alert">기록을 저장하지 못했어요. 다시 시도해 주세요.<button className="puzzle-secondary" onClick={() => updatePuzzle(session, isComplete)}>기록 저장 다시 시도</button></div>}
    <div className="clue-direction-tabs" role="group" aria-label="힌트 방향"><button aria-pressed={clueDirection === 'across'} onClick={() => setClueDirection('across')}>가로 힌트</button><button aria-pressed={clueDirection === 'down'} onClick={() => setClueDirection('down')}>세로 힌트</button></div>
    <div className="puzzle-clue-lists">{(['across', 'down'] as const).map(direction => <section key={direction} hidden={clueDirection !== direction}><h2>{direction === 'across' ? '가로 힌트' : '세로 힌트'}</h2><ol>{puzzle.entries.filter(word => word.direction === direction).map(word => <li key={word.id}><button className={entry.id === word.id ? 'selected' : ''} onClick={() => chooseWord(word)} aria-pressed={entry.id === word.id}><strong>{word.number}</strong><span lang="en">{word.clue}<small>{word.word.length} letters{results[word.id] === 'correct' ? ' · 정답' : results[word.id] === 'wrong' ? ' · 다시 도전' : ''}</small></span></button></li>)}</ol></section>)}</div>
    {isComplete && <button className="primary-button" onClick={() => setReview(false)}>축하 화면으로 돌아가기<Icon name="star"/></button>}
    </div></div>
  </section>;
}
