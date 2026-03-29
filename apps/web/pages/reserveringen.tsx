import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

interface Reservation {
  id: string
  status: string
  startDate: string
  endDate: string
  rejectionReason: string | null
  requester: { name: string }
  activity: { title: string }
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

function minStartDatum() {
  const d = new Date(); d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

export default function Reserveringen() {
  const { selectedUserId, selectedUser } = useUser()
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'ADMIN') return
    setLoading(true)
    gql(
      '{ pendingReservations { id status startDate endDate rejectionReason requester { name } activity { title } } }',
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
      setReserveringen(prev => prev.filter(r => r.id !== reservationId))
    }
  }

  async function maakReservering() {
    if (!forUserId) { toast('Selecteer een eigenaar.', 'error'); return }
    if (!activityId) { toast('Selecteer een activiteit.', 'error'); return }
    if (!startDate || !endDate) { toast('Vul start- en einddatum in.', 'error'); return }
    setSaving(true)
    const data = await gql(
      `mutation($userId: ID!, $activityId: ID!, $startDate: String!, $endDate: String!) {
        requestReservation(userId: $userId, activityId: $activityId, startDate: $startDate, endDate: $endDate) { id status }
      }`,
      { userId: forUserId, activityId, startDate, endDate },
      selectedUserId
    )
    setSaving(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Reservering aangemaakt.')
    setShowForm(false); setForUserId(''); setActivityId(''); setStartDate(''); setEndDate('')
    // reload pending list
    gql('{ pendingReservations { id status startDate endDate rejectionReason requester { name } activity { title } } }', undefined, selectedUserId)
      .then(d => setReserveringen(d.data?.pendingReservations || []))
  }

  return (
    <Layout title="Reserveringen" subtitle="Openstaande aanvragen beoordelen">

      {!selectedUserId && (
        <div className="empty"><div className="empty-icon">📋</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'ADMIN' && (
        <div className="alert alert-error">Deze pagina is alleen toegankelijk voor beheerders.</div>
      )}

      {selectedUserId && selectedUser?.role === 'ADMIN' && (
        <>
          {/* Reservering aanmaken namens eigenaar */}
          <div style={{ marginBottom: 32 }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕ Annuleren' : '+ Reservering aanmaken'}
            </button>

            {showForm && (
              <div className="card" style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                <div>
                  <label className="label">Eigenaar *</label>
                  <select className="input" value={forUserId} onChange={e => setForUserId(e.target.value)}>
                    <option value="">— Selecteer eigenaar —</option>
                    {owners.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Activiteit *</label>
                  <select className="input" value={activityId} onChange={e => setActivityId(e.target.value)}>
                    <option value="">— Selecteer activiteit —</option>
                    {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Startdatum *</label>
                    <input type="date" className="input" min={minStartDatum()} value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Einddatum *</label>
                    <input type="date" className="input" min={startDate || minStartDatum()} value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <button className="btn btn-primary" disabled={saving} onClick={maakReservering}>
                    {saving ? 'Opslaan…' : 'Reservering aanmaken'}
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
              <p className="empty-text">Geen openstaande aanvragen</p>
            </div>
          )}

          {!loading && reserveringen.length > 0 && (
            <div style={{ display: 'grid', gap: 16 }}>
              {reserveringen.map(r => (
                <div key={r.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ marginBottom: 6 }}>{r.activity.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>Aanvrager: {r.requester.name}</p>
                      <p style={{ fontSize: 13, color: 'var(--grey)', margin: '2px 0 0' }}>
                        {new Date(r.startDate).toLocaleDateString('nl-NL')} → {new Date(r.endDate).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <span className="badge badge-pending">In afwachting</span>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="label">Reden voor afwijzing</label>
                    <input
                      className="input"
                      placeholder="Verplicht bij afkeuren..."
                      value={reden[r.id] || ''}
                      onChange={e => setReden(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => beoordeel(r.id, true, r.activity.title)}>Goedkeuren</button>
                    <button className="btn btn-danger-ghost" style={{ flex: 1 }} onClick={() => beoordeel(r.id, false, r.activity.title)}>Afwijzen</button>
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
