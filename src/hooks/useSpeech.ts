import { useContext } from 'react';
import { SpeechContext } from './SpeechProvider';
export function useSpeech() {
  const value = useContext(SpeechContext);
  if (!value) throw new Error('SpeechProvider is required');
  return value;
}
