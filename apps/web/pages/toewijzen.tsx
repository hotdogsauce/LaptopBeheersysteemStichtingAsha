import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import { useT } from '../context/LanguageContext'

interface AvailableLaptop {
  id: string
  merk_type: string
  specificaties: string | null
}

interface Reservation {
  id: string
  startDate: string
  endDate: string
  aantalLaptops: number
  doel: string
  contact_info: string
  requester: { name: string }
  activity: { title: string; locatie: string | null }
  laptops: { id: string; merk_type: string }[]
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Toewijzen() {
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const { t } = useT()

  const [reserveringen, setReserveringen] = useState<Reservation[]>([])
  const [beschikbaar, setBeschikbaar] = useState<AvailableLaptop[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string[]>>({}) // reservationId → laptopIds
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'HELPDESK') return
    herlaad()
  }, [selectedUserId])

  function herlaad() {
    setLoading(true)
    Promise.all([
      gql(`{
        approvedReservations {
          id startDate endDate aantalLaptops doel contact_info
          requester { name }
          activity { title locatie }
          laptops { id merk_type }
        }
      }`, undefined, selectedUserId),
      gql('{ laptopsByStatus(status: AVAILABLE) { id merk_type specificaties } }', undefined, selectedUserId),
    ]).then(([resData, laptopData]) => {
      setReserveringen(resData.data?.approvedReservations || [])
      setBeschikbaar(laptopData.data?.laptopsByStatus || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  function toggleLaptop(reservationId: string, laptopId: string) {
    setSelected(prev => {
      const cur = prev[reservationId] || []
      return {
        ...prev,
        [reservationId]: cur.includes(laptopId)
          ? cur.filter(id => id !== laptopId)
          : [...cur, laptopId],
      }
    })
  }

  async function wijs(reservation: Reservation) {
    const laptopIds = selected[reservation.id] || []
    if (laptopIds.length === 0) { toast('Selecteer minimaal één laptop.', 'error'); return }
    if (laptopIds.length !== reservation.aantalLaptops) {
      toast(`Selecteer precies ${reservation.aantalLaptops} laptop(s) (nu ${laptopIds.length} geselecteerd).`, 'error')
      return
    }
    setSaving(true)
    const data = await gql(
      `mutation($reservationId: ID!, $laptopIds: [ID!]!) {
        assignLaptopsToReservation(reservationId: $reservationId, laptopIds: $laptopIds) { id }
      }`,
      { reservationId: reservation.id, laptopIds },
      selectedUserId
    )
    setSaving(false)
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      toast(`${laptopIds.length} laptop(s) toegewezen aan "${reservation.activity.title}".`)
      setOpenId(null)
      setSelected(prev => { const n = { ...prev }; delete n[reservation.id]; return n })
      herlaad()
    }
  }

  const pending = reserveringen.filter(r => r.laptops.length < r.aantalLaptops)
  const assigned = reserveringen.filter(r => r.laptops.length >= r.aantalLaptops)

  return (
    <Layout title={t('tw_title')} subtitle={t('tw_sub')}>

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">🔗</div>
          <p className="empty-text">{t('select_user')}</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'HELPDESK' && (
        <div className="alert alert-error">{t('tw_no_access')}</div>
      )}

      {selectedUserId && selectedUser?.role === 'HELPDESK' && (
        <>
          {loading ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />)}
            </div>
          ) : (
            <>
              {/* Nog toe te wijzen */}
              {pending.length > 0 && (
                <div style={{ marginBottom: 40 }}>
                  <p className="section-label" style={{ marginBottom: 12 }}>
                    {t('tw_pending')} ({pending.length})
                  </p>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {pending.map(r => {
                      const isOpen = openId === r.id
                      const sel = selected[r.id] || []
                      const alreadyAssigned = r.laptops.map(l => l.id)
                      const nodig = r.aantalLaptops - r.laptops.length

                      return (
                        <div key={r.id} className="card">
                          {/* Header */}
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                            onClick={() => setOpenId(isOpen ? null : r.id)}
                          >
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{r.activity.title}</p>
                              <p style={{ fontSize: 12, color: 'var(--grey)', margin: '3px 0 0' }}>
                                {r.requester.name} · {fmt(r.startDate)} → {fmt(r.endDate)}
                                {r.activity.locatie ? ` · ${r.activity.locatie}` : ''}
                              </p>
                              <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                                Doel: {r.doel}
                              </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '2px 8px',
                                background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                              }}>
                                {nodig} {t('tw_needed')}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--grey)' }}>
                                {isOpen ? t('tw_close') : t('tw_open')}
                              </span>
                            </div>
                          </div>

                          {/* Assignment panel */}
                          {isOpen && (
                            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }} className="section-enter">
                              <p style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>
                                {t('tw_contact')}: {r.contact_info} · {t('tw_select_exact')} <strong>{r.aantalLaptops}</strong> {t('tw_laptops')}
                                ({sel.length} {t('tw_selected')})
                              </p>

                              {beschikbaar.length === 0 ? (
                                <p style={{ fontSize: 13, color: 'var(--grey)' }}>{t('tw_no_avail')}</p>
                              ) : (
                                <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
                                  {beschikbaar
                                    .filter(l => !alreadyAssigned.includes(l.id))
                                    .map(l => {
                                      const isSel = sel.includes(l.id)
                                      return (
                                        <div
                                          key={l.id}
                                          onClick={() => toggleLaptop(r.id, l.id)}
                                          className="card-row"
                                          style={{
                                            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                                            outline: isSel ? '2px solid var(--black)' : '2px solid transparent',
                                            outlineOffset: -2,
                                          }}
                                        >
                                          <div style={{
                                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                            border: '1.5px solid var(--border)',
                                            background: isSel ? 'var(--black)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          }}>
                                            {isSel && <span style={{ color: 'var(--white)', fontSize: 10 }}>✓</span>}
                                          </div>
                                          <div>
                                            <p style={{ fontWeight: 500, fontSize: 13, margin: 0 }}>{l.merk_type}</p>
                                            {l.specificaties && (
                                              <p style={{ fontSize: 11, color: 'var(--grey)', margin: '1px 0 0' }}>{l.specificaties}</p>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>
                              )}

                              <button
                                className="btn btn-primary"
                                disabled={saving || sel.length !== r.aantalLaptops}
                                onClick={() => wijs(r)}
                              >
                                {saving ? t('saving') : `${r.aantalLaptops} ${t('tw_submit')}`}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {pending.length === 0 && !loading && (
                <div className="empty" style={{ marginBottom: 40 }}>
                  <div className="empty-icon">✓</div>
                  <p className="empty-text">{t('tw_empty')}</p>
                </div>
              )}

              {/* Al toegewezen */}
              {assigned.length > 0 && (
                <div>
                  <p className="section-label" style={{ marginBottom: 12 }}>{t('tw_assigned')} ({assigned.length})</p>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {assigned.map(r => (
                      <div key={r.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 13, margin: 0 }}>{r.activity.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                            {r.requester.name} · {fmt(r.startDate)} → {fmt(r.endDate)}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                            Laptops: {r.laptops.map(l => l.merk_type).join(', ')}
                          </p>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '2px 8px', flexShrink: 0,
                          background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                        }}>
                          {t('tw_done')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Layout>
  )
}
