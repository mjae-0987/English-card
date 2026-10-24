export function Scenery({ variant = 0 }: { variant?: number }) {
  return <svg className={`scenery scenery-${variant % 2}`} viewBox="0 0 70 80" aria-hidden="true">
    {variant % 2 === 0 ? <>
      <ellipse cx="34" cy="69" rx="29" ry="7" fill="#e9edda"/>
      <path d="M34 65V32" stroke="#92b478" strokeWidth="3" strokeLinecap="round"/>
      <path d="M34 49C9 49 13 29 13 29s23-1 21 20" fill="#bfd79b"/>
      <path d="M34 40C32 18 53 19 53 19s5 21-19 21" fill="#a5c987"/>
      <path d="M34 62C32 45 53 43 53 43s-1 18-19 19" fill="#cddfa9"/>
      <circle cx="14" cy="63" r="3" fill="#f2d27e"/>
    </> : <>
      <ellipse cx="36" cy="68" rx="30" ry="6" fill="#e9edda"/>
      <path d="M24 58q-5-18 6-33 12 15 7 33" fill="#b5d29e"/>
      <path d="M39 62q-5-13 7-24 10 11 6 24" fill="#d0dfb6"/>
      <path d="M30 65V39m16 27V50" stroke="#91af78" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="m12 48 3-5 3 5 5 3-5 3-3 5-3-5-5-3Z" fill="#eaca8b"/>
    </>}
  </svg>;
}
