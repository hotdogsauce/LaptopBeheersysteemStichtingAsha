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

export default function Reserveringen() {
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [reserveringen, setReserveringen] = useState<Reservation[]>([])
  const [reden, setReden] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'ADMIN') return
    setLoading(true)
    gql(
      '{ pendingReservations { id status startDate endDate rejectionReason requester { name } activity { title } } }',
      undefined,
      selectedUserId
    ).then(data => {
      setReserveringen(data.data?.pendingReservations || [])
      setLoading(false)
    })
  }, [selectedUserId])

  async function beoordeel(reservationId: string, approve: boolean, activityTitle: string) {
    const reason = reden[reservationId]
    if (!approve && !reason) {
      toast('Vul een reden in bij afwijzing.', 'error')
      return
    }
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

  return (
    <Layout title="Reserveringen" subtitle="Openstaande aanvragen beoordelen">

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'ADMIN' && (
        <div className="alert alert-error">
          Deze pagina is alleen toegankelijk voor beheerders.
        </div>
      )}

      {selectedUserId && selectedUser?.role === 'ADMIN' && (
        <>
          {loading && (
            <div style={{ display: 'grid', gap: 16 }}>
              {[1, 2].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && reserveringen.length === 0 && (
            <div className="empty">
              <div className="empty-icon">✓</div>
              <p className="empty-text">Geen openstaande aanvragen</p>
            </div>
          )}

          {!loading && (
            <div style={{ display: 'grid', gap: 16 }}>
              {reserveringen.map(r => (
                <div key={r.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ marginBottom: 6 }}>{r.activity.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--grey)', margin: 0 }}>
                        Aanvrager: {r.requester.name}
                      </p>
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
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => beoordeel(r.id, true, r.activity.title)}>
                      Goedkeuren
                    </button>
                    <button className="btn btn-danger-ghost" style={{ flex: 1 }} onClick={() => beoordeel(r.id, false, r.activity.title)}>
                      Afwijzen
                    </button>
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
