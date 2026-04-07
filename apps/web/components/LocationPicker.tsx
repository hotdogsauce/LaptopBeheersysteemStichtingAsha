import { motion } from 'framer-motion'

export const LOCATIONS = [
  'Grote Zaal',
  'Danszaal',
  'Vergaderruimte 1',
  'Vergaderruimte 2',
  'Klaslokaal 1',
  'Computerlokaal',
  'Muziekkamer',
  'Atelier',
  'Keuken',
  'Zaal A',
  'Zaal B',
]

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function LocationPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {LOCATIONS.map(loc => {
        const selected = value === loc
        return (
          <motion.button
            key={loc}
            type="button"
            onClick={() => onChange(selected ? '' : loc)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              position: 'relative',
              padding: '7px 16px',
              borderRadius: 99,
              border: selected ? '1px solid var(--black)' : '1px solid var(--border)',
              background: selected ? 'var(--black)' : 'transparent',
              color: selected ? 'var(--white)' : 'var(--black)',
              fontSize: 13,
              fontWeight: selected ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
          >
            {loc}
          </motion.button>
        )
      })}
    </div>
  )
}
