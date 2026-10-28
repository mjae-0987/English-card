import { useContext } from 'react';
import { SpeechContext } from './SpeechProvider';
export function useAudio() {
  const value = useContext(SpeechContext);
  if (!value) throw new Error('Audio provider is required');
  return value;
}
