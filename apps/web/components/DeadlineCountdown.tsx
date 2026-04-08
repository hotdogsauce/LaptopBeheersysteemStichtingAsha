import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

function addWorkdays(from: Date, days: number): Date {
  const d = new Date(from)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d
}

function addCalendarDays(from: Date, days: number): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d
}

interface Segment { value: number; unit: string }

function useDeadline(since: string, workdays?: number, calendarDays?: number) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [expired, setExpired] = useState(false)
  const [urgent, setUrgent]   = useState(false)

  useEffect(() => {
    function update() {
      const from = new Date(since)
      if (isNaN(from.getTime())) return

      const deadline = workdays != null
        ? addWorkdays(from, workdays)
        : addCalendarDays(from, calendarDays!)
      const msLeft = deadline.getTime() - Date.now()

      if (msLeft <= 0) { setExpired(true); setUrgent(true); setSegments([]); return }

      setExpired(false)
      const dur = dayjs.duration(msLeft)
      const d = Math.floor(dur.asDays())
      const h = dur.hours()
      const m = dur.minutes()

      setUrgent(d === 0)

      if (d > 0)      setSegments([{ value: d, unit: d === 1 ? 'dag' : 'dagen' }])
      else if (h > 0) setSegments([{ value: h, unit: h === 1 ? 'uur' : 'uur' }])
      else            setSegments([{ value: Math.max(1, m), unit: 'min' }])
    }

    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [since, workdays, calendarDays])

  return { segments, expired, urgent }
}

interface Props {
  since:         string
  workdays?:     number
  calendarDays?: number
}

export default function DeadlineCountdown({ since, workdays, calendarDays }: Props) {
  const { segments, expired, urgent } = useDeadline(since, workdays, calendarDays)

  const color  = urgent ? 'var(--red)' : '#92400e'
  const bg     = urgent ? '#fef2f2'    : '#fffbeb'
  const border = urgent ? '#fecaca'    : '#fde68a'

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          4,
      fontSize:     11,
      fontWeight:   600,
      padding:      '2px 10px',
      borderRadius: 99,
      color,
      background:   bg,
      border:       `1px solid ${border}`,
      whiteSpace:   'nowrap',
    }}>
      {expired ? 'Vervalt binnenkort…' : (
        <>
          {segments.map((s, i) => (
            <span key={i}>
              <span style={{ fontSize: 13 }}>{s.value}</span>
              <span style={{ opacity: 0.75, marginLeft: 2 }}>{s.unit}</span>
              {i < segments.length - 1 && <span style={{ opacity: 0.4, margin: '0 2px' }}>·</span>}
            </span>
          ))}
          <span style={{ opacity: 0.6, marginLeft: 3 }}>resterend</span>
        </>
      )}
    </span>
  )
}
