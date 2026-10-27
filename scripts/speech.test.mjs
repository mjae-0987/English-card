import test from 'node:test';
import assert from 'node:assert/strict';
import { SpeechPlayer, selectEnglishVoice, speechSegments } from '../src/hooks/speechPlayer.ts';
const us={lang:'en-US',voiceURI:'us',name:'English US'},gb={lang:'en-GB',voiceURI:'gb',name:'English GB'},ko={lang:'ko-KR',voiceURI:'ko',name:'Korean'};
function setup(voices=[ko,gb,us]) {
 const calls=[], states=[], errors=[];let cancels=0;
 const synth={getVoices:()=>voices,cancel(){cancels++},resume(){},speak(u){calls.push(u);u.onstart?.()}};
 const player=new SpeechPlayer(synth,text=>({text}),key=>states.push(key),error=>errors.push(error));
 return {player,calls,states,errors,cancels:()=>cancels};
}
test('US preferred, English only, saved British voice honored, natural voice preferred without depending on its name',()=>{
 assert.equal(selectEnglishVoice([ko,gb,us],''),us);assert.equal(selectEnglishVoice([ko,gb,us],'gb'),gb);assert.equal(selectEnglishVoice([ko],''),undefined);
 const natural={...us,voiceURI:'natural',name:'Enhanced English'};assert.equal(selectEnglishVoice([us,natural],''),natural);
});
test('word pronunciation uses real synth methods and exact text/rate/voice; stop cancels',()=>{
 const s=setup();s.player.speak('emotion','word',1);assert.equal(s.calls.length,1);assert.equal(s.calls[0].text,'emotion');assert.equal(s.calls[0].rate,1);assert.equal(s.calls[0].lang,'en-US');assert.equal(s.calls[0].voice,us);assert.equal(s.states.at(-1),'word');s.player.stop();assert.equal(s.states.at(-1),null);assert.equal(s.cancels(),2);
});
test('full story preserves original characters, sequential playback, ignores stale callbacks on replacement',()=>{
 const s=setup(),story='Mia says, "Hello!" Leo smiles. They read together.';assert.equal(speechSegments(story).join(''),story);
 s.player.speak(story,'story',.75);let i=0;while(s.calls[i]){s.calls[i].onend();i++;}assert.equal(s.calls.map(c=>c.text).join(''),story);assert.equal(s.states.at(-1),null);assert.ok(s.calls.every(c=>c.rate===.75));
 s.player.speak(story,'old',1);const old=s.calls.at(-1);s.player.speak('new','new',1.15,'gb');const count=s.calls.length;old.onend();old.onerror({error:'network'});assert.equal(s.calls.length,count);assert.equal(s.states.at(-1),'new');assert.equal(s.calls.at(-1).lang,'en-GB');assert.equal(s.calls.at(-1).rate,1.15);s.calls.at(-1).onend();assert.equal(s.states.at(-1),null);
});
test('unsupported/Korean-only voices fail on action; empty asynchronous list uses en-US, errors reset playback',()=>{
 const s=setup([ko]);assert.deepEqual(s.errors,[]);s.player.speak('English','word',1);assert.equal(s.calls.length,0);assert.match(s.errors.at(-1),/영어 음성/);
 const empty=setup([]);empty.player.speak('English','word',1);assert.equal(empty.calls[0].lang,'en-US');assert.equal(empty.calls[0].voice,undefined);empty.calls[0].onerror({error:'synthesis-failed'});assert.equal(empty.states.at(-1),null);assert.equal(empty.errors.at(-1),'소리를 재생할 수 없어요.');
 const errors=[];const p=new SpeechPlayer(null,()=>null,()=>{},e=>errors.push(e));p.speak('English','word',1);assert.equal(errors.at(-1),'소리를 재생할 수 없어요.');
});
