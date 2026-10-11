/** Small ink-and-paint signature; decoration never intercepts a control. */
export default function StreetAccent({ className = '' }: { className?: string }) {
  return (
    <svg className={`street-accent ${className}`} viewBox="0 0 132 40" fill="none" aria-hidden="true" focusable="false">
      <path d="m9 24 78-13-10 9-67 9Z" fill="#67e8df" stroke="#080b15" strokeWidth="3" strokeLinejoin="round" />
      <path d="m34 30 59-9-9 9-51 4Z" fill="#ed65bf" stroke="#080b15" strokeWidth="3" strokeLinejoin="round" />
      <path d="m109 9 13 15m-1-16-14 17" stroke="#080b15" strokeWidth="9" strokeLinecap="round" />
      <path d="m109 9 13 15m-1-16-14 17" stroke="#fff3cd" strokeWidth="4" strokeLinecap="round" />
      <circle cx="7" cy="12" r="2" fill="#ed65bf" /><circle cx="98" cy="33" r="2" fill="#67e8df" />
    </svg>
  );
}
