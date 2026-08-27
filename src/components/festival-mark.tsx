export function FestivalMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      fill="none"
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="4" fill="currentColor" />
      {[0, 72, 144, 216, 288].map((rotation) => (
        <ellipse
          key={rotation}
          cx="24"
          cy="12.5"
          rx="5.25"
          ry="7"
          fill="currentColor"
          transform={`rotate(${rotation} 24 24)`}
        />
      ))}
    </svg>
  );
}

