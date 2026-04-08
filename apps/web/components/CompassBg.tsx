/**
 * Decorative compass watermark — same symbol as the login page,
 * reused as a fixed full-page background layer.
 * Low opacity, pointer-events: none. Frutiger Aero quiet depth.
 */
interface Props {
  size?: number
  opacity?: number
  /** 'center' = centred in viewport (login style), 'right' = anchored bottom-right of content */
  position?: 'center' | 'right'
  dark?: boolean
}

export default function CompassBg({ size = 480, opacity, dark = false, position = 'center' }: Props) {
  const resolvedOpacity = opacity ?? (dark ? 0.015 : 0.022)

  const style: React.CSSProperties = position === 'center'
    ? {
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size, height: size,
      }
    : {
        position: 'fixed',
        bottom: '8vh', right: '6vw',
        width: size, height: size,
      }

  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      fill="none"
      style={{
        ...style,
        opacity: resolvedOpacity,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        color: dark ? '#fff' : '#000',
      }}
    >
      {/* Outer ring */}
      <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="2.5" />
      {/* Inner ring */}
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      {/* Centre dot */}
      <circle cx="60" cy="60" r="3" fill="currentColor" />

      {/* North needle (filled) */}
      <polygon points="60,8 54,60 66,60" fill="currentColor" />
      {/* South needle (outline) */}
      <polygon points="60,112 54,60 66,60" stroke="currentColor" strokeWidth="1.8" fill="none" />
      {/* East needle (outline) */}
      <polygon points="112,60 60,54 60,66" stroke="currentColor" strokeWidth="1.8" fill="none" />
      {/* West needle (outline) */}
      <polygon points="8,60 60,54 60,66" stroke="currentColor" strokeWidth="1.8" fill="none" />

      {/* Diagonal tick marks */}
      <line x1="21.5" y1="21.5" x2="27"   y2="27"   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="98.5" y1="21.5" x2="93"   y2="27"   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="21.5" y1="98.5" x2="27"   y2="93"   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="98.5" y1="98.5" x2="93"   y2="93"   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

      {/* Cardinal tick marks */}
      <line x1="60" y1="6"   x2="60" y2="11"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="109" x2="60" y2="114" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6"  y1="60"  x2="11" y2="60"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="109" y1="60" x2="114" y2="60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

      {/* Fine degree rings — very subtle */}
      <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1.2 4.5" opacity="0.35" />
      <circle cx="60" cy="60" r="38" stroke="currentColor" strokeWidth="0.4" strokeDasharray="0.8 6.5" opacity="0.2" />
    </svg>
  )
}
