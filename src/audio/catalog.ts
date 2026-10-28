import generated from './catalog.generated.json';
export interface AudioAsset {
  id: string; kind: 'word' | 'story'; text: string; src: string;
  textSha256: string; sha256: string; bytes: number; duration: number;
  wordIds?: string[];
}
export const audioAssets = (generated as { items: AudioAsset[] }).items;
const stories = new Map(audioAssets.filter(a => a.kind === 'story').map(a => [a.text, a]));
const words = new Map(audioAssets.filter(a => a.kind === 'word').map(a => [a.text.toLowerCase(), a]));
export function getAudioAsset(text: string) { return stories.get(text.trim()) ?? words.get(text.trim().toLowerCase()); }
