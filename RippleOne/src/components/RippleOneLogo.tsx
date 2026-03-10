"use client";

/**
 * Ripple One logo — SVG triskelion mark inspired by Ripple Labs branding
 * with the wordmark "RIPPLE ONE" rendered in a clean, corporate style.
 */
export function RippleOneIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ripple Labs corporate triskelion — three nodes connected by curved arcs */}
      <g transform="translate(30,30)">
        {/* Top-left node */}
        <circle cx="-10" cy="-14" r="4.5" fill="#0060F0" />
        {/* Top-right node */}
        <circle cx="10" cy="-14" r="4.5" fill="#0060F0" />
        {/* Right node */}
        <circle cx="18" cy="2" r="4.5" fill="#0060F0" />
        {/* Bottom-right node */}
        <circle cx="10" cy="18" r="4.5" fill="#0060F0" />
        {/* Bottom-left node */}
        <circle cx="-10" cy="18" r="4.5" fill="#0060F0" />
        {/* Left node */}
        <circle cx="-18" cy="2" r="4.5" fill="#0060F0" />

        {/* Curved connecting arcs — outer ring */}
        <path
          d="M-5.5,-14 C-2,-8 2,-8 5.5,-14"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M13,-10.5 C12,-4 14,-1 18,-2.5"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M17,6.5 C14,10 13,14 14,18"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M5.5,18 C2,12 -2,12 -5.5,18"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M-14,18 C-14,14 -13,10 -17,6.5"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M-18,-2.5 C-14,-1 -12,-4 -13,-10.5"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Inner connecting arcs — through center */}
        <path
          d="M-7,-10 C-3,-2 3,-2 7,-10"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M14,1 C6,2 3,8 7,15"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M-7,15 C-3,8 -6,2 -14,1"
          stroke="#0060F0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}

export function RippleOneWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-0 ${className}`}>
      <span className="font-bold tracking-tight text-white">RIPPLE</span>
      <span className="font-light tracking-tight text-[#0060F0] ml-[3px]">ONE</span>
    </span>
  );
}

export function RippleOneFull({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <RippleOneIcon size={collapsed ? 32 : 38} />
      {!collapsed && (
        <RippleOneWordmark className="text-[11px]" />
      )}
    </div>
  );
}
