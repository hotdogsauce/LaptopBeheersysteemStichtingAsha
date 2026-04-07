import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
]

export interface CalendarReservation {
  id: string
  startDate: string
  endDate: string
  aantalLaptops: number
  status: string
  locatie: string | null
  activity: { title: string }
}

interface Props {
  value: string                        // "YYYY-MM-DD"
  onChange: (date: string) => void
  reservations: CalendarReservation[]
  minDate: string                      // "YYYY-MM-DD" — dates before this are disabled
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLOR: Record<string, string> = {
  APPROVED: '#22c55e',
  REQUESTED: '#f97316',
}
const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Goedgekeurd',
  REQUESTED: 'In afwachting',
}
const STATUS_BG: Record<string, { bg: string; border: string; text: string }> = {
  APPROVED: { bg: '#dcfce7', border: '#bbf7d0', text: '#15803d' },
  REQUESTED: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
}

export default function ReservationCalendar({ value, onChange, reservations, minDate }: Props) {
  const [direction, setDirection] = useState(0)

  const initial = value ? new Date(value + 'T12:00:00') : (() => {
    const d = new Date(minDate + 'T12:00:00'); d.setDate(1); return d
  })()
  initial.setDate(1)

  const [viewDate, setViewDate] = useState(initial)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  function navigate(delta: number) {
    setDirection(delta)
    setViewDate(new Date(year, month + delta, 1))
  }

  // Build grid cells
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isDisabled(day: number) {
    return dateStr(day) < minDate
  }

  function resForDay(day: number) {
    const d = dateStr(day)
    return reservations.filter(r => r.startDate.slice(0, 10) === d)
  }

  const selectedRes = value
    ? reservations.filter(r => r.startDate.slice(0, 10) === value)
    : []

  const todayStr = new Date().toISOString().slice(0, 10)

  const navBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px 12px', borderRadius: 8,
    fontSize: 16, color: 'var(--black)', fontFamily: 'var(--font)',
    opacity: 0.5, transition: 'opacity 0.15s',
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      background: 'var(--white)',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-soft)',
      }}>
        <button
          type="button" style={navBtn}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
          onClick={() => navigate(-1)}
        >←</button>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.p
            key={`${year}-${month}`}
            custom={direction}
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--black)' }}
          >
            {MONTHS[month]} {year}
          </motion.p>
        </AnimatePresence>

        <button
          type="button" style={navBtn}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
          onClick={() => navigate(1)}
        >→</button>
      </div>

      {/* ── Grid ── */}
      <div style={{ padding: '12px 16px 8px' }}>
        {/* Weekday labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {WEEKDAYS.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 11, fontWeight: 600,
              color: 'var(--grey)', padding: '4px 0',
            }}>{d}</div>
          ))}
        </div>

        {/* Day cells — slides on month change */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${year}-${month}`}
            custom={direction}
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}
          >
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const ds = dateStr(day)
              const disabled = isDisabled(day)
              const selected = value === ds
              const isToday = ds === todayStr
              const dayRes = resForDay(day)
              const hasApproved = dayRes.some(r => r.status === 'APPROVED')
              const hasPending = dayRes.some(r => r.status === 'REQUESTED')

              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', padding: '2px 0',
                }}>
                  <motion.button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onChange(ds)}
                    whileHover={!disabled ? { scale: 1.12 } : {}}
                    whileTap={!disabled ? { scale: 0.93 } : {}}
                    style={{
                      position: 'relative',
                      width: 34, height: 34,
                      borderRadius: '50%',
                      border: isToday && !selected ? '1.5px solid var(--border)' : 'none',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: 'transparent',
                      color: disabled ? 'var(--border)' : selected ? 'var(--white)' : 'var(--black)',
                      fontSize: 13,
                      fontWeight: selected || isToday ? 700 : 400,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font)',
                      zIndex: 0,
                    }}
                  >
                    {selected && (
                      <motion.span
                        layoutId="cal-sel"
                        style={{
                          position: 'absolute', inset: 0,
                          borderRadius: '50%',
                          background: 'var(--black)',
                          zIndex: 0,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{day}</span>
                  </motion.button>

                  {/* Dots */}
                  {(hasApproved || hasPending) && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
                      {hasApproved && <div style={{ width: 4, height: 4, borderRadius: '50%', background: STATUS_COLOR.APPROVED }} />}
                      {hasPending  && <div style={{ width: 4, height: 4, borderRadius: '50%', background: STATUS_COLOR.REQUESTED }} />}
                    </div>
                  )}
                </div>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 10, padding: '0 2px' }}>
          {[['APPROVED', 'Goedgekeurd'], ['REQUESTED', 'In afwachting']].map(([k, l]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[k] }} />
              <span style={{ fontSize: 11, color: 'var(--grey)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <AnimatePresence>
        {value && (
          <motion.div
            key={value}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              padding: '14px 18px 16px',
            }}>
              <p style={{
                margin: '0 0 10px',
                fontSize: 11, fontWeight: 700,
                color: 'var(--grey)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {new Date(value + 'T12:00:00').toLocaleDateString('nl-NL', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </p>

              {selectedRes.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--grey)' }}>
                  Geen reserveringen op deze dag.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {selectedRes.map((r, i) => {
                    const s = STATUS_BG[r.status] ?? STATUS_BG.REQUESTED
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          background: 'var(--bg-soft)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 10,
                          padding: '10px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--black)' }}>
                            {r.activity.title}
                          </p>
                          <span style={{
                            flexShrink: 0,
                            fontSize: 10, fontWeight: 600,
                            color: s.text, background: s.bg,
                            border: `1px solid ${s.border}`,
                            borderRadius: 99, padding: '2px 8px',
                          }}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                            🕐 {fmtTime(r.startDate)}–{fmtTime(r.endDate)}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                            💻 {r.aantalLaptops} laptop{r.aantalLaptops !== 1 ? 's' : ''}
                          </span>
                          {r.locatie && (
                            <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                              📍 {r.locatie}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
