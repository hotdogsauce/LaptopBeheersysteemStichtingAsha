import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import Avatar from '../../components/Avatar'
import { useUser, gql } from '../../context/UserContext'
import { useT } from '../../context/LanguageContext'

const roleLabel: Record<string, string> = { ADMIN: 'Beheerder', OWNER: 'Eigenaar', HELPDESK: 'Helpdesk' }
const roleBadge: Record<string, string> = { ADMIN: 'badge-defect', OWNER: 'badge-approved', HELPDESK: 'badge-in-use' }

type Tab = 'reserveringen' | 'software' | 'storingen' | 'controles'

export default function GebruikerDetail() {
  const router = useRouter()
  const { id } = router.query as { id: string }
  const { selectedUserId, selectedUser, users } = useUser()
  const { t } = useT()

  const [tab, setTab] = useState<Tab>('reserveringen')
  const [loading, setLoading] = useState(true)

  const [reservations, setReservations] = useState<any[]>([])
  const [software, setSoftware] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [checklists, setChecklists] = useState<any[]>([])

  const profileUser = users.find(u => u.id === id)

  useEffect(() => {
    if (!id || !selectedUserId || selectedUser?.role !== 'ADMIN') return
    setLoading(true)
    Promise.all([
      gql(`{ myReservations(userId: "${id}") { id startDate endDate status aantalLaptops doel activity { title } } }`, undefined, selectedUserId),
      gql(`{ mySoftwareRequests(userId: "${id}") { id title status createdAt activity { title } } }`, undefined, selectedUserId),
      gql(`{ issuesByUser(userId: "${id}") { id description resolved createdAt laptop { merk_type } } }`, undefined, selectedUserId),
      gql(`{ checklistsByUser(userId: "${id}") { id passed createdAt laptop { merk_type } toetsenbord_ok camera_ok microfoon_ok } }`, undefined, selectedUserId),
    ]).then(([res, sw, iss, chk]) => {
      setReservations(res.data?.myReservations || [])
      setSoftware(sw.data?.mySoftwareRequests || [])
      setIssues(iss.data?.issuesByUser || [])
      setChecklists(chk.data?.checklistsByUser || [])
      setLoading(false)
    })
  }, [id, selectedUserId])

  if (!selectedUserId) return (
    <Layout title="Gebruikersprofiel">
      <div className="empty"><div className="empty-icon">👤</div><p className="empty-text">{t('select_user')}</p></div>
    </Layout>
  )

  if (selectedUser?.role !== 'ADMIN') return (
    <Layout title="Gebruikersprofiel">
      <div className="alert alert-error">Alleen beheerders kunnen gebruikersprofielen bekijken.</div>
    </Layout>
  )

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'reserveringen', label: 'Reserveringen', count: reservations.length },
    { key: 'software', label: 'Software', count: software.length },
    { key: 'storingen', label: 'Storingen', count: issues.length },
    { key: 'controles', label: 'Controles', count: checklists.length },
  ]

  return (
    <Layout title={profileUser?.name || 'Gebruikersprofiel'}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--grey)', padding: 0, marginBottom: 24, fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Terug
      </button>

      {/* Profile card */}
      {profileUser && (
        <div className="card" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={profileUser.name} avatar={profileUser.avatar} size={52} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{profileUser.name}</p>
              <span className={`badge ${roleBadge[profileUser.role] || ''}`}>{roleLabel[profileUser.role] || profileUser.role}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--grey)' }}>
              @{(profileUser as any).username || '—'}{profileUser.email ? ` · ${profileUser.email}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 20, textAlign: 'center' }}>
            {tabs.map(tb => (
              <div key={tb.key}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--black)' }}>{loading ? '—' : tb.count}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--grey)' }}>{tb.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
            fontSize: 13, fontWeight: tab === tb.key ? 600 : 400,
            color: tab === tb.key ? 'var(--black)' : 'var(--grey)',
            borderBottom: tab === tb.key ? '2px solid var(--black)' : '2px solid transparent',
            marginBottom: -1, fontFamily: 'var(--font)',
          }}>
            {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="card-row skeleton" style={{ height: 52 }} />)}
        </div>
      ) : (
        <>
          {/* Reserveringen */}
          {tab === 'reserveringen' && (
            reservations.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--grey)' }}>Geen reserveringen gevonden.</p>
              : <div style={{ display: 'grid', gap: 6 }}>
                  {reservations.map(r => (
                    <div key={r.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{r.activity?.title || '—'}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--grey)' }}>
                          {r.startDate ? new Date(r.startDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          {' · '}{r.aantalLaptops} laptop(s){r.doel ? ` · ${r.doel}` : ''}
                        </p>
                      </div>
                      <span className={`badge ${r.status === 'APPROVED' ? 'badge-approved' : r.status === 'REJECTED' ? 'badge-defect' : 'badge-in-control'}`}>
                        {r.status === 'APPROVED' ? 'Goedgekeurd' : r.status === 'REJECTED' ? 'Afgekeurd' : 'In behandeling'}
                      </span>
                    </div>
                  ))}
                </div>
          )}

          {/* Software */}
          {tab === 'software' && (
            software.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--grey)' }}>Geen softwareaanvragen gevonden.</p>
              : <div style={{ display: 'grid', gap: 6 }}>
                  {software.map(s => (
                    <div key={s.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{s.title}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--grey)' }}>
                          {s.activity?.title || '—'} · {new Date(s.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`badge ${s.status === 'APPROVED' ? 'badge-approved' : s.status === 'REJECTED' ? 'badge-defect' : 'badge-in-control'}`}>
                        {s.status === 'APPROVED' ? 'Goedgekeurd' : s.status === 'REJECTED' ? 'Afgekeurd' : 'In behandeling'}
                      </span>
                    </div>
                  ))}
                </div>
          )}

          {/* Storingen */}
          {tab === 'storingen' && (
            issues.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--grey)' }}>Geen storingen gemeld.</p>
              : <div style={{ display: 'grid', gap: 6 }}>
                  {issues.map(i => (
                    <div key={i.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{i.laptop?.merk_type || '—'}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--grey)' }}>
                          {(i.description || '').slice(0, 80)}{(i.description || '').length > 80 ? '…' : ''}
                          {' · '}{new Date(i.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`badge ${i.resolved ? 'badge-approved' : 'badge-defect'}`}>
                        {i.resolved ? 'Opgelost' : 'Open'}
                      </span>
                    </div>
                  ))}
                </div>
          )}

          {/* Controles */}
          {tab === 'controles' && (
            checklists.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--grey)' }}>Geen controles uitgevoerd.</p>
              : <div style={{ display: 'grid', gap: 6 }}>
                  {checklists.map(c => (
                    <div key={c.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{c.laptop?.merk_type || '—'}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--grey)' }}>
                          {new Date(c.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {c.toetsenbord_ok !== null && ` · Toetsenbord: ${c.toetsenbord_ok ? '✓' : '✕'}`}
                          {c.camera_ok !== null && ` · Camera: ${c.camera_ok ? '✓' : '✕'}`}
                          {c.microfoon_ok !== null && ` · Microfoon: ${c.microfoon_ok ? '✓' : '✕'}`}
                        </p>
                      </div>
                      <span className={`badge ${c.passed ? 'badge-approved' : 'badge-defect'}`}>
                        {c.passed ? 'Geslaagd' : 'Niet geslaagd'}
                      </span>
                    </div>
                  ))}
                </div>
          )}
        </>
      )}
    </Layout>
  )
}
