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
  REQUESTED: 'badge-pending',
  APPROVED:  'badge-approved',
  REJECTED:  'badge-rejected',
  CANCELLED: 'badge-oos',
  COMPLETED: 'badge-in-use',
}
const statusLabel: Record<string, string> = {
  REQUESTED: 'In afwachting',
  APPROVED:  'Goedgekeurd',
  REJECTED:  'Afgewezen',
  CANCELLED: 'Geannuleerd',
  COMPLETED: 'Afgerond',
}

function minDatum() {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

function maxDatum() {
  const d = new Date()
  d.setDate(d.getDate() + 21)
  return d.toISOString().split('T')[0]
}

export default function Aanvragen() {
  const { selectedUserId, selectedUser } = useUser()
  const [activities, setActivities] = useState<Activity[]>([])
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  const [activityId, setActivityId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [aantalLaptops, setAantalLaptops] = useState('1')
  const [doel, setDoel] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [extraInfo, setExtraInfo] = useState('')

  useEffect(() => {
    gql('{ activities { id title locatie software_benodigdheden } }')
      .then(data => setActivities(data.data?.activities || []))
  }, [])

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'OWNER') return
    herlaadAanvragen()
  }, [selectedUserId])

  // Pre-fill contact info with the logged-in user's name
  useEffect(() => {
    if (selectedUser?.name && !contactInfo) {
      setContactInfo(selectedUser.name)
    }
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

    const data = await gql(
      `mutation($userId: ID!, $activityId: ID!, $startDate: String!, $endDate: String!, $aantalLaptops: Int!, $doel: String!, $contact_info: String!, $extra_info: String) {
        requestReservation(userId: $userId, activityId: $activityId, startDate: $startDate, endDate: $endDate, aantalLaptops: $aantalLaptops, doel: $doel, contact_info: $contact_info, extra_info: $extra_info) {
          id status
        }
      }`,
      {
        userId: selectedUserId, activityId, startDate, endDate,
        aantalLaptops: aantal, doel, contact_info: contactInfo,
        extra_info: extraInfo.trim() || null,
      },
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
        <div className="alert alert-error">
          Deze pagina is alleen toegankelijk voor eigenaren van activiteiten.
        </div>
      )}

      {selectedUserId && selectedUser?.role === 'OWNER' && (
        <>
          {bericht && (
            <div className={bericht.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'}>
              {bericht.text}
            </div>
          )}

          <div className="card" style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 20 }}>Nieuwe aanvraag</h2>

            <div style={{ display: 'grid', gap: 16 }}>

              {/* Activiteit */}
              <div>
                <label className="label">Activiteit *</label>
                <select className="input" value={activityId} onChange={e => setActivityId(e.target.value)}>
                  <option value="">— Selecteer activiteit —</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.title}{a.locatie ? ` (${a.locatie})` : ''}</option>
                  ))}
                </select>
                {selectedActivity?.locatie && (
                  <p style={{ fontSize: 12, color: 'var(--grey)', margin: '4px 0 0' }}>
                    Locatie: {selectedActivity.locatie}
                  </p>
                )}
              </div>

              {/* Datum en tijdstip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">Startdatum *</label>
                  <input
                    type="date"
                    className="input"
                    min={minDatum()}
                    max={maxDatum()}
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Einddatum *</label>
                  <input
                    type="date"
                    className="input"
                    min={startDate || minDatum()}
                    max={maxDatum()}
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--grey)', margin: '-8px 0 0' }}>
                Minimaal 3 dagen vooruit · maximaal 3 weken van tevoren
              </p>

              {/* Aantal laptops */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16 }}>
                <div>
                  <label className="label">Aantal laptops *</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={aantalLaptops}
                    onChange={e => setAantalLaptops(e.target.value)}
                  />
                </div>
              </div>

              {/* Doel */}
              <div>
                <label className="label">Doel van de aanvraag *</label>
                <textarea
                  className="input"
                  placeholder="Waarvoor worden de laptops gebruikt? bijv. praktijkles programmeren, presentatie, examen..."
                  value={doel}
                  onChange={e => setDoel(e.target.value)}
                  style={{ minHeight: 70, resize: 'vertical' }}
                />
              </div>

              {/* Contactgegevens */}
              <div>
                <label className="label">Uw naam en contactgegevens *</label>
                <input
                  className="input"
                  placeholder="bijv. Jan de Vries — 06-12345678 / j.devries@school.nl"
                  value={contactInfo}
                  onChange={e => setContactInfo(e.target.value)}
                />
              </div>

              {/* Extra info */}
              <div>
                <label className="label">Onvoorziene relevante informatie (optioneel)</label>
                <textarea
                  className="input"
                  placeholder="bijv. bijzondere software vereisten, toegankelijkheidsbehoeften, andere relevante details..."
                  value={extraInfo}
                  onChange={e => setExtraInfo(e.target.value)}
                  style={{ minHeight: 60, resize: 'vertical' }}
                />
              </div>

              <div>
                <button className="btn btn-primary" onClick={doeAanvraag}>
                  Aanvraag indienen
                </button>
              </div>
            </div>
          </div>

          <h2 style={{ marginBottom: 16 }}>
            Mijn aanvragen{' '}
            <span style={{ fontWeight: 400, color: 'var(--grey)', fontSize: 14 }}>({myReservations.length})</span>
          </h2>

          {myReservations.length === 0 && (
            <div className="empty" style={{ padding: '40px 0' }}>
              <p className="empty-text">Nog geen aanvragen ingediend.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {myReservations.map(r => (
              <div key={r.id} className="card-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{r.activity.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--grey)', margin: '4px 0 0' }}>
                      {new Date(r.startDate).toLocaleDateString('nl-NL')} → {new Date(r.endDate).toLocaleDateString('nl-NL')}
                      {' · '}{r.aantalLaptops} laptop{r.aantalLaptops !== 1 ? 's' : ''}
                    </p>
                    {r.doel && (
                      <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>Doel: {r.doel}</p>
                    )}
                    {r.laptops.length > 0 && (
                      <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                        Toegewezen: {r.laptops.map(l => l.merk_type).join(', ')}
                      </p>
                    )}
                    {r.rejectionReason && (
                      <p style={{ fontSize: 12, color: 'var(--red)', margin: '4px 0 0' }}>
                        Reden: {r.rejectionReason}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span className={`badge ${statusBadge[r.status] || ''}`}>
                      {statusLabel[r.status] || r.status}
                    </span>
                    {(r.status === 'REQUESTED' || r.status === 'APPROVED') && (
                      <button
                        className="btn btn-danger-ghost"
                        style={{ fontSize: 12, padding: '3px 10px' }}
                        onClick={() => annuleer(r.id)}
                      >
                        Annuleren
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
