/**
 * Care Ride mark: a mango "road to care" leading to a wheelchair wheel whose hub is a heart
 * (journey + mobility + care). Spokes and road markings are dropped at small sizes to stay crisp.
 */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  const detailed = size >= 36;
  return (
    <svg width={size} height={size} viewBox="-70 -70 140 140" className={className} role="img" aria-label="Care Ride logo">
      <rect x="-70" y="-70" width="140" height="140" rx="36" fill="#5B3E96" />
      <path d="M-48 62 C-46 18 6 30 14 -2" fill="none" stroke="#E9A31F" strokeWidth={detailed ? 16 : 18} strokeLinecap="round" />
      {detailed && <path d="M-48 62 C-46 18 6 30 14 -2" fill="none" stroke="#5B3E96" strokeWidth="2" strokeDasharray="5 6" />}
      <circle cx="22" cy="-22" r="36" fill="#FFFFFF" />
      <circle cx="22" cy="-22" r="29" fill="none" stroke="#5B3E96" strokeWidth={detailed ? 5 : 7} />
      {detailed && (
        <g stroke="#5B3E96" strokeWidth="2.5" strokeLinecap="round">
          <line x1="22" y1="-35" x2="22" y2="-48" />
          <line x1="22" y1="-9" x2="22" y2="4" />
          <line x1="10" y1="-28" x2="-1" y2="-35" />
          <line x1="34" y1="-28" x2="45" y2="-35" />
          <line x1="10" y1="-16" x2="-1" y2="-9" />
          <line x1="34" y1="-16" x2="45" y2="-9" />
        </g>
      )}
      <path d="M22 -12 C8 -21 12 -36 22 -28 C32 -36 36 -21 22 -12 Z" fill="#E9A31F" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={44} className="shrink-0" />
      <span className="leading-none">
        <span className="block text-xl font-bold tracking-tight text-ube-950">Care Ride</span>
        <span className="block text-[13px] font-bold text-ube-700">at your service-PH</span>
      </span>
    </span>
  );
}
