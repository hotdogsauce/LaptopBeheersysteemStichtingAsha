import { useEffect, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { nl } from 'react-day-picker/locale'
import Layout from '../components/Layout'
import PhoneInput from '../components/PhoneInput'
import TimeInput from '../components/TimeInput'
import ReservationCalendar, { CalendarReservation } from '../components/ReservationCalendar'
import LocationPicker from '../components/LocationPicker'
import { useUser, gql } from '../context/UserContext'
import { useT } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'

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
// statusLabel is computed inside component to support i18n
const statusColor: Record<string, string> = {
  REQUESTED: '#f97316', APPROVED: '#22c55e', REJECTED: '#ef4444',
  CANCELLED: '#9ca3af', COMPLETED: '#6b7280',
}

function minDatum() {
  const d = new Date(); d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function Calendar({ reservations }: { reservations: Reservation[] }) {
  const { t } = useT()
  const statusLabel: Record<string, string> = {
    REQUESTED: t('res_requested'), APPROVED: t('res_approved'), REJECTED: t('res_rejected'),
  }
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })

  function datesForStatus(status: string): Date[] {
    const out: Date[] = []
    for (const r of reservations) {
      if (r.status !== status) continue
      const start = new Date(r.startDate); start.setHours(12)
      const end = new Date(r.endDate); end.setHours(12)
      const cur = new Date(start)
      while (cur <= end) { out.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    }
    return out
  }

  return (
    <div className="rdp-asha">
      <DayPicker
        locale={nl}
        month={month}
        onMonthChange={setMonth}
        modifiers={{
          approved: datesForStatus('APPROVED'),
          pending: datesForStatus('REQUESTED'),
        }}
        components={{
          DayButton: ({ day, modifiers, ...btnProps }) => {
            const hasApproved = Boolean(modifiers.approved)
            const hasPending = Boolean(modifiers.pending)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <button {...btnProps} />
                {(hasApproved || hasPending) && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {hasApproved && <div style={{ width: 4, height: 4, borderRadius: '50%', background: statusColor.APPROVED }} />}
                    {hasPending  && <div style={{ width: 4, height: 4, borderRadius: '50%', background: statusColor.REQUESTED }} />}
                  </div>
                )}
              </div>
            )
          },
        }}
        footer={
          <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
            {(['APPROVED', 'REQUESTED'] as const).map(k =>
              reservations.some(r => r.status === k) ? (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 5, borderRadius: 3, background: statusColor[k] }} />
                  <span style={{ fontSize: 11, color: 'var(--grey)' }}>{statusLabel[k]}</span>
                </div>
              ) : null
            )}
          </div>
        }
      />
    </div>
  )
}

export default function Aanvragen() {
  const { selectedUserId, selectedUser } = useUser()
  const { t } = useT()
  const { toast } = useToast()
  const statusLabel: Record<string, string> = {
    REQUESTED: t('res_requested'), APPROVED: t('res_approved'), REJECTED: t('res_rejected'),
    CANCELLED: t('cancel'), COMPLETED: t('tw_done'),
  }
  const [activities, setActivities] = useState<Activity[]>([])
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [availableCount, setAvailableCount] = useState<number | null>(null)
  const [view, setView] = useState<'lijst' | 'agenda'>('lijst')

  const [activityId, setActivityId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [locatie, setLocatie] = useState('')
  const [aantalLaptops, setAantalLaptops] = useState('1')
  const [doel, setDoel] = useState('')
  const [contactNaam, setContactNaam] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [extraInfo, setExtraInfo] = useState('')
  const [calReservations, setCalReservations] = useState<CalendarReservation[]>([])

  useEffect(() => {
    gql('{ activities { id title locatie software_benodigdheden } availableLaptopCount }')
      .then(data => {
        setActivities(data.data?.activities || [])
        setAvailableCount(data.data?.availableLaptopCount ?? null)
      })
  }, [])

  useEffect(() => {
    if (!selectedUserId) return
    gql('{ activeReservations { id startDate endDate aantalLaptops status locatie activity { title } } }', undefined, selectedUserId)
      .then(d => setCalReservations(d.data?.activeReservations || []))
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'OWNER') return
    herlaadAanvragen()
  }, [selectedUserId])

  useEffect(() => {
    if (selectedUser?.name && !contactNaam) setContactNaam(selectedUser.name)
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
    if (!activityId) { toast('Selecteer een activiteit.', 'error'); return }
    if (!date) { toast('Vul een datum in.', 'error'); return }
    if (date < minDatum()) { toast('De datum moet minimaal 3 dagen in de toekomst liggen.', 'error'); return }
    if (startTime >= endTime) { toast('De eindtijd moet na de starttijd liggen.', 'error'); return }
    if (!doel.trim()) { toast('Vul het doel van de aanvraag in.', 'error'); return }
    if (!contactNaam.trim()) { toast('Vul je naam in.', 'error'); return }
    const aantal = parseInt(aantalLaptops)
    if (!aantal || aantal < 1) { toast('Aantal laptops moet minimaal 1 zijn.', 'error'); return }
    if (availableCount !== null && aantal > availableCount) {
      toast(`Er zijn momenteel slechts ${availableCount} beschikbare laptop(s). Je vroeg om ${aantal}.`, 'error'); return
    }

    const contactInfo = contactNaam.trim() + (contactPhone ? ` — ${contactPhone}` : '')
    const startDate = `${date}T${startTime}:00`
    const endDate = `${date}T${endTime}:00`

    const data = await gql(
      `mutation($userId: ID!, $activityId: ID!, $startDate: String!, $endDate: String!, $aantalLaptops: Int!, $doel: String!, $contact_info: String!, $extra_info: String, $locatie: String) {
        requestReservation(userId: $userId, activityId: $activityId, startDate: $startDate, endDate: $endDate, aantalLaptops: $aantalLaptops, doel: $doel, contact_info: $contact_info, extra_info: $extra_info, locatie: $locatie) {
          id status
        }
      }`,
      { userId: selectedUserId, activityId, startDate, endDate, aantalLaptops: aantal, doel, contact_info: contactInfo, extra_info: extraInfo.trim() || null, locatie: locatie || null },
      selectedUserId
    )
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      toast('Aanvraag ingediend. De beheerder beoordeelt dit binnen 3 werkdagen.')
      setActivityId(''); setDate(''); setStartTime('09:00'); setEndTime('10:00')
      setLocatie(''); setAantalLaptops('1'); setDoel(''); setContactPhone(''); setExtraInfo('')
      herlaadAanvragen()
      gql('{ activeReservations { id startDate endDate aantalLaptops status locatie activity { title } } }', undefined, selectedUserId)
        .then(d => setCalReservations(d.data?.activeReservations || []))
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
      toast(data.errors[0].message, 'error')
    } else {
      toast('Aanvraag geannuleerd.')
      herlaadAanvragen()
    }
  }

  const selectedActivity = activities.find(a => a.id === activityId)

  return (
    <Layout title={t('req_title')} subtitle={t('req_sub')}>

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <p className="empty-text">{t('select_user')}</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'OWNER' && (
        <div className="alert alert-error">Deze pagina is alleen toegankelijk voor eigenaren van activiteiten.</div>
      )}

      {selectedUserId && selectedUser?.role === 'OWNER' && (
        <>
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{t('req_new')}</h2>
              {availableCount !== null && (
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: availableCount === 0 ? 'var(--red)' : '#15803d',
                  background: availableCount === 0 ? '#fef2f2' : '#dcfce7',
                  border: `1px solid ${availableCount === 0 ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: 99, padding: '3px 10px',
                }}>
                  {availableCount} {t('req_available')}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="label">{t('req_activity')}</label>
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

              <div>
                <label className="label">Datum *</label>
                <ReservationCalendar
                  value={date}
                  onChange={setDate}
                  reservations={calReservations}
                  minDate={minDatum()}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">Starttijd *</label>
                  <TimeInput value={startTime} onChange={setStartTime} />
                </div>
                <div>
                  <label className="label">Eindtijd *</label>
                  <TimeInput value={endTime} onChange={setEndTime} />
                </div>
              </div>

              <div>
                <label className="label">Locatie</label>
                <LocationPicker value={locatie} onChange={setLocatie} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16 }}>
                <div>
                  <label className="label">{t('req_count')}</label>
                  <input
                    type="number" className="input" min="1"
                    max={availableCount ?? undefined}
                    value={aantalLaptops}
                    onChange={e => setAantalLaptops(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">{t('req_goal')}</label>
                <textarea className="input" placeholder="Waarvoor worden de laptops gebruikt?" value={doel} onChange={e => setDoel(e.target.value)} style={{ minHeight: 70, resize: 'vertical' }} />
              </div>

              <div>
                <label className="label">{t('req_name')}</label>
                <input className="input" placeholder="bijv. Jan de Vries" value={contactNaam} onChange={e => setContactNaam(e.target.value)} />
              </div>

              <div>
                <label className="label">{t('req_phone')}</label>
                <PhoneInput value={contactPhone} onChange={setContactPhone} />
              </div>

              <div>
                <label className="label">{t('req_extra')}</label>
                <textarea className="input" placeholder="bijzonderheden, speciale vereisten..." value={extraInfo} onChange={e => setExtraInfo(e.target.value)} style={{ minHeight: 60, resize: 'vertical' }} />
              </div>

              <div>
                <button className="btn btn-primary" onClick={doeAanvraag}>{t('req_submit')}</button>
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
                  {v === 'lijst' ? t('req_list') : t('req_agenda')}
                </button>
              ))}
            </div>
          </div>

          {myReservations.length === 0 && (
            <div className="empty" style={{ padding: '40px 0' }}>
              <p className="empty-text">{t('req_empty')}</p>
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
                          {t('req_helpdesk')}
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
