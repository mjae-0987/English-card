import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.WMA_PLAYWRIGHT_PATH || 'playwright-core');
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..'),OUT=process.env.WMA_QA_DIR || join(tmpdir(), 'wma-browser-qa'),BASE='https://wma.test/';
mkdirSync(OUT, {recursive:true});
const report={checks:[],layouts:[],runtimeErrors:[],speech:{nativeVoices:[],audibleVerified:false},actualDevicesVerified:false};
const mark=s=>{report.checks.push(s);console.log('PASS',s);};
const sk=d=>`word-master-adventure:day${String(d).padStart(2,'0')}-sentences:v1`,pk=d=>`word-master-adventure:day${String(d).padStart(2,'0')}-puzzle:v1`,ck='word-master-adventure:collection:v1';
const browser=await chromium.launch({executablePath:process.env.WMA_CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
async function routes(ctx){await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='wma.test')return r.abort();const f=u.pathname==='/'?'index.html':u.pathname.slice(1);try{await r.fulfill({body:readFileSync(ROOT+'/dist/'+f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.jpg')?'image/jpeg':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.webmanifest')?'application/manifest+json':'text/html'});}catch{await r.fulfill({status:404,body:'missing'})}});}
await routes(context);
await context.addInitScript(()=>{
 window.__calls=[];window.__cancel=0;window.__active=null;window.__voices=[{voiceURI:'us',name:'Natural US',lang:'en-US'},{voiceURI:'gb',name:'English GB',lang:'en-GB'},{voiceURI:'ko',name:'Korean',lang:'ko-KR'}];
 window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 const synth=new EventTarget();Object.assign(synth,{speaking:false,pending:false,paused:false,getVoices(){return window.__voices},cancel(){window.__cancel++;const old=window.__active;window.__active=null;synth.speaking=false;setTimeout(()=>old?.onerror?.({error:'interrupted'}),0)},resume(){},speak(u){window.__calls.push({text:u.text,lang:u.lang,rate:u.rate,voice:u.voice?.voiceURI});window.__active=u;synth.speaking=true;u.onstart?.();}});
 Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true});window.__finish=()=>{const old=window.__active;window.__active=null;synth.speaking=false;old?.onend?.();};
});
const page=await context.newPage();page.on('pageerror',e=>report.runtimeErrors.push(e.message));
const go=async r=>{await page.goto(BASE+r,{waitUntil:'networkidle'});};
const read=key=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
try{
 await go('#/map');assert.equal(await page.locator('.learning-node').count(),100);assert.equal(await page.locator('.day-heading').count(),50);assert.ok(await page.locator('.mascot').evaluate(i=>i.complete&&i.naturalWidth>0));
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),'#FF7900');
 await page.getByRole('button',{name:/^DAY 01 예문 학습/}).click();await page.locator('.english-story').waitFor();
 const story=await page.locator('.english-story').innerText();await page.locator('.audio-button').click();let calls=await page.evaluate(()=>window.__calls);assert.equal(calls.length,1);assert.equal(calls[0].text,story);assert.equal(calls[0].rate,1);assert.equal(calls[0].lang,'en-US');
 assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'),'true');
 // Re-render from a translation toggle must not cancel the active story.
 const cancels=await page.evaluate(()=>window.__cancel);await page.locator('.translation-toggle').click();assert.equal(await page.evaluate(()=>window.__cancel),cancels);assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'),'true');
 await page.locator('.audio-button').click();assert.equal(await page.evaluate(()=>window.__active),null);await page.locator('.audio-button').click();await page.evaluate(()=>window.__finish());assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'),'false');await page.locator('.audio-button').click();
 await page.locator('.set-word-list .word-audio').first().click();assert.equal((await page.evaluate(()=>window.__calls)).at(-1).text,'provide');assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'),'false');
 for(let i=0;i<6;i++)await page.locator('.audio-button').click();await page.evaluate(()=>window.__finish());
 await page.locator('.speed-options button').first().click();await page.locator('.audio-button').click();assert.equal((await page.evaluate(()=>window.__calls)).at(-1).rate,.75);await page.evaluate(()=>window.__finish());
 await page.locator('.speed-options button').last().click();await page.locator('.audio-button').click();assert.equal((await page.evaluate(()=>window.__calls)).at(-1).rate,1.15);await page.evaluate(()=>window.__finish());
 await page.reload();assert.equal(await page.locator('.speed-options button').last().getAttribute('aria-pressed'),'true');
 await page.locator('.set-dot').nth(2).click();await page.locator('.story-word').first().click();await page.locator('.word-dialog').waitFor();assert.ok(await page.locator('.dialog-meaning').innerText());assert.ok(await page.locator('.dialog-example p[lang=en]').innerText());assert.ok(await page.locator('.dialog-example p[lang=ko]').innerText());
 const before=await read(sk(1));await page.locator('.word-dialog .word-audio').click();await page.evaluate(()=>window.__finish());await page.locator('.word-dialog .star-button').click();const selected=await page.locator('.dialog-word h2').innerText();await page.setViewportSize({width:900,height:900});assert.equal(await page.locator('.dialog-word h2').innerText(),selected);await page.screenshot({path:OUT+'/popup-900.png'});await page.reload();assert.equal(await page.locator('.dialog-word h2').innerText(),selected);await page.getByRole('button',{name:'뜻 팝업 닫기'}).click();assert.deepEqual(await read(sk(1)),before);
 await page.locator('.story-word').first().click();await page.mouse.click(2,2);assert.equal(await page.locator('.word-dialog').count(),0);
 const cols=await page.locator('.lesson-columns').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(cols,2);await page.setViewportSize({width:360,height:800});assert.equal(await page.locator('.set-dot[aria-pressed=true]').innerText(),'3');await page.setViewportSize({width:900,height:900});assert.equal(await page.locator('.set-dot[aria-pressed=true]').innerText(),'3');
 mark('Speech mock: entire story in ONE utterance, stop/restart/end/rapid taps/word switch, no re-render cancellation, rates persist; popup and lesson survive resize/reload');
 for(let day=1;day<=5;day++){
  await go(`#/learn/day/${day}`);await page.locator('.english-story').waitFor();
  for(let i=0;i<8;i++){await page.locator('.set-dot').nth(i).click();if(!(await page.locator('.set-complete').isDisabled()))await page.locator('.set-complete').click();}
  assert.equal((await read(sk(day))).completedSetIds.length,8);
  await go(`#/puzzle/day/${day}`);await page.locator('.puzzle-grid').waitFor();let session=(await read(pk(day))).active;assert.ok(session.puzzle.entries.every(e=>e.id.startsWith(`day${String(day).padStart(2,'0')}-`)));
  const entries=session.puzzle.entries;
  async function select(e){await page.locator('.clue-direction-tabs button').nth(e.direction==='across'?0:1).click();await page.locator('.puzzle-clue-lists section:visible li button').filter({has:page.locator('strong',{hasText:new RegExp('^'+e.number+'$')})}).click();for(let i=0;i<e.word.length;i++)await page.locator('.cell-input').press('ArrowLeft');}
  await select(entries[0]);const k=`${entries[0].row},${entries[0].col}`;assert.equal(await page.locator('.cell-input').getAttribute('inputmode'),'none');
  await page.locator('[data-letter=Z]').click();assert.equal((await read(pk(day))).active.answers[k],'Z');await page.getByRole('button',{name:'한 글자 지우기'}).click();assert.equal((await read(pk(day))).active.answers[k],undefined);
  await page.locator('.cell-input').pressSequentially('z');await page.locator('.puzzle-word-check').click();assert.ok((await read(ck)).mistakes.some(m=>m.wordId===entries[0].id));
  await page.locator('.puzzle-actions > button').first().click();await page.locator('.puzzle-actions > button').first().click();assert.equal((await read(pk(day))).active.hintCount,2);
  const snapshot=(await read(pk(day))).active, selectedCell=await page.locator('.puzzle-cell.current').getAttribute('data-cell');await page.setViewportSize({width:360,height:780});await page.setViewportSize({width:900,height:900});assert.deepEqual((await read(pk(day))).active,snapshot);assert.equal(await page.locator('.puzzle-cell.current').getAttribute('data-cell'),selectedCell);await page.reload();assert.equal(await page.locator('.puzzle-cell.current').getAttribute('data-cell'),selectedCell);assert.equal((await read(pk(day))).active.puzzle.id,snapshot.puzzle.id);
  if(day===1){await page.screenshot({path:OUT+'/puzzle-900.png'});await page.setViewportSize({width:360,height:800});await page.screenshot({path:OUT+'/puzzle-360.png',fullPage:true});await page.setViewportSize({width:900,height:900});}
  for(const e of entries){await select(e);await page.locator('.cell-input').fill(e.word);}
  await page.locator('.puzzle-actions .primary-button').click();await page.locator('.puzzle-celebration').waitFor();assert.equal((await read(pk(day))).completions.length,1);await page.reload();assert.ok(await page.locator('.puzzle-celebration').isVisible());mark(`DAY ${day}: lesson completion, isolated puzzle, screen/physical input, hints, mistakes, grading and resize/reload persistence`);
 }
 await go('#/map');assert.equal(await page.locator('.learning-node.completed').count(),10);assert.equal(await page.locator('.day-section').nth(5).locator('.learning-node.locked').count(),2);
 await go('#/review');let activeCard=page.locator('.collection-item.selected .collection-card');const id=await activeCard.getAttribute('data-word-id');const word=[1,2,3,4,5].flatMap(d=>JSON.parse(readFileSync(`${ROOT}/src/data/vocabulary/day${String(d).padStart(2,'0')}.json`))).find(w=>w.id===id).word;
 await activeCard.getByRole('button',{name:'철자 복습'}).click();await activeCard.locator('input').fill('WRONG');await activeCard.getByRole('button',{name:'정답 확인'}).click();assert.match(await activeCard.locator('.review-result').innerText(),/한 번 더/);await activeCard.locator('input').fill(word);await page.setViewportSize({width:360,height:800});await page.setViewportSize({width:900,height:900});assert.equal(await activeCard.locator('input').inputValue(),word);await activeCard.getByRole('button',{name:'정답 확인'}).click();assert.match(await activeCard.locator('.review-result').innerText(),/정답/);await activeCard.getByRole('button',{name:'단어로 돌아가기'}).click();if(await activeCard.locator('.star-button').getAttribute('aria-pressed')==='false')await activeCard.locator('.star-button').click();
 const mistakes=(await read(ck)).mistakes.length;await go('#/stars');const starCard=page.locator(`[data-word-id="${id}"]`);await page.locator('.collection-index button').filter({hasText:word}).first().click();await starCard.getByRole('button',{name:'예문 보기'}).click();assert.ok(await starCard.locator('.collection-example').isVisible());await starCard.locator('.star-button').click();assert.equal(await starCard.count(),0);assert.equal((await read(ck)).mistakes.length,mistakes);mark('Wrong spelling retry/success and independent stars preserved; wide master/detail and resize retain review input');
 await go('#/settings');for(const [label,theme] of [['B. 피치 크림','peach'],['C. 샌드 오렌지','sand'],['A. 햇살 오렌지','sunshine']]){await page.getByRole('button',{name:new RegExp(label.replace('.','\\.'))}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),theme);await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),theme);}mark('All 3 themes persist across refresh');
 // Keep an active puzzle for layout checks without losing completion history.
 await go('#/puzzle/day/5');await page.getByRole('button',{name:/새 퍼즐로 다시 풀기/}).click();await page.locator('.puzzle-grid').waitFor();
 const paths=['#/map','#/day/1','#/learn/day/5','#/puzzle/day/5','#/words','#/review','#/stars','#/records','#/settings'];
 for(const width of [320,360,390,430,600,768,900,1024,1280]){
  await page.setViewportSize({width,height:900});
  for(const path of paths){await go(path);const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflows:[...document.querySelectorAll('main button,main input,main select,main a,nav a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.closest('dialog:not([open])')&&(r.left<-.5||r.right>innerWidth+.5)}).map(e=>({tag:e.tagName,text:e.textContent?.slice(0,30),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));assert.ok(state.scroll<=state.width,`${width} ${path}: page overflow`);assert.deepEqual(state.overflows,[],`${width} ${path}: interactive clipping`);
   if(path.includes('learn')){const col=await page.locator('.lesson-columns').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(col,width>=760?2:1);}
   if(path.includes('puzzle')){const col=await page.locator('.puzzle-layout').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(col,width>=760?2:1);const sizes=await page.locator('.puzzle-cell').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)}));assert.ok(sizes.every(n=>n<1));}
   report.layouts.push({width,path,horizontalOverflow:false,interactiveClipping:false});
   if([360,900].includes(width)&&['#/map','#/learn/day/5','#/puzzle/day/5','#/review','#/settings'].includes(path))await page.screenshot({path:`${OUT}/${path.split('/')[1]}-${width}.png`});
  }
 }
 mark('81 route/viewport checks at 320–1280px: no horizontal scroll/clipped controls, 1/2 columns and square puzzle cells');
 const saved=await page.evaluate(()=>({...localStorage}));writeFileSync(OUT+'/qa-state.json',JSON.stringify(saved));
 // A separate unmodified native API check; audible output is NOT inferred from JS events.
 const native=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await routes(native);const np=await native.newPage();await np.goto(BASE+'#/learn/day/1');report.speech.nativeVoices=await np.evaluate(()=>speechSynthesis.getVoices().map(v=>({name:v.name,lang:v.lang})));await np.locator('.audio-button').click();await np.waitForTimeout(2500);report.speech.nativeFeedback=await np.locator('.speech-feedback').allTextContents();await native.close();
 assert.deepEqual(report.runtimeErrors,[]);report.result='PASS (controlled speech only; native audio unverified)';mark('No browser runtime errors; native no-voice failure reported separately');
}catch(e){report.result='FAIL';report.error=e.stack;console.error(e);await page.screenshot({path:OUT+'/failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));await browser.close();}
