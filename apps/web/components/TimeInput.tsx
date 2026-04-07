interface Props {
  value: string   // "HH:MM"
  onChange: (v: string) => void
}

const MINS = [0, 15, 30, 45]

export default function TimeInput({ value, onChange }: Props) {
  const parts = value ? value.split(':') : ['09', '00']
  const h = Math.min(23, Math.max(0, parseInt(parts[0]) || 0))
  const m = parseInt(parts[1]) || 0
  const mIdx = Math.max(0, MINS.indexOf(MINS.find(x => x >= m) ?? 0))

  function emit(newH: number, newM: number) {
    onChange(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
  }
  function bumpH(d: number) { emit((h + d + 24) % 24, MINS[mIdx]) }
  function bumpM(d: number) { emit(h, MINS[(mIdx + d + MINS.length) % MINS.length]) }

  const arrowBtn = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 10px',
        borderRadius: 6,
        color: 'var(--black)',
        fontSize: 12,
        lineHeight: 1,
        opacity: 0.4,
        transition: 'opacity 0.15s, background 0.15s',
        fontFamily: 'var(--font)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-soft)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.4'; (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
    >
      {label}
    </button>
  )

  const numStyle: React.CSSProperties = {
    fontVariantNumeric: 'tabular-nums',
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--black)',
    lineHeight: 1,
    minWidth: 36,
    textAlign: 'center',
    letterSpacing: '-0.5px',
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      background: 'var(--bg-soft)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '6px 12px',
      userSelect: 'none',
    }}>
      {/* Hours */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {arrowBtn('▲', () => bumpH(1))}
        <span style={numStyle}>{String(h).padStart(2, '0')}</span>
        {arrowBtn('▼', () => bumpH(-1))}
      </div>

      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', opacity: 0.3, margin: '0 2px', lineHeight: 1 }}>:</span>

      {/* Minutes */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {arrowBtn('▲', () => bumpM(1))}
        <span style={numStyle}>{String(MINS[mIdx]).padStart(2, '0')}</span>
        {arrowBtn('▼', () => bumpM(-1))}
      </div>
    </div>
  )
}
