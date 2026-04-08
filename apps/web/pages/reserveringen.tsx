import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import Layout from '../components/Layout'
import PhoneInput from '../components/PhoneInput'
import TimeInput from '../components/TimeInput'
import ReservationCalendar, { CalendarReservation } from '../components/ReservationCalendar'
import LocationPicker from '../components/LocationPicker'
import { useUser, gql } from '../context/UserContext'
import { useT } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import NumberStepper from '../components/NumberStepper'

interface Reservation {
  id: string
  status: string
  startDate: string
  endDate: string
  aantalLaptops: number
  doel: string
  contact_info: string
  extra_info: string | null
  rejectionReason: string | null
  requester: { name: string }
  activity: { title: string; locatie: string | null }
}

interface Activity { id: string; title: string }
interface Owner { id: string; name: string }

function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ width: 180, height: 15 }} />
          <div className="skeleton" style={{ width: 130, height: 12 }} />
          <div className="skeleton" style={{ width: 100, height: 12 }} />
        </div>
        <div className="skeleton" style={{ width: 90, height: 22, borderRadius: 99 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 34, borderRadius: 5 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ flex: 1, height: 34, borderRadius: 40 }} />
        <div className="skeleton" style={{ flex: 1, height: 34, borderRadius: 40 }} />
      </div>
    </div>
  )
}

function minDatum() {
  const d = new Date(); d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

export default function Reserveringen() {
  const { selectedUserId, selectedUser } = useUser()
  const { t } = useT()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [reserveringen, setReserveringen] = useState<Reservation[]>([])
  const [reden, setReden] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Admin: reservering namens eigenaar aanmaken
  const [showForm, setShowForm] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [forUserId, setForUserId] = useState('')
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
  const [saving, setSaving] = useState(false)
  const [calReservations, setCalReservations] = useState<CalendarReservation[]>([])

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'ADMIN') return
    gql('{ activeReservations { id startDate endDate aantalLaptops status locatie activity { title } } }', undefined, selectedUserId)
      .then(d => setCalReservations(d.data?.activeReservations || []))
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'ADMIN') return
    setLoading(true)
    gql(
      '{ pendingReservations { id status startDate endDate aantalLaptops doel contact_info extra_info rejectionReason requester { name } activity { title locatie } } }',
      undefined, selectedUserId
    ).then(data => { setReserveringen(data.data?.pendingReservations || []); setLoading(false) })
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'ADMIN') return
    gql('{ activities { id title } users { id name role } }', undefined, selectedUserId)
      .then(d => {
        setActivities(d.data?.activities || [])
        setOwners((d.data?.users || []).filter((u: any) => u.role === 'OWNER'))
      })
  }, [selectedUserId])

  async function beoordeel(reservationId: string, approve: boolean, activityTitle: string) {
    const reason = reden[reservationId]
    if (!approve && !reason) { toast('Vul een reden in bij afwijzing.', 'error'); return }
    if (approve) {
      const ok = await confirm(`Reservering voor "${activityTitle}" goedkeuren?`)
      if (!ok) return
    }
    const data = await gql(
      `mutation($id: ID!, $adminId: ID!, $approve: Boolean!, $reason: String) {
        reviewReservation(reservationId: $id, adminId: $adminId, approve: $approve, reason: $reason) { id status }
      }`,
      { id: reservationId, adminId: selectedUserId, approve, reason: reason || null },
      selectedUserId
    )
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      toast(approve ? 'Reservering goedgekeurd.' : 'Reservering afgewezen.')
      if (approve) {
        confetti({
          particleCount: 72,
          spread: 55,
          origin: { y: 0.55 },
          colors: ['#ffffff', '#e0e8f0', '#b0c8e0', '#000000'],
          scalar: 0.9,
          gravity: 1.1,
          ticks: 180,
        })
      }
      setReserveringen(prev => prev.filter(r => r.id !== reservationId))
    }
  }

  async function maakReservering() {
    if (!forUserId) { toast('Selecteer een eigenaar.', 'error'); return }
    if (!activityId) { toast('Selecteer een activiteit.', 'error'); return }
    if (!date) { toast('Vul een datum in.', 'error'); return }
    if (date < minDatum()) { toast('De datum moet minimaal 3 dagen in de toekomst liggen.', 'error'); return }
    if (startTime >= endTime) { toast('De eindtijd moet na de starttijd liggen.', 'error'); return }
    if (!doel.trim()) { toast('Vul het doel in.', 'error'); return }
    if (!contactNaam.trim()) { toast('Vul de naam van de eigenaar in.', 'error'); return }
    const aantal = parseInt(aantalLaptops) || 1
    const contactInfo = contactNaam.trim() + (contactPhone ? ` — ${contactPhone}` : '')
    const startDate = `${date}T${startTime}:00`
    const endDate = `${date}T${endTime}:00`
    setSaving(true)
    const data = await gql(
      `mutation($userId: ID!, $activityId: ID!, $startDate: String!, $endDate: String!, $aantalLaptops: Int!, $doel: String!, $contact_info: String!, $extra_info: String, $locatie: String) {
        requestReservation(userId: $userId, activityId: $activityId, startDate: $startDate, endDate: $endDate, aantalLaptops: $aantalLaptops, doel: $doel, contact_info: $contact_info, extra_info: $extra_info, locatie: $locatie) { id status }
      }`,
      { userId: forUserId, activityId, startDate, endDate, aantalLaptops: aantal, doel, contact_info: contactInfo, extra_info: extraInfo.trim() || null, locatie: locatie || null },
      selectedUserId
    )
    setSaving(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Reservering aangemaakt.')
    setShowForm(false); setForUserId(''); setActivityId(''); setDate(''); setStartTime('09:00'); setEndTime('10:00')
    setLocatie(''); setAantalLaptops('1'); setDoel(''); setContactNaam(''); setContactPhone(''); setExtraInfo('')
    gql('{ activeReservations { id startDate endDate aantalLaptops status locatie activity { title } } }', undefined, selectedUserId)
      .then(d => setCalReservations(d.data?.activeReservations || []))
    gql('{ pendingReservations { id status startDate endDate aantalLaptops doel contact_info extra_info rejectionReason requester { name } activity { title locatie } } }', undefined, selectedUserId)
      .then(d => setReserveringen(d.data?.pendingReservations || []))
  }

  return (
    <Layout title={t('res_title')} subtitle={t('res_sub')}>

      {!selectedUserId && (
        <div className="empty"><div className="empty-icon">📋</div>
          <p className="empty-text">{t('select_user')}</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'ADMIN' && (
        <div className="alert alert-error">{t('res_no_access')}</div>
      )}

      {selectedUserId && selectedUser?.role === 'ADMIN' && (
        <>
          {/* Reservering aanmaken namens eigenaar */}
          <div style={{ marginBottom: 32 }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(v => !v)}>
              {showForm ? `✕ ${t('cancel')}` : t('res_add')}
            </button>

            {showForm && (
              <div className="card" style={{ marginTop: 16, display: 'grid', gap: 16, backgroundImage: 'none', backgroundColor: 'var(--bg-soft)' }}>
                <div>
                  <label className="label">{t('res_form_owner')}</label>
                  <select className="input" value={forUserId} onChange={e => setForUserId(e.target.value)}>
                    <option value="">— Selecteer eigenaar —</option>
                    {owners.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t('res_form_activity')}</label>
                  <select className="input" value={activityId} onChange={e => setActivityId(e.target.value)}>
                    <option value="">— Selecteer activiteit —</option>
                    {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
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
                    <label className="label">{t('res_form_start')}</label>
                    <TimeInput value={startTime} onChange={setStartTime} />
                  </div>
                  <div>
                    <label className="label">{t('res_form_end')}</label>
                    <TimeInput value={endTime} onChange={setEndTime} />
                  </div>
                </div>

                <div>
                  <label className="label">Locatie</label>
                  <LocationPicker value={locatie} onChange={setLocatie} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
                  <div>
                    <label className="label">{t('res_form_count')}</label>
                    <NumberStepper value={aantalLaptops} onChange={setAantalLaptops} min={1} />
                  </div>
                </div>
                <div>
                  <label className="label">Doel van de aanvraag *</label>
                  <input className="input" placeholder="bijv. praktijkles, examen..." value={doel} onChange={e => setDoel(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('res_form_name')}</label>
                  <input className="input" placeholder="bijv. Jan de Vries" value={contactNaam} onChange={e => setContactNaam(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('res_form_phone')}</label>
                  <PhoneInput value={contactPhone} onChange={setContactPhone} />
                </div>
                <div>
                  <label className="label">{t('res_form_extra')}</label>
                  <input className="input" placeholder="bijzonderheden..." value={extraInfo} onChange={e => setExtraInfo(e.target.value)} />
                </div>
                <div>
                  <button className="btn btn-primary" disabled={saving} onClick={maakReservering}>
                    {saving ? t('saving') : t('res_form_submit')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div style={{ display: 'grid', gap: 16 }}>
              {[1, 2].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && reserveringen.length === 0 && (
            <div className="empty"><div className="empty-icon">✓</div>
              <p className="empty-text">{t('res_empty')}</p>
            </div>
          )}

          {!loading && reserveringen.length > 0 && (
            <div style={{ display: 'grid', gap: 16 }}>
              {reserveringen.map(r => (
                <div key={r.id} className="card" style={{ backgroundImage: 'none', backgroundColor: 'var(--bg-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: 8 }}>{r.activity.title}</h3>
                      <div style={{ display: 'grid', gap: 3 }}>
                        <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>
                          <strong style={{ color: 'var(--black)', fontWeight: 500 }}>{t('res_requester')}:</strong> {r.requester.name}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>
                          <strong style={{ color: 'var(--black)', fontWeight: 500 }}>{t('res_contact')}:</strong> {r.contact_info}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>
                          <strong style={{ color: 'var(--black)', fontWeight: 500 }}>{t('res_date')}:</strong>{' '}
                          {new Date(r.startDate).toLocaleDateString('nl-NL')} → {new Date(r.endDate).toLocaleDateString('nl-NL')}
                        </p>
                        {r.activity.locatie && (
                          <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>
                            <strong style={{ color: 'var(--black)', fontWeight: 500 }}>{t('res_location')}:</strong> {r.activity.locatie}
                          </p>
                        )}
                        <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>
                          <strong style={{ color: 'var(--black)', fontWeight: 500 }}>{t('res_count')}:</strong> {r.aantalLaptops}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>
                          <strong style={{ color: 'var(--black)', fontWeight: 500 }}>{t('res_goal')}:</strong> {r.doel}
                        </p>
                        {r.extra_info && (
                          <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>
                            <strong style={{ color: 'var(--black)', fontWeight: 500 }}>{t('res_extra')}:</strong> {r.extra_info}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="badge badge-pending" style={{ flexShrink: 0, marginLeft: 16 }}>In afwachting</span>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="label">{t('res_reason')}</label>
                    <input
                      className="input"
                      placeholder="Verplicht bij afkeuren..."
                      value={reden[r.id] || ''}
                      onChange={e => setReden(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => beoordeel(r.id, true, r.activity.title)}>{t('res_approve')}</button>
                    <button className="btn btn-danger-ghost" style={{ flex: 1 }} onClick={() => beoordeel(r.id, false, r.activity.title)}>{t('res_reject')}</button>
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
