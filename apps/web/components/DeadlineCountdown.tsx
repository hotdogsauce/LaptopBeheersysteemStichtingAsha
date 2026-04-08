import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

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

interface State { text: string; urgent: boolean }

function useDeadline(since: string | undefined, workdays?: number, calendarDays?: number): State {
  const [state, setState] = useState<State>({ text: '', urgent: false })

  useEffect(() => {
    if (!since) return

    function update() {
      const from = new Date(since!)
      if (isNaN(from.getTime())) return

      const deadline = workdays != null
        ? addWorkdays(from, workdays)
        : addCalendarDays(from, calendarDays!)

      const msLeft = deadline.getTime() - Date.now()

      if (msLeft <= 0) {
        setState({ text: 'Vervalt binnenkort', urgent: true })
        return
      }

      const dur      = dayjs.duration(msLeft)
      const now      = new Date()
      const daysLeft = workdays != null
        ? countWorkdays(now, deadline)
        : Math.ceil(msLeft / (1000 * 60 * 60 * 24))
      const h = dur.hours()
      const m = dur.minutes()

      if (daysLeft > 0) setState({ text: `Nog ${daysLeft} ${workdays != null ? (daysLeft === 1 ? 'werkdag' : 'werkdagen') : (daysLeft === 1 ? 'dag' : 'dagen')}`, urgent: false })
      else if (h > 0)   setState({ text: `Nog ${h} uur`,             urgent: true })
      else              setState({ text: `Nog ${Math.max(1, m)} min.`, urgent: true })
    }

    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [since, workdays, calendarDays])

  return state
}

interface Props {
  since?:        string
  workdays?:     number
  calendarDays?: number
}

export default function DeadlineCountdown({ since, workdays, calendarDays }: Props) {
  const { text, urgent } = useDeadline(since, workdays, calendarDays)
  if (!text) return null

  return (
    <span style={{
      fontSize:   11,
      fontWeight: 500,
      color:      urgent ? 'var(--red)' : 'var(--grey)',
      letterSpacing: '0.01em',
    }}>
      {text}
    </span>
  )
}
