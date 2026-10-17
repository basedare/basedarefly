import type { PassportEvidence } from '@/lib/passport-progression';
const colors = { personal: '#f5c85d', visit: '#85e5be', contribution: '#c3a1ff', crew: '#82d9ef' };
/** Code-native illustration; its colour is always paired with a written evidence label. */
export default function PassportStamp({ evidence, earned = true }: { evidence: PassportEvidence; earned?: boolean }) {
  const color = earned ? colors[evidence] : '#777280';
  return <svg width="72" height="72" viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
    <path d="M50 3l9 7 11-1 6 10 11 4 1 12 8 9-5 11 2 11-10 7-4 11-12 1-9 8-11-5-11 2-7-10-11-4-1-12-8-9 5-11-2-11 10-7 4-11 12-1z" fill={color} opacity={earned ? .95 : .25}/>
    <circle cx="50" cy="49" r="32" fill="#15111e" stroke={color} strokeWidth="2" strokeDasharray="3 3"/>
    <circle cx="62" cy="36" r="7" fill={color}/>
    <path d="M26 64l17-25 11 16 7-9 15 18z" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
    {earned ? <path d="M40 76l7 6 14-13" fill="none" stroke="#15111e" strokeWidth="4" strokeLinecap="round"/> : null}
  </svg>;
}
