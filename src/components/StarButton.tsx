import { useLearning } from '../state/learning';
export function StarButton({ id, word }: { id: string; word?: string }) {
  const { collection, toggleStar } = useLearning();
  const starred = collection.starredIds.includes(id);
  return <button className={`star-button ${starred ? 'starred' : ''}`} onClick={() => toggleStar(id)} aria-pressed={starred} aria-label={`${word ?? '이 단어'} 별표 ${starred ? '해제' : '등록'}`}><span aria-hidden="true">{starred ? '★' : '☆'}</span></button>;
}
