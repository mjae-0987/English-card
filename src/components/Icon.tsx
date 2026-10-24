export type IconName = 'star' | 'flame' | 'book' | 'map' | 'puzzle' | 'chart' | 'lock' | 'arrow' | 'back' | 'check' | 'leaf' | 'flag' | 'close' | 'speaker' | 'stop';
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'star' && <path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9Z" fill="currentColor" strokeLinejoin="round" />}
    {name === 'flame' && <><path d="M13 2c1 6-5 5-4 10-2-1-2-3-2-3-6 7-1 13 5 13S23 14 17 8c0 3-2 3-2 3s2-5-2-9Z" fill="currentColor" stroke="none"/><path d="M12 14c-4 4-2 6 0 6s4-2 0-6Z" fill="#fff1bd" stroke="none"/></>}
    {name === 'book' && <><path d="M3 4q5-2 9 1 4-3 9-1v16q-5-2-9 1-4-3-9-1Z"/><path d="M12 5v16M6 8l3 1m6 0 3-1M6 12l3 1m6 0 3-1"/></>}
    {name === 'map' && <><path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2ZM9 3v15m6-12v15"/><path d="m6 10 2 2 5-2 4 3" strokeDasharray="1 3"/></>}
    {name === 'puzzle' && <path d="M9 3H4v6c5-3 5 6 0 3v8h6c-3-5 6-5 3 0h7v-7c5 3 5-6 0-3V3h-7c3 5-6 5-3 0Z"/>}
    {name === 'chart' && <><path d="M4 3v18h17M8 16v-5m5 5V7m5 9V4"/><path d="m7 6 4-3"/></>}
    {name === 'lock' && <><rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor" stroke="none"/><path d="M8 10V7a4 4 0 0 1 8 0v3" strokeWidth="2.7"/><path d="M12 15v2" stroke="#f7f8f4" strokeWidth="2.5"/></>}
    {name === 'arrow' && <path d="m9 5 7 7-7 7M3 12h12"/>}
    {name === 'back' && <path d="m14 5-7 7 7 7"/>}
    {name === 'check' && <path d="m5 12 5 5L20 6" strokeWidth="3"/>}
    {name === 'leaf' && <><path d="M12 21V11M12 14C2 15 3 7 3 7s10-2 9 7ZM12 11C11 2 21 3 21 3s1 9-9 8Z" fill="currentColor" stroke="none"/></>}
    {name === 'flag' && <><path d="M6 22V3m0 1c5-4 7 4 13 0v11c-6 4-8-4-13 0"/><path d="M3 22h6"/></>}
    {name === 'close' && <path d="m6 6 12 12M6 18 18 6"/>}
    {name === 'speaker' && <><path d="M4 9h4l5-4v14l-5-4H4ZM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>}
    {name === 'stop' && <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>}
  </svg>;
}
