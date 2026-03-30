import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'

interface Activity {
  id: string
  title: string
  locatie: string | null
  software_benodigdheden: string | null
}

interface Reservation {
  id: string
  status: string
  startDate: string
  endDate: string
  aantalLaptops: number
  doel: string
  rejectionReason: string | null
  activity: { title: string }
  laptops: { id: string; merk_type: string }[]
}

const statusBadge: Record<string, string> = {
  REQUESTED: 'badge-pending', APPROVED: 'badge-approved', REJECTED: 'badge-rejected',
  CANCELLED: 'badge-oos', COMPLETED: 'badge-in-use',
}
const statusLabel: Record<string, string> = {
  REQUESTED: 'In afwachting', APPROVED: 'Goedgekeurd', REJECTED: 'Afgewezen',
  CANCELLED: 'Geannuleerd', COMPLETED: 'Afgerond',
}
const statusColor: Record<string, string> = {
  REQUESTED: '#f97316', APPROVED: '#22c55e', REJECTED: '#ef4444',
  CANCELLED: '#9ca3af', COMPLETED: '#6b7280',
}

function minDatum() {
  const d = new Date(); d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}
function maxDatum() {
  const d = new Date(); d.setDate(d.getDate() + 21)
  return d.toISOString().split('T')[0]
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MONTHS = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

function Calendar({ reservations }: { reservations: Reservation[] }) {
  const [cur, setCur] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })

  const year = cur.getFullYear()
  const month = cur.getMonth()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  function getForDay(day: number) {
    const date = new Date(year, month, day)
    date.setHours(12)
    return reservations.filter(r => {
      const s = new Date(r.startDate); s.setHours(0)
      const e = new Date(r.endDate); e.setHours(23, 59)
      return date >= s && date <= e
    })
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 10px', fontSize: 13 }}
          onClick={() => setCur(new Date(year, month - 1, 1))}
        >←</button>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>
          {MONTHS[month]} {year}
        </p>
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 10px', fontSize: 13 }}
          onClick={() => setCur(new Date(year, month + 1, 1))}
        >→</button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--grey)', padding: '4px 0', fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dayRes = getForDay(day)
          return (
            <div
              key={i}
              style={{
                minHeight: 52, padding: '4px 6px', borderRadius: 6,
                background: isToday(day) ? 'var(--bg-soft)' : 'transparent',
                border: isToday(day) ? '1px solid var(--border)' : '1px solid transparent',
                position: 'relative',
              }}
            >
              <p style={{
                margin: 0, fontSize: 12, fontWeight: isToday(day) ? 700 : 400,
                color: isToday(day) ? 'var(--black)' : 'var(--grey)',
                lineHeight: 1,
              }}>{day}</p>
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayRes.slice(0, 2).map(r => (
                  <div
                    key={r.id}
                    title={`${r.activity.title} — ${statusLabel[r.status]}`}
                    style={{
                      height: 5, borderRadius: 3,
                      background: statusColor[r.status] || 'var(--grey)',
                    }}
                  />
                ))}
                {dayRes.length > 2 && (
                  <p style={{ margin: 0, fontSize: 9, color: 'var(--grey)', lineHeight: 1 }}>
                    +{dayRes.length - 2}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
        {Object.entries(statusLabel)
          .filter(([k]) => reservations.some(r => r.status === k))
          .map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 5, borderRadius: 3, background: statusColor[k] }} />
              <span style={{ fontSize: 11, color: 'var(--grey)' }}>{v}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function Aanvragen() {
  const { selectedUserId, selectedUser } = useUser()
  const [activities, setActivities] = useState<Activity[]>([])
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [availableCount, setAvailableCount] = useState<number | null>(null)
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)
  const [view, setView] = useState<'lijst' | 'agenda'>('lijst')

  const [activityId, setActivityId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [aantalLaptops, setAantalLaptops] = useState('1')
  const [doel, setDoel] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [extraInfo, setExtraInfo] = useState('')

  useEffect(() => {
    gql('{ activities { id title locatie software_benodigdheden } availableLaptopCount }')
      .then(data => {
        setActivities(data.data?.activities || [])
        setAvailableCount(data.data?.availableLaptopCount ?? null)
      })
  }, [])

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'OWNER') return
    herlaadAanvragen()
  }, [selectedUserId])

  useEffect(() => {
    if (selectedUser?.name && !contactInfo) setContactInfo(selectedUser.name)
  }, [selectedUser?.name])

  function herlaadAanvragen() {
    gql(
      `query($userId: ID!) { myReservations(userId: $userId) {
        id status startDate endDate aantalLaptops doel rejectionReason
        activity { title }
        laptops { id merk_type }
      } }`,
      { userId: selectedUserId },
      selectedUserId
    ).then(data => setMyReservations(data.data?.myReservations || []))
  }

  async function doeAanvraag() {
    if (!activityId) { setBericht({ text: 'Selecteer een activiteit.', type: 'fout' }); return }
    if (!startDate) { setBericht({ text: 'Vul een startdatum in.', type: 'fout' }); return }
    if (!endDate) { setBericht({ text: 'Vul een einddatum in.', type: 'fout' }); return }
    if (!doel.trim()) { setBericht({ text: 'Vul het doel van de aanvraag in.', type: 'fout' }); return }
    if (!contactInfo.trim()) { setBericht({ text: 'Vul je contactgegevens in.', type: 'fout' }); return }
    const aantal = parseInt(aantalLaptops)
    if (!aantal || aantal < 1) { setBericht({ text: 'Aantal laptops moet minimaal 1 zijn.', type: 'fout' }); return }
    if (availableCount !== null && aantal > availableCount) {
      setBericht({ text: `Er zijn momenteel slechts ${availableCount} beschikbare laptop(s).`, type: 'fout' }); return
    }

    const data = await gql(
      `mutation($userId: ID!, $activityId: ID!, $startDate: String!, $endDate: String!, $aantalLaptops: Int!, $doel: String!, $contact_info: String!, $extra_info: String) {
        requestReservation(userId: $userId, activityId: $activityId, startDate: $startDate, endDate: $endDate, aantalLaptops: $aantalLaptops, doel: $doel, contact_info: $contact_info, extra_info: $extra_info) {
          id status
        }
      }`,
      { userId: selectedUserId, activityId, startDate, endDate, aantalLaptops: aantal, doel, contact_info: contactInfo, extra_info: extraInfo.trim() || null },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: 'Aanvraag ingediend. De beheerder beoordeelt dit binnen 3 werkdagen.', type: 'ok' })
      setActivityId(''); setStartDate(''); setEndDate('')
      setAantalLaptops('1'); setDoel(''); setExtraInfo('')
      herlaadAanvragen()
    }
  }

  async function annuleer(reservationId: string) {
    const data = await gql(
      `mutation($reservationId: ID!, $userId: ID!) {
        cancelReservation(reservationId: $reservationId, userId: $userId) { id status }
      }`,
      { reservationId, userId: selectedUserId },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: 'Aanvraag geannuleerd.', type: 'ok' })
      herlaadAanvragen()
    }
  }

  const selectedActivity = activities.find(a => a.id === activityId)

  return (
    <Layout title="Laptops aanvragen" subtitle="Dien een reserveringsaanvraag in voor jouw activiteit">

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'OWNER' && (
        <div className="alert alert-error">Deze pagina is alleen toegankelijk voor eigenaren van activiteiten.</div>
      )}

      {selectedUserId && selectedUser?.role === 'OWNER' && (
        <>
          {bericht && (
            <div className={bericht.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'}>
              {bericht.text}
            </div>
          )}

          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Nieuwe aanvraag</h2>
              {availableCount !== null && (
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: availableCount === 0 ? 'var(--red)' : '#15803d',
                  background: availableCount === 0 ? '#fef2f2' : '#dcfce7',
                  border: `1px solid ${availableCount === 0 ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: 99, padding: '3px 10px',
                }}>
                  {availableCount} laptop{availableCount !== 1 ? 's' : ''} beschikbaar
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="label">Activiteit *</label>
                <select className="input" value={activityId} onChange={e => setActivityId(e.target.value)}>
                  <option value="">— Selecteer activiteit —</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.title}{a.locatie ? ` (${a.locatie})` : ''}</option>
                  ))}
                </select>
                {selectedActivity?.locatie && (
                  <p style={{ fontSize: 12, color: 'var(--grey)', margin: '4px 0 0' }}>Locatie: {selectedActivity.locatie}</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">Startdatum *</label>
                  <input type="date" className="input" min={minDatum()} max={maxDatum()} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Einddatum *</label>
                  <input type="date" className="input" min={startDate || minDatum()} max={maxDatum()} value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--grey)', margin: '-8px 0 0' }}>
                Minimaal 3 dagen vooruit · maximaal 3 weken van tevoren
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16 }}>
                <div>
                  <label className="label">Aantal laptops *</label>
                  <input
                    type="number" className="input" min="1"
                    max={availableCount ?? undefined}
                    value={aantalLaptops}
                    onChange={e => setAantalLaptops(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Doel van de aanvraag *</label>
                <textarea className="input" placeholder="Waarvoor worden de laptops gebruikt?" value={doel} onChange={e => setDoel(e.target.value)} style={{ minHeight: 70, resize: 'vertical' }} />
              </div>

              <div>
                <label className="label">Uw naam en contactgegevens *</label>
                <input className="input" placeholder="bijv. Jan de Vries — 06-12345678" value={contactInfo} onChange={e => setContactInfo(e.target.value)} />
              </div>

              <div>
                <label className="label">Onvoorziene relevante informatie (optioneel)</label>
                <textarea className="input" placeholder="bijzonderheden, speciale vereisten..." value={extraInfo} onChange={e => setExtraInfo(e.target.value)} style={{ minHeight: 60, resize: 'vertical' }} />
              </div>

              <div>
                <button className="btn btn-primary" onClick={doeAanvraag}>Aanvraag indienen</button>
              </div>
            </div>
          </div>

          {/* Reserveringen header + toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>
              Mijn aanvragen{' '}
              <span style={{ fontWeight: 400, color: 'var(--grey)', fontSize: 14 }}>({myReservations.length})</span>
            </h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['lijst', 'agenda'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    border: 'none', cursor: 'pointer',
                    fontSize: 12, padding: '4px 12px', borderRadius: 99,
                    fontWeight: view === v ? 600 : 400,
                    color: view === v ? 'var(--black)' : 'var(--grey)',
                    background: view === v ? 'var(--bg-soft)' : 'transparent',
                    fontFamily: 'var(--font)',
                  } as React.CSSProperties}
                >
                  {v === 'lijst' ? 'Lijst' : 'Agenda'}
                </button>
              ))}
            </div>
          </div>

          {myReservations.length === 0 && (
            <div className="empty" style={{ padding: '40px 0' }}>
              <p className="empty-text">Nog geen aanvragen ingediend.</p>
            </div>
          )}

          {/* Agenda (calendar) view */}
          {view === 'agenda' && myReservations.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <Calendar reservations={myReservations} />
            </div>
          )}

          {/* Lijst view */}
          {view === 'lijst' && (
            <div style={{ display: 'grid', gap: 8 }}>
              {myReservations.map(r => (
                <div key={r.id} className="card-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{r.activity.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--grey)', margin: '4px 0 0' }}>
                        {fmtShort(r.startDate)} → {fmtShort(r.endDate)}
                        {' · '}{r.aantalLaptops} laptop{r.aantalLaptops !== 1 ? 's' : ''}
                      </p>
                      {r.doel && (
                        <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>Doel: {r.doel}</p>
                      )}
                      {r.status === 'APPROVED' && r.laptops.length > 0 && (
                        <p style={{ fontSize: 12, color: '#15803d', margin: '2px 0 0' }}>
                          Laptops: {r.laptops.map(l => l.merk_type).join(', ')}
                        </p>
                      )}
                      {r.status === 'APPROVED' && r.laptops.length === 0 && (
                        <p style={{ fontSize: 12, color: '#92400e', margin: '2px 0 0' }}>
                          Helpdesk wijst laptops toe…
                        </p>
                      )}
                      {r.rejectionReason && (
                        <p style={{ fontSize: 12, color: 'var(--red)', margin: '4px 0 0' }}>Reden: {r.rejectionReason}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span className={`badge ${statusBadge[r.status] || ''}`}>{statusLabel[r.status] || r.status}</span>
                      {(r.status === 'REQUESTED' || r.status === 'APPROVED') && (
                        <button className="btn btn-danger-ghost" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => annuleer(r.id)}>
                          Annuleren
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
