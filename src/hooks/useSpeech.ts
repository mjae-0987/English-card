import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const requestId = useRef(0);
  const stop = useCallback(() => {
    requestId.current += 1;
    if (supported) window.speechSynthesis.cancel();
    activeUtterance.current = null;
    setSpeaking(null);
  }, [supported]);

  const speak = (text: string, key: string) => {
    if (!supported) { setError('이 브라우저는 음성 합성을 지원하지 않아요. 다른 브라우저에서 발음을 들어 주세요.'); return; }
    stop();
    const currentRequest = requestId.current;
    setError('');
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(item => /^en[-_]US$/i.test(item.lang)) ?? voices.find(item => /^en\b/i.test(item.lang));
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        if (requestId.current === currentRequest) { setSpeaking(null); activeUtterance.current = null; }
      };
      utterance.onerror = event => {
        if (requestId.current !== currentRequest) return;
        setSpeaking(null); activeUtterance.current = null;
        if (event.error !== 'canceled' && event.error !== 'interrupted') setError('영어 음성을 재생할 수 없어요. 기기의 영어 음성 설정을 확인하고 다시 눌러 주세요.');
      };
      activeUtterance.current = utterance;
      setSpeaking(key);
      // Keep speak synchronous with the user's tap for mobile browser gesture rules.
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(null); activeUtterance.current = null;
      setError('음성 재생을 시작하지 못했어요. 잠시 후 다시 눌러 주세요.');
    }
  };
  useEffect(() => () => {
    requestId.current += 1;
    if (supported) window.speechSynthesis.cancel();
    activeUtterance.current = null;
  }, [supported]);
  return { supported, speaking, error, speak, stop };
}
