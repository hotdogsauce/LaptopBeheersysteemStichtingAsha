import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import DeadlineCountdown from '../components/DeadlineCountdown'
import { useToast } from '../context/ToastContext'

interface Activity { id: string; title: string }
interface SoftwareRequest {
  id: string
  title: string
  beschrijving: string | null
  status: string
  rejectionReason: string | null
  createdAt: string
  requester: { name: string }
  approver: { name: string } | null
  activity: { title: string }
}

const statusBadge: Record<string, string> = {
  REQUESTED: 'badge-pending',
  APPROVED:  'badge-approved',
  REJECTED:  'badge-rejected',
}

const statusLabel: Record<string, string> = {
  REQUESTED: 'In afwachting',
  APPROVED:  'Goedgekeurd',
  REJECTED:  'Afgewezen',
}

export default function Software() {
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])

  const [titel, setTitel] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [activityId, setActivityId] = useState('')
  const [myRequests, setMyRequests] = useState<SoftwareRequest[]>([])

  const [pendingRequests, setPendingRequests] = useState<SoftwareRequest[]>([])
  const [redenMap, setRedenMap] = useState<Record<string, string>>({})

  useEffect(() => {
    gql('{ activities { id title } }')
      .then(data => setActivities(data.data?.activities || []))
  }, [])

  useEffect(() => {
    if (!selectedUserId || !selectedUser) return
    if (selectedUser.role === 'OWNER') {
      gql(
        `query($userId: ID!) { mySoftwareRequests(userId: $userId) { id title beschrijving status rejectionReason createdAt requester { name } approver { name } activity { title } } }`,
        { userId: selectedUserId }, selectedUserId
      ).then(data => setMyRequests(data.data?.mySoftwareRequests || []))
    }
    if (selectedUser.role === 'ADMIN') {
      gql(
        '{ pendingSoftwareRequests { id title beschrijving status rejectionReason createdAt requester { name } approver { name } activity { title } } }',
        undefined, selectedUserId
      ).then(data => setPendingRequests(data.data?.pendingSoftwareRequests || []))
    }
  }, [selectedUserId])

  async function doeAanvraag() {
    if (!titel.trim()) { toast('Titel is verplicht.', 'error'); return }
    if (!activityId) { toast('Selecteer een activiteit.', 'error'); return }
    const data = await gql(
      `mutation($userId: ID!, $activityId: ID!, $title: String!, $beschrijving: String) {
        requestSoftware(userId: $userId, activityId: $activityId, title: $title, beschrijving: $beschrijving) { id status }
      }`,
      { userId: selectedUserId, activityId, title: titel, beschrijving: beschrijving || null },
      selectedUserId
    )
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      toast('Softwareaanvraag ingediend.')
      setTitel(''); setBeschrijving(''); setActivityId('')
      gql(
        `query($userId: ID!) { mySoftwareRequests(userId: $userId) { id title beschrijving status rejectionReason createdAt requester { name } approver { name } activity { title } } }`,
        { userId: selectedUserId }, selectedUserId
      ).then(data => setMyRequests(data.data?.mySoftwareRequests || []))
    }
  }

  async function beoordeel(requestId: string, approve: boolean) {
    const reason = redenMap[requestId]
    if (!approve && !reason) { toast('Vul een reden in bij afwijzing.', 'error'); return }
    const data = await gql(
      `mutation($requestId: ID!, $adminId: ID!, $approve: Boolean!, $reason: String) {
        reviewSoftwareRequest(requestId: $requestId, adminId: $adminId, approve: $approve, reason: $reason) { id status }
      }`,
      { requestId, adminId: selectedUserId, approve, reason: reason || null },
      selectedUserId
    )
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      toast(approve ? 'Aanvraag goedgekeurd.' : 'Aanvraag afgewezen.')
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    }
  }

  return (
    <Layout title="Software aanvragen" subtitle="Softwareinstallaties aanvragen en beoordelen">

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">📦</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'OWNER' && selectedUser?.role !== 'ADMIN' && (
        <div className="alert alert-error">
          Deze pagina is alleen toegankelijk voor eigenaren en beheerders.
        </div>
      )}

      {selectedUserId && selectedUser?.role === 'OWNER' && (
        <>
          <div className="card card-form" style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 20 }}>Nieuwe softwareaanvraag</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="label">Software titel *</label>
                <input
                  className="input"
                  placeholder="bijv. Scratch 3.0, Python 3.12..."
                  value={titel}
                  onChange={e => setTitel(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Toelichting</label>
                <textarea
                  className="input"
                  placeholder="Waarvoor is de software nodig?"
                  value={beschrijving}
                  onChange={e => setBeschrijving(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Activiteit *</label>
                <select className="input" value={activityId} onChange={e => setActivityId(e.target.value)}>
                  <option value="">— Selecteer activiteit —</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
              <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>
                Aanvraag moet minimaal 2 dagen voor de activiteit worden ingediend. De software moet in het licentieregister staan — neem contact op met een beheerder als dat niet het geval is.
              </p>
              <div>
                <button className="btn btn-primary" onClick={doeAanvraag}>Aanvraag indienen</button>
              </div>
            </div>
          </div>

          <h2 style={{ marginBottom: 16 }}>
            Mijn aanvragen{' '}
            <span style={{ fontWeight: 400, color: 'var(--grey)', fontSize: 14 }}>({myRequests.length})</span>
          </h2>

          {myRequests.length === 0 && (
            <div className="empty" style={{ padding: '40px 0' }}>
              <div className="empty-icon">📦</div>
              <p className="empty-text">Nog geen aanvragen ingediend.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {myRequests.map(r => (
              <div key={r.id} className="card-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{r.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>{r.activity.title}</p>
                    {r.beschrijving && <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>{r.beschrijving}</p>}
                    {r.rejectionReason && (
                      <p style={{ fontSize: 12, color: 'var(--red)', margin: '4px 0 0' }}>Reden: {r.rejectionReason}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={`badge ${statusBadge[r.status] || ''}`}>
                      {statusLabel[r.status] || r.status}
                    </span>
                    {r.status === 'REQUESTED' && (
                      <DeadlineCountdown since={r.createdAt} calendarDays={6} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedUserId && selectedUser?.role === 'ADMIN' && (
        <>
          <h2 style={{ marginBottom: 16 }}>
            Openstaande aanvragen{' '}
            <span style={{ fontWeight: 400, color: 'var(--grey)', fontSize: 14 }}>({pendingRequests.length})</span>
          </h2>

          {pendingRequests.length === 0 && (
            <div className="empty">
              <div className="empty-icon">✓</div>
              <p className="empty-text">Geen openstaande softwareaanvragen.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 16 }}>
            {pendingRequests.map(r => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ marginBottom: 6 }}>{r.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>Activiteit: {r.activity.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--grey)', margin: '2px 0 0' }}>Aanvrager: {r.requester.name}</p>
                    {r.beschrijving && (
                      <p style={{ fontSize: 13, color: 'var(--grey)', margin: '4px 0 0', fontStyle: 'italic' }}>{r.beschrijving}</p>
                    )}
                  </div>
                  <span className="badge badge-pending">In afwachting</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Reden voor afwijzing</label>
                  <input
                    className="input"
                    placeholder="Verplicht bij afkeuren..."
                    value={redenMap[r.id] || ''}
                    onChange={e => setRedenMap(prev => ({ ...prev, [r.id]: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => beoordeel(r.id, true)}>
                    Goedkeuren
                  </button>
                  <button className="btn btn-danger-ghost" style={{ flex: 1 }} onClick={() => beoordeel(r.id, false)}>
                    Afwijzen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
