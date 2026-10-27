import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import App from '../src/App';
import { ThemeProvider } from '../src/state/theme';
import { LearningProvider } from '../src/state/learning';
import { SpeechProvider } from '../src/hooks/SpeechProvider';
import { getDaySets } from '../src/data/lessons';
import { allVocabulary } from '../src/data/vocabulary';
import { getCrosswordWords } from '../src/puzzle/data';
import { generateCrossword } from '../src/puzzle/engine';
import { finishPuzzle, emptyPuzzleStore, newPuzzleSession } from '../src/puzzle/progress';
const storage = new Map<string,string>();
const local = {getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)};
Object.assign(globalThis, { window: { localStorage: local }, localStorage:local, location: { hash:'#/map' } });
const sk=(d:number)=>`word-master-adventure:day${String(d).padStart(2,'0')}-sentences:v1`;
const pk=(d:number)=>`word-master-adventure:day${String(d).padStart(2,'0')}-puzzle:v1`;
function render(hash:string){location.hash=hash;return renderToStaticMarkup(<LearningProvider><SpeechProvider><ThemeProvider><App/></ThemeProvider></SpeechProvider></LearningProvider>);}
let html=render('#/map');assert.equal((html.match(/class="learning-node /g)??[]).length,100);assert.equal((html.match(/class="day-heading"/g)??[]).length,50);assert.equal((html.match(/learning-node available/g)??[]).length,1);
assert.match(render('#/learn/day/2'),/이전 DAY의 퍼즐/);assert.match(render('#/puzzle/day/1'),/예문 8개 세트/);
let legacyPuzzle='';
for(let d=1;d<=5;d++){
  if(d>1)assert.match(render(`#/learn/day/${d}`),/이야기로 떠나는 모험/);
  for(let i=0;i<8;i++){
    local.setItem('word-master-adventure:position:v1',JSON.stringify({day:d,page:'sentences',setIndex:i,at:'2026-10-27T00:00:00Z'}));
    html=render(`#/learn/day/${d}`);const set=getDaySets(d)[i];assert.ok(html.includes(set.title));
    for(const id of set.wordIds){const word=allVocabulary.find(w=>w.id===id)!;assert.ok(html.includes(word.word));assert.ok(html.includes(word.meaning!));}
    assert.equal((html.match(/class="star-button /g)??[]).length,5);
    assert.doesNotMatch(html,/교재 원문|학습용으로 작성|브라우저는 음성 합성|localStorage에 저장/);
  }
  local.setItem(sk(d),JSON.stringify({version:1,completedSetIds:getDaySets(d).map(s=>s.id)}));
  const puzzle=generateCrossword(getCrosswordWords(d));const answers=Object.fromEntries(puzzle.cells.flatMap((row,r)=>row.flatMap((letter,c)=>letter?[[`${r},${c}`,letter]]:[])));
  const store=finishPuzzle(emptyPuzzleStore(),{...newPuzzleSession(puzzle),answers,wrongWordIds:[puzzle.entries[0].id]},'2026-10-24T09:00:00Z');
  local.setItem(pk(d),JSON.stringify(store));if(d===1)legacyPuzzle=JSON.stringify(store);
  assert.match(render(`#/puzzle/day/${d}`),/모든 단어를 연결했어요/);
}
assert.equal(local.getItem(pk(1)),legacyPuzzle);
assert.equal((render('#/map').match(/learning-node completed/g)??[]).length,10);
html=render('#/words');assert.equal((html.match(/class="collection-card"/g)??[]).length,200);
assert.ok((render('#/review').match(/class="collection-card"/g)??[]).length>=5);
local.setItem('word-master-adventure:collection:v1',JSON.stringify({version:1,starredIds:['day02-001'],mistakes:[],reviews:[]}));assert.equal((render('#/stars').match(/class="collection-card"/g)??[]).length,1);
assert.match(render('#/settings'),/읽기 속도/);assert.match(render('#/records'),/최근 복습/);assert.match(render('#/day/6'),/준비하고 있어요/);
console.log('PASS: component rendering for 40 lesson sets, 5 completions, 200 word cards, collection/records/settings, source notices removed, legacy key preservation. No browser layout/interaction/audio claims.');
