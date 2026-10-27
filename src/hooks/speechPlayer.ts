export type SpeechRate = 0.75 | 1 | 1.15;
export const isEnglishVoice = (voice: Pick<SpeechSynthesisVoice, 'lang'>) => /^en(?:[-_]|$)/i.test(voice.lang);
export function selectEnglishVoice(voices: SpeechSynthesisVoice[], preferred: string) {
  const english = voices.filter(isEnglishVoice);
  const score = (v: SpeechSynthesisVoice) => (/^en[-_]US$/i.test(v.lang) ? 10 : 0) + (/natural|neural|premium|enhanced/i.test(v.name) ? 2 : 0);
  return english.find(v => v.voiceURI === preferred) ?? [...english].sort((a, b) => score(b) - score(a))[0];
}
export function speechSegments(text: string) {
  const parts = text.match(/[^.!?]+(?:[.!?]+["']?|$)\s*/g);
  // Keep every original character even for unusual punctuation.
  return parts && parts.join('') === text ? parts : [text];
}
export class SpeechPlayer {
  private generation = 0;
  private active: SpeechSynthesisUtterance | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private synth: SpeechSynthesis | null;
  private create: (text: string) => SpeechSynthesisUtterance;
  private onSpeaking: (key: string | null) => void;
  private onError: (message: string) => void;
  constructor(synth: SpeechSynthesis | null, create: (text: string) => SpeechSynthesisUtterance, onSpeaking: (key: string | null) => void, onError: (message: string) => void) {
    this.synth = synth; this.create = create; this.onSpeaking = onSpeaking; this.onError = onError;
  }
  stop() {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.synth?.cancel(); this.active = null; this.onSpeaking(null);
  }
  speak(text: string, key: string, rate: SpeechRate, preferred = '') {
    this.stop(); this.onError('');
    const synth = this.synth;
    if (!synth || !text.trim()) { this.onError('소리를 재생할 수 없어요.'); return; }
    try {
      const voices = synth.getVoices();
      const chosen = selectEnglishVoice(voices, preferred);
      if (voices.length && !chosen) { this.onError('영어 음성을 찾을 수 없어요. 기기에 영어 음성을 추가해 주세요.'); return; }
      const token = this.generation, parts = speechSegments(text);
      this.onSpeaking(key);
      const play = (index: number) => {
        if (this.generation !== token) return;
        try {
          const u = this.create(parts[index]); this.active = u;
          u.lang = chosen?.lang ?? 'en-US'; u.rate = rate;
          if (chosen) u.voice = chosen;
          u.onstart = () => { if (this.generation === token && this.timer) clearTimeout(this.timer); };
          u.onend = () => {
            if (this.generation !== token) return;
            if (this.timer) clearTimeout(this.timer);
            if (index + 1 < parts.length) play(index + 1);
            else { this.active = null; this.onSpeaking(null); }
          };
          u.onerror = event => {
            if (this.generation !== token) return;
            this.stop(); if (!['canceled', 'interrupted'].includes(event.error)) this.onError('소리를 재생할 수 없어요.');
          };
          this.timer = setTimeout(() => { if (this.generation === token) { this.stop(); this.onError('소리를 재생할 수 없어요.'); } }, 12000);
          synth.resume(); synth.speak(this.active);
        } catch { this.stop(); this.onError('소리를 재생할 수 없어요.'); }
      };
      play(0);
    } catch { this.stop(); this.onError('소리를 재생할 수 없어요.'); }
  }
}
