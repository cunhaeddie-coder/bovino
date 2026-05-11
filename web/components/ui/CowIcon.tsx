export function CowIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8C4 6 3 4 4 3c1-1 2 0 3 1" />
      <path d="M18 8c2-2 3-4 2-5-1-1-2 0-3 1" />
      <ellipse cx="12" cy="11" rx="7" ry="5" />
      <circle cx="9.5" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <path d="M10 14q2 1.5 4 0" />
    </svg>
  );
}
