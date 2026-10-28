import { SpeechPlayer, type SpeechRate } from '../hooks/speechPlayer.ts';
export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export interface AudioSnapshot { status: AudioStatus; key: string | null; source: 'mp3' | 'tts' | null; error: string }
export interface AudioTarget { id: string; src: string }
export interface AudioLog { stage: 'mp3' | 'tts'; id?: string; src?: string; reason: unknown }
interface Options {
  createAudio: (() => HTMLAudioElement) | null;
  resolve: (text: string) => AudioTarget | undefined;
  notify: (state: AudioSnapshot) => void;
  speech?: { synth: SpeechSynthesis; create: (text: string) => SpeechSynthesisUtterance };
  log?: (event: AudioLog) => void;
  timeoutMs?: number;
}
const failure = '소리를 재생할 수 없어요. 다시 시도해 주세요.';
export class AudioPlayer {
  private options: Options;
  private request = 0;
  private audio: HTMLAudioElement | null = null;
  private detach: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private phase: 'mp3' | 'tts' | null = null;
  private current: { text: string; key: string; target?: AudioTarget } | null = null;
  private rate: SpeechRate = 1;
  private voiceURI = '';
  private fallback: SpeechPlayer | null = null;
  private fallbackRequest = -1;
  private primingFallback = false;
  private snapshot: AudioSnapshot = { status: 'idle', key: null, source: null, error: '' };
  constructor(options: Options) {
    this.options = options;
    if (options.speech) this.fallback = new SpeechPlayer(options.speech.synth, options.speech.create, key => {
      if (this.phase !== 'tts' || this.fallbackRequest !== this.request) return;
      if (key) this.emit('playing', key, 'tts');
      else if (!this.primingFallback) {
        const token = this.fallbackRequest;
        queueMicrotask(() => { if (this.phase === 'tts' && token === this.request) { this.phase = null; this.emit('idle'); } });
      }
    }, message => {
      if (!message || this.phase !== 'tts' || this.fallbackRequest !== this.request) return;
      this.log('tts', message); this.phase = null; this.emit('error');
    });
  }
  getState() { return { ...this.snapshot }; }
  private emit(status: AudioStatus, key: string | null = null, source: AudioSnapshot['source'] = null) {
    this.snapshot = { status, key, source, error: status === 'error' ? failure : '' };
    this.options.notify(this.getState());
  }
  private log(stage: AudioLog['stage'], reason: unknown) {
    this.options.log?.({ stage, id: this.current?.target?.id, src: this.current?.target?.src, reason });
  }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
  private release() {
    this.clearTimer(); this.detach?.(); this.detach = null;
    const old = this.audio; this.audio = null;
    if (old) {
      try { old.pause(); old.currentTime = 0; old.removeAttribute('src'); old.load(); } catch { /* Ignore teardown errors. */ }
    }
  }
  stop() {
    this.request++; this.phase = null; this.release(); this.fallback?.stop(); this.current = null;
    this.emit('idle');
  }
  setPlaybackRate(rate: SpeechRate) {
    this.rate = rate;
    if (this.audio) this.audio.playbackRate = rate;
  }
  setVoiceURI(uri: string) { this.voiceURI = uri; }
  private tryFallback(token: number, reason: unknown) {
    if (token !== this.request || this.phase !== 'mp3' || !this.current) return;
    this.log('mp3', reason); this.release(); this.phase = 'tts'; this.fallbackRequest = token;
    const { text, key } = this.current;
    if (!this.fallback) { this.log('tts', 'unsupported'); this.phase = null; this.emit('error'); return; }
    this.emit('loading', key, 'tts'); this.primingFallback = true;
    try { this.fallback.speak(text, key, this.rate, this.voiceURI); }
    catch (error) { this.log('tts', error); this.phase = null; this.emit('error'); }
    finally { this.primingFallback = false; }
  }
  private armTimeout(token: number) {
    if (!this.timer) this.timer = setTimeout(() => this.tryFallback(token, 'loading-timeout'), this.options.timeoutMs ?? 15000);
  }
  private startElement(token: number, audio: HTMLAudioElement) {
    if (token !== this.request || this.audio !== audio || this.phase !== 'mp3' || !this.current) return;
    this.emit('loading', this.current.key, 'mp3'); this.armTimeout(token);
    try {
      // Call play synchronously in the original tap; never await fetch/canplay first.
      const result = audio.play();
      Promise.resolve(result).then(() => {
        if (token !== this.request || this.audio !== audio || this.phase !== 'mp3') return;
        if (this.snapshot.status === 'paused') return;
        this.clearTimer(); this.emit('playing', this.current!.key, 'mp3');
      }, error => { if (token === this.request && this.phase === 'mp3' && this.snapshot.status !== 'paused') this.tryFallback(token, error); });
    } catch (error) { this.tryFallback(token, error); }
  }
  play(text: string, key: string) {
    this.stop(); const token = this.request;
    this.current = { text, key, target: this.options.resolve(text) }; this.phase = 'mp3';
    if (!text.trim()) { this.tryFallback(token, 'empty-text'); return; }
    const target = this.current.target;
    if (!target || !this.options.createAudio) { this.tryFallback(token, target ? 'audio-unsupported' : 'missing-asset'); return; }
    try {
      const audio = this.options.createAudio(); this.audio = audio;
      audio.preload = 'none'; audio.playbackRate = this.rate; audio.src = target.src;
      if ('preservesPitch' in audio) audio.preservesPitch = true;
      const valid = () => token === this.request && this.audio === audio && this.phase === 'mp3';
      const playing = () => { if (valid()) { this.clearTimer(); this.emit('playing', key, 'mp3'); } };
      const waiting = () => { if (valid() && this.snapshot.status !== 'paused') { this.emit('loading', key, 'mp3'); this.armTimeout(token); } };
      const pause = () => { if (valid() && this.snapshot.status !== 'loading') { this.clearTimer(); this.emit('paused', key, 'mp3'); } };
      const ended = () => { if (valid()) { this.phase = null; this.release(); this.emit('idle'); } };
      const error = () => { if (valid()) {
        const reason = { code: audio.error?.code, message: audio.error?.message ?? 'media-error' };
        if (this.snapshot.status === 'paused') { this.log('mp3', reason); this.phase = null; this.release(); this.emit('error'); }
        else this.tryFallback(token, reason);
      } };
      const events = { playing, waiting, stalled: waiting, pause, ended, error };
      for (const [event, handler] of Object.entries(events)) audio.addEventListener(event, handler);
      this.detach = () => { for (const [event, handler] of Object.entries(events)) audio.removeEventListener(event, handler); };
      this.startElement(token, audio);
    } catch (error) { this.tryFallback(token, error); }
  }
  pause() {
    if (this.phase === 'tts') { this.stop(); return; }
    if (!this.audio || !this.current) return;
    this.clearTimer(); this.audio.pause(); this.emit('paused', this.current.key, 'mp3');
  }
  resume() { if (this.audio && this.snapshot.status === 'paused') this.startElement(this.request, this.audio); }
}
