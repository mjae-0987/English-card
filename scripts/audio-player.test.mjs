import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioPlayer } from '../src/audio/AudioPlayer.ts';
class FakeAudio extends EventTarget {
 src='';preload='';playbackRate=1;currentTime=0;preservesPitch=false;error=null;
 pauses=0;plays=0;resolves=[];rejects=[];
 play(){this.plays++;return new Promise((resolve,reject)=>{this.resolves.push(resolve);this.rejects.push(reject)});}
 pause(){this.pauses++;this.dispatchEvent(new Event('pause'));}
 load(){} removeAttribute(name){if(name==='src')this.src='';}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({speech=false,resolve=true,timeoutMs=1000}={}){
 const audios=[],states=[],logs=[],tts=[];
 const engine={getVoices:()=>[{lang:'en-US',voiceURI:'us',name:'US'}],speaking:false,cancel(){},resume(){},speak(u){tts.push(u);u.onstart?.()}};
 const player=new AudioPlayer({createAudio:()=>{const a=new FakeAudio();audios.push(a);return a},resolve:()=>resolve?{id:'day01-set01',src:'/audio/stories/day01-set01.mp3'}:undefined,notify:s=>states.push(s),log:e=>logs.push(e),timeoutMs,speech:speech?{synth:engine,create:text=>({text})}:undefined});
 return{player,audios,states,logs,tts};
}
test('MP3 play called synchronously in the tap, without waiting for network/metadata',async()=>{
 const s=setup({speech:true});s.player.play('First sentence. Second sentence.','story');assert.equal(s.audios[0].plays,1);assert.equal(s.tts.length,0);assert.equal(s.player.getState().status,'loading');
 s.audios[0].dispatchEvent(new Event('playing'));assert.equal(s.player.getState().status,'playing');s.audios[0].resolves[0]();await tick();assert.equal(s.player.getState().source,'mp3');s.player.stop();
});
test('playback rate updates in place; pause/resume/stop/restart preserve single-owner playback',async()=>{
 const s=setup();s.player.setPlaybackRate(.75);s.player.play('story','story');const first=s.audios[0];assert.equal(first.playbackRate,.75);first.dispatchEvent(new Event('playing'));
 s.player.setPlaybackRate(1.15);assert.equal(first.playbackRate,1.15);assert.equal(first.plays,1);s.player.pause();assert.equal(s.player.getState().status,'paused');s.player.resume();assert.equal(first.plays,2);first.resolves[1]();await tick();assert.equal(s.player.getState().status,'playing');
 s.player.play('word','word');assert.equal(first.src,'');assert.ok(first.pauses>=1);assert.equal(s.audios.length,2);assert.equal(s.player.getState().key,'word');s.player.stop();assert.equal(s.player.getState().status,'idle');assert.equal(s.audios[1].src,'');
});
test('stale promises/media events cannot finish or corrupt a newer request',async()=>{
 const s=setup();s.player.play('old','old');const old=s.audios[0];s.player.play('new','new');const latest=s.audios[1];
 old.resolves[0]();old.dispatchEvent(new Event('ended'));old.rejects[0](new Error('old failure'));await tick();assert.equal(s.player.getState().key,'new');latest.resolves[0]();await tick();assert.equal(s.player.getState().status,'playing');latest.dispatchEvent(new Event('ended'));assert.equal(s.player.getState().status,'idle');
});
test('MP3 rejection falls back to TTS once; unsupported fallback resets loading with retryable error',async()=>{
 const s=setup({speech:true});s.player.play('Full English story. All sentences.','story');s.audios[0].rejects[0](new Error('NotSupportedError'));await tick();assert.equal(s.tts.length,1);assert.equal(s.tts[0].text,'Full English story. All sentences.');assert.equal(s.player.getState().source,'tts');
 s.audios[0].dispatchEvent(new Event('error'));assert.equal(s.tts.length,1);s.tts[0].onend();await tick();assert.equal(s.player.getState().status,'idle');assert.equal(s.logs.filter(e=>e.stage==='mp3').length,1);
 const unsupported=setup();unsupported.player.play('word','word');unsupported.audios[0].rejects[0](new Error('NotAllowedError'));await tick();assert.equal(unsupported.player.getState().status,'error');assert.match(unsupported.player.getState().error,/다시 시도/);assert.deepEqual(unsupported.logs.map(e=>e.stage),['mp3','tts']);unsupported.player.play('word','word');assert.equal(unsupported.audios.length,2);unsupported.player.stop();
});
test('missing asset and actual TTS failure are distinguished in logs, never infinite retries',async()=>{
 const s=setup({speech:true,resolve:false});s.player.play('word','word');assert.equal(s.audios.length,0);assert.equal(s.tts.length,1);s.tts[0].onerror({error:'synthesis-failed'});await tick();assert.equal(s.player.getState().status,'error');assert.deepEqual(s.logs.map(e=>e.stage),['mp3','tts']);assert.equal(s.logs[0].reason,'missing-asset');s.player.stop();
});
test('loading timeout is bounded; stop cancels timeout; pause does not trigger autoplay fallback',async()=>{
 const s=setup({speech:true,timeoutMs:15});s.player.play('story','story');await new Promise(r=>setTimeout(r,30));assert.equal(s.tts.length,1);s.player.stop();
 const stopped=setup({timeoutMs:15});stopped.player.play('word','word');stopped.player.stop();await new Promise(r=>setTimeout(r,30));assert.equal(stopped.logs.length,0);
 const paused=setup({speech:true});paused.player.play('word','word');paused.player.pause();paused.audios[0].rejects[0](Object.assign(new Error(),{name:'AbortError'}));await tick();assert.equal(paused.tts.length,0);assert.equal(paused.player.getState().status,'paused');paused.player.stop();
});
