interface Props {
  value: string
  onChange: (val: string) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
}

export default function NumberStepper({ value, onChange, min, max, step = 1, placeholder, disabled }: Props) {
  const num = parseFloat(value) || 0

  function adjust(delta: number) {
    const next = num + delta
    if (min !== undefined && next < min) return
    if (max !== undefined && next > max) return
    onChange(String(next))
  }

  const atMin = min !== undefined && num <= min
  const atMax = max !== undefined && num >= max

  const btnStyle: React.CSSProperties = {
    width: 32, height: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 300, lineHeight: 1,
    fontFamily: 'var(--font)',
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    color: 'var(--black)',
    flexShrink: 0,
    transition: 'background 0.13s, opacity 0.13s',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <button
        type="button"
        style={{ ...btnStyle, borderRight: '1px solid var(--border)', borderRadius: 0, opacity: atMin || disabled ? 0.3 : 1 }}
        onClick={() => adjust(-step)}
        disabled={atMin || disabled}
        tabIndex={-1}
      >−</button>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: 48,
          padding: '6px 8px',
          textAlign: 'center',
          fontFamily: 'var(--font)',
          fontSize: 14,
          border: 'none',
          outline: 'none',
          background: 'rgba(255,255,255,0.38)',
          color: 'var(--black)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          appearance: 'textfield',
          MozAppearance: 'textfield',
        } as React.CSSProperties}
      />
      <button
        type="button"
        style={{ ...btnStyle, borderLeft: '1px solid var(--border)', borderRadius: 0, opacity: atMax || disabled ? 0.3 : 1 }}
        onClick={() => adjust(step)}
        disabled={atMax || disabled}
        tabIndex={-1}
      >+</button>
    </div>
  )
}
