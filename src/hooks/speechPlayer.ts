export type SpeechRate = 0.75 | 1 | 1.15;
export type SpeechStatus = 'idle' | 'speaking' | 'error';
export const isEnglishVoice = (voice: Pick<SpeechSynthesisVoice, 'lang'>) => /^en(?:[-_]|$)/i.test(voice.lang);
export function selectEnglishVoice(voices: SpeechSynthesisVoice[], preferred: string) {
  const english = voices.filter(isEnglishVoice);
  const score = (v: SpeechSynthesisVoice) => (/^en[-_]US$/i.test(v.lang) ? 10 : 0) + (/natural|neural|premium|enhanced/i.test(v.name) ? 2 : 0);
  return english.find(v => v.voiceURI === preferred) ?? [...english].sort((a, b) => score(b) - score(a))[0];
}
// Kept for compatibility with earlier tests/imports. Playback uses ONE utterance.
export const speechSegments = (text: string) => [text];
export class SpeechPlayer {
  private generation = 0;
  private active: SpeechSynthesisUtterance | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unlisten: (() => void) | null = null;
  private synth: SpeechSynthesis | null;
  private create: (text: string) => SpeechSynthesisUtterance;
  private onSpeaking: (key: string | null) => void;
  private onError: (message: string) => void;
  constructor(synth: SpeechSynthesis | null, create: (text: string) => SpeechSynthesisUtterance, onSpeaking: (key: string | null) => void, onError: (message: string) => void) {
    this.synth = synth; this.create = create; this.onSpeaking = onSpeaking; this.onError = onError;
  }
  private clearWaiting() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null; this.unlisten?.(); this.unlisten = null;
  }
  stop() {
    this.generation++; this.clearWaiting();
    const busy = Boolean(this.active || this.synth?.speaking || this.synth?.pending);
    this.active = null;
    // An idle cancel can race with the next speak on mobile engines.
    if (busy) { try { this.synth?.cancel(); } catch { /* State still resets. */ } }
    this.onSpeaking(null);
  }
  speak(text: string, key: string, rate: SpeechRate, preferred = '') {
    this.stop(); this.onError('');
    const synth = this.synth;
    if (!synth || !text.trim()) { this.onError('소리를 재생할 수 없어요.'); return; }
    const token = this.generation;
    this.onSpeaking(key);
    const fail = (message = '소리를 재생할 수 없어요.') => {
      if (this.generation !== token) return;
      this.stop(); this.onError(message);
    };
    const start = () => {
      if (this.generation !== token) return;
      try {
        this.clearWaiting();
        const voices = synth.getVoices();
        const chosen = selectEnglishVoice(voices, preferred);
        if (voices.length && !chosen) { fail('영어 음성을 찾을 수 없어요. 기기에 영어 음성을 추가해 주세요.'); return; }
        // No onend -> speak chain: the entire displayed English text is submitted
        // within the original gesture, without relying on another activation.
        const u = this.create(text); this.active = u;
        u.lang = chosen?.lang ?? 'en-US'; u.rate = rate;
        if (chosen) u.voice = chosen;
        u.onstart = () => { if (this.generation === token) this.clearWaiting(); };
        u.onend = () => {
          if (this.generation !== token) return;
          this.clearWaiting(); this.active = null; this.onSpeaking(null);
        };
        u.onerror = event => {
          if (this.generation !== token) return;
          if (['canceled', 'interrupted'].includes(event.error)) this.stop();
          else fail();
        };
        this.timer = setTimeout(() => fail(), 12000);
        // Resume only if paused; do not insert pause/resume before every start.
        if (synth.paused) synth.resume();
        synth.speak(u);
      } catch { fail(); }
    };
    try {
      const voices = synth.getVoices();
      if (voices.length && !voices.some(isEnglishVoice) && typeof synth.addEventListener === 'function') {
        // Some engines expose the device language before loading English voices.
        // Wait once, bounded; the next tap always starts a fresh request.
        const ready = () => { if (synth.getVoices().some(isEnglishVoice)) start(); };
        synth.addEventListener('voiceschanged', ready);
        this.unlisten = () => synth.removeEventListener('voiceschanged', ready);
        this.timer = setTimeout(() => fail('영어 음성을 찾을 수 없어요. 기기에 영어 음성을 추가해 주세요.'), 1500);
      } else start();
    } catch { fail(); }
  }
}
