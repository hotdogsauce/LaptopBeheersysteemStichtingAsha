interface Props {
  value: string
  onChange: (val: string) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export default function NumberStepper({ value, onChange, min, max, step = 1, disabled }: Props) {
  const num = parseFloat(value) || 0

  function adjust(delta: number) {
    const next = num + delta
    if (min !== undefined && next < min) return
    if (max !== undefined && next > max) return
    onChange(String(next))
  }

  const atMin = min !== undefined && num <= min
  const atMax = max !== undefined && num >= max

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 0',
    }}>
      {/* − */}
      <button
        type="button"
        onClick={() => adjust(-step)}
        disabled={atMin || disabled}
        style={{
          width: 28, height: 28,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--white)',
          color: 'var(--black)',
          cursor: atMin || disabled ? 'not-allowed' : 'pointer',
          opacity: atMin || disabled ? 0.28 : 1,
          fontFamily: 'var(--font)',
          fontSize: 18, fontWeight: 300, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity 0.13s, transform 0.12s cubic-bezier(0.34,1.56,0.64,1)',
          flexShrink: 0,
          paddingBottom: 1,
        }}
      >−</button>

      {/* Value — direct editable text, no box */}
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        style={{
          width: 36,
          textAlign: 'center',
          fontFamily: 'var(--font)',
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--black)',
          background: 'none',
          border: 'none',
          outline: 'none',
          appearance: 'textfield',
          MozAppearance: 'textfield',
          padding: 0,
        } as React.CSSProperties}
      />

      {/* + */}
      <button
        type="button"
        onClick={() => adjust(step)}
        disabled={atMax || disabled}
        style={{
          width: 28, height: 28,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--white)',
          color: 'var(--black)',
          cursor: atMax || disabled ? 'not-allowed' : 'pointer',
          opacity: atMax || disabled ? 0.28 : 1,
          fontFamily: 'var(--font)',
          fontSize: 18, fontWeight: 300, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity 0.13s, transform 0.12s cubic-bezier(0.34,1.56,0.64,1)',
          flexShrink: 0,
          paddingBottom: 1,
        }}
      >+</button>
    </div>
  )
}
