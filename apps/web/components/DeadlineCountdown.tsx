import { useEffect, useState } from 'react'

function countWorkdays(from: Date, to: Date): number {
  let count = 0
  const cur = new Date(from)
  while (cur < to) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

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

function useDeadline(since: string, workdays?: number, calendarDays?: number) {
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function update() {
      const from = new Date(since)
      const deadline = workdays != null
        ? addWorkdays(from, workdays)
        : addCalendarDays(from, calendarDays!)
      const now = new Date()
      const msLeft = deadline.getTime() - now.getTime()

      if (msLeft <= 0) {
        setLabel('Wordt automatisch afgekeurd…')
        setUrgent(true)
        return
      }

      const hoursLeft = msLeft / (1000 * 60 * 60)
      const daysLeft = workdays != null
        ? countWorkdays(now, deadline)
        : Math.ceil(msLeft / (1000 * 60 * 60 * 24))

      if (hoursLeft < 24 || daysLeft === 0) {
        setUrgent(true)
        setLabel(hoursLeft < 1
          ? `${Math.ceil(msLeft / 60000)} min. resterend`
          : `${Math.ceil(hoursLeft)} uur resterend`)
      } else {
        setUrgent(false)
        const unit = workdays != null ? 'werkdag' : 'dag'
        setLabel(`${daysLeft} ${unit}${daysLeft === 1 ? '' : 'en'} resterend`)
      }
    }

    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [since, workdays, calendarDays])

  return { label, urgent }
}

interface Props {
  since: string        // ISO date string — when the request was created
  workdays?: number    // deadline in working days
  calendarDays?: number // deadline in calendar days
}

export default function DeadlineCountdown({ since, workdays, calendarDays }: Props) {
  const { label, urgent } = useDeadline(since, workdays, calendarDays)
  if (!label) return null
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          4,
      fontSize:     11,
      fontWeight:   600,
      padding:      '2px 8px',
      borderRadius: 99,
      color:         urgent ? 'var(--red)' : '#92400e',
      background:    urgent ? '#fef2f2'    : '#fffbeb',
      border:       `1px solid ${urgent ? '#fecaca' : '#fde68a'}`,
    }}>
      {label}
    </span>
  )
}
