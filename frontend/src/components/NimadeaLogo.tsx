const ARM_RECTS = [
  { x: 8, y: 8, width: 30.5, height: 9, rx: 2.6 },
  { x: 18, y: 19.4, width: 25.5, height: 9, rx: 2.6 },
  { x: 61.5, y: 8, width: 30.5, height: 9, rx: 2.6 },
  { x: 56.5, y: 19.4, width: 25.5, height: 9, rx: 2.6 },
  { x: 45.5, y: 8, width: 9, height: 36, rx: 2.6 },
];
const ROTATIONS = [0, 90, 180, 270];
const SHADOW_LAYERS = [
  { dx: 2.6, dy: 3.4, opacity: 0.1 },
  { dx: 1.7, dy: 2.3, opacity: 0.12 },
  { dx: 0.9, dy: 1.3, opacity: 0.14 },
];

/** The woven mark geometry, shared by the drop-shadow layers and the real mark. */
function Weave({ withHoles = false }: { withHoles?: boolean }) {
  return (
    <>
      {ROTATIONS.map((deg) => (
        <g key={deg} transform={`rotate(${deg} 50 50)`}>
          {ARM_RECTS.map((r, i) => (
            <rect key={i} {...r} />
          ))}
          {withHoles && (
            <rect x={47.5} y={35.5} width={5} height={5} rx={1.56} fill="url(#nea-insetHole)" />
          )}
        </g>
      ))}
      <rect x={44} y={44} width={12} height={12} rx={3.64} />
      {withHoles && (
        <rect x={47.5} y={47.5} width={5} height={5} rx={1.56} fill="url(#nea-insetHole)" />
      )}
    </>
  );
}

export function NimadeaLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nea-badgeGrad" gradientUnits="userSpaceOnUse" x1="6" y1="2" x2="94" y2="98">
          <stop offset="0%" stopColor="#9C97FA" />
          <stop offset="45%" stopColor="#5B4FEE" />
          <stop offset="100%" stopColor="#5B1FA6" />
        </linearGradient>
        <linearGradient id="nea-barGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DCDBF7" />
        </linearGradient>
        <radialGradient id="nea-insetHole" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.35} />
          <stop offset="35%" stopColor="#2A1760" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#150B33" stopOpacity={0.55} />
        </radialGradient>
        <radialGradient id="nea-vignette" cx="50%" cy="108%" r="65%">
          <stop offset="0%" stopColor="#000000" stopOpacity={0.42} />
          <stop offset="60%" stopColor="#000000" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="nea-topGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <clipPath id="nea-badgeClip">
          <rect width={100} height={100} rx={20} />
        </clipPath>
      </defs>

      {/* badge background */}
      <rect width={100} height={100} rx={20} fill="url(#nea-badgeGrad)" />
      <rect width={100} height={100} fill="url(#nea-vignette)" clipPath="url(#nea-badgeClip)" />

      {/* soft stacked drop shadow — no SVG filters, so it renders reliably everywhere */}
      <g clipPath="url(#nea-badgeClip)">
        {SHADOW_LAYERS.map(({ dx, dy, opacity }) => (
          <g
            key={`${dx}-${dy}`}
            transform={`translate(${7 + dx} ${7 + dy}) scale(0.86)`}
            fill="#1E1147"
            opacity={opacity}
          >
            <Weave />
          </g>
        ))}
      </g>

      {/* the woven mark itself */}
      <g transform="translate(7 7) scale(0.86)" fill="url(#nea-barGrad)">
        <Weave withHoles />
      </g>

      {/* glass highlight */}
      <g clipPath="url(#nea-badgeClip)">
        <ellipse cx={50} cy={16} rx={48} ry={24} fill="url(#nea-topGloss)" />
        <ellipse cx={27} cy={13} rx={11} ry={5} fill="#FFFFFF" opacity={0.55} transform="rotate(-18 27 13)" />
      </g>
    </svg>
  );
}