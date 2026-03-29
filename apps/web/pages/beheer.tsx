import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'

interface Laptop {
  id: string
  merk_type: string
  status: string
  specificaties: string
  heeft_vga: boolean
  heeft_hdmi: boolean
}

const statusLabel: Record<string, string> = {
  AVAILABLE: 'Beschikbaar', RESERVED: 'Gereserveerd', IN_USE: 'In gebruik',
  IN_CONTROL: 'In controle', DEFECT: 'Defect', OUT_OF_SERVICE: 'Buiten gebruik', MISSING: 'Vermist',
}

const statusBadge: Record<string, string> = {
  AVAILABLE: 'badge-available', RESERVED: 'badge-reserved', IN_USE: 'badge-in-use',
  IN_CONTROL: 'badge-in-control', DEFECT: 'badge-defect', OUT_OF_SERVICE: 'badge-oos', MISSING: 'badge-missing',
}

const GEBLOKKEERD = ['RESERVED', 'IN_USE']
const ALL_STATUSES = ['AVAILABLE', 'IN_CONTROL', 'DEFECT', 'MISSING', 'OUT_OF_SERVICE']

// Statuses that are valid bulk targets (simple cases only)
const BULK_TARGETS: Record<string, string[]> = {
  AVAILABLE:      ['OUT_OF_SERVICE'],
  IN_CONTROL:     ['AVAILABLE', 'DEFECT', 'MISSING'],
  DEFECT:         ['OUT_OF_SERVICE'],
  MISSING:        ['OUT_OF_SERVICE'],
}

const roleLabel: Record<string, string> = { ADMIN: 'Beheerder', OWNER: 'Eigenaar', HELPDESK: 'Helpdesk' }
const roleBadge: Record<string, string> = { ADMIN: 'badge-defect', OWNER: 'badge-approved', HELPDESK: 'badge-in-use' }

type Tab = 'laptops' | 'bulk' | 'accounts'

export default function Beheer() {
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('laptops')
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [decommissionId, setDecommissionId] = useState('')
  const [reden, setReden] = useState('')

  // Bulk
  const [selected, setSelected] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkFilter, setBulkFilter] = useState('')

  // Accounts
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [showUserForm, setShowUserForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('OWNER')
  const [adminPass, setAdminPass] = useState('')
  const [savingUser, setSavingUser] = useState(false)

  const actiefLaptops = laptops.filter(l => l.status !== 'OUT_OF_SERVICE')
  const uitBeheerLaptops = laptops.filter(l => l.status === 'OUT_OF_SERVICE')

  // Bulk: only show laptops matching filter, and compute valid target statuses
  const bulkLaptops = bulkFilter ? laptops.filter(l => l.status === bulkFilter) : laptops
  const selectedLaptops = laptops.filter(l => selected.includes(l.id))
  const uniqueSelectedStatuses = [...new Set(selectedLaptops.map(l => l.status))]
  const validBulkTargets = uniqueSelectedStatuses.length === 1
    ? (BULK_TARGETS[uniqueSelectedStatuses[0]] || [])
    : []

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'ADMIN') return
    herlaadLaptops()
    herlaadUsers()
  }, [selectedUserId])

  function herlaadLaptops() {
    gql('{ laptops { id merk_type status specificaties heeft_vga heeft_hdmi } }', undefined, selectedUserId)
      .then(data => setLaptops(data.data?.laptops || []))
  }

  function herlaadUsers() {
    gql('{ users { id name email role } }', undefined, selectedUserId)
      .then(data => setUsers(data.data?.users || []))
  }

  async function uitBeheer(laptopId: string) {
    if (!reden.trim()) { toast('Reden is verplicht.', 'error'); return }
    const data = await gql(
      `mutation($laptopId: ID!, $reden: String!) {
        decommissionLaptop(laptopId: $laptopId, reden: $reden) { id status merk_type }
      }`,
      { laptopId, reden }, selectedUserId
    )
    if (data.errors) { toast(data.errors[0].message, 'error') }
    else {
      toast(`${data.data.decommissionLaptop.merk_type} is uit beheer genomen.`)
      setDecommissionId(''); setReden(''); herlaadLaptops()
    }
  }

  async function bulkWijzig() {
    if (!bulkStatus || selected.length === 0) return
    const data = await gql(
      `mutation($laptopIds: [ID!]!, $status: LaptopStatus!) {
        bulkStatusChange(laptopIds: $laptopIds, status: $status) { id status }
      }`,
      { laptopIds: selected, status: bulkStatus }, selectedUserId
    )
    if (data.errors) { toast(data.errors[0].message, 'error') }
    else {
      toast(`${selected.length} laptop(s) gewijzigd naar ${statusLabel[bulkStatus]}.`)
      setSelected([]); setBulkStatus(''); herlaadLaptops()
    }
  }

  async function maakAccount() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast('Naam, e-mail en wachtwoord zijn verplicht.', 'error'); return
    }
    if (newRole === 'ADMIN' && !adminPass.trim()) {
      toast('Vul jouw wachtwoord in om een beheerder aan te maken.', 'error'); return
    }
    setSavingUser(true)
    const data = await gql(
      `mutation($name: String!, $email: String!, $password: String!, $role: UserRole!, $adminPassword: String) {
        createUser(name: $name, email: $email, password: $password, role: $role, adminPassword: $adminPassword) { id name role }
      }`,
      { name: newName, email: newEmail, password: newPassword, role: newRole, adminPassword: adminPass || null },
      selectedUserId
    )
    setSavingUser(false)
    if (data.errors) { toast(data.errors[0].message, 'error') }
    else {
      toast(`Account voor ${newName} aangemaakt.`)
      setNewName(''); setNewEmail(''); setNewPassword(''); setAdminPass(''); setNewRole('OWNER')
      setShowUserForm(false); herlaadUsers()
    }
  }

  const presentStatuses = ALL_STATUSES.filter(s => laptops.some(l => l.status === s))

  return (
    <Layout title="Beheer" subtitle="Laptops, accounts en bulk acties">

      {!selectedUserId && (
        <div className="empty"><div className="empty-icon">🖥</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'ADMIN' && (
        <div className="alert alert-error">Deze pagina is alleen toegankelijk voor beheerders.</div>
      )}

      {selectedUserId && selectedUser?.role === 'ADMIN' && (
        <>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
            {(['laptops', 'bulk', 'accounts'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
                  fontSize: 13, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? 'var(--black)' : 'var(--grey)',
                  borderBottom: tab === t ? '2px solid var(--black)' : '2px solid transparent',
                  marginBottom: -1, fontFamily: 'var(--font)',
                }}
              >
                {t === 'laptops' ? 'Uit beheer nemen' : t === 'bulk' ? 'Bulk status' : 'Accounts'}
              </button>
            ))}
          </div>

          {/* ── Tab: Uit beheer nemen ── */}
          {tab === 'laptops' && (
            <>
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  {actiefLaptops.map(laptop => {
                    const geblokkeerd = GEBLOKKEERD.includes(laptop.status)
                    const isOpen = decommissionId === laptop.id
                    return (
                      <div key={laptop.id} className="card-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{laptop.merk_type}</p>
                            <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>{laptop.specificaties || '—'}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className={`badge ${statusBadge[laptop.status] || ''}`}>{statusLabel[laptop.status] || laptop.status}</span>
                            {geblokkeerd ? (
                              <span style={{ fontSize: 12, color: 'var(--grey)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 5 }}>Vergrendeld</span>
                            ) : (
                              <button className="btn btn-danger-ghost" style={{ fontSize: 12, padding: '4px 12px' }}
                                onClick={() => { setDecommissionId(isOpen ? '' : laptop.id); setReden('') }}>
                                {isOpen ? 'Annuleren' : 'Uit beheer'}
                              </button>
                            )}
                          </div>
                        </div>
                        {isOpen && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'grid', gap: 12 }}>
                            <div>
                              <label className="label">Reden *</label>
                              <input className="input" placeholder="bijv. Onherstelbaar defect, verouderd model..." value={reden} onChange={e => setReden(e.target.value)} />
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>Let op: laptop wordt permanent op buiten gebruik gezet.</p>
                            <button className="btn btn-danger" onClick={() => uitBeheer(laptop.id)}>Bevestig: uit beheer nemen</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {uitBeheerLaptops.length > 0 && (
                <div>
                  <p className="section-label" style={{ marginBottom: 10 }}>Uit beheer genomen ({uitBeheerLaptops.length})</p>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {uitBeheerLaptops.map(laptop => (
                      <div key={laptop.id} className="card-row" style={{ opacity: 0.45, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--grey)' }}>{laptop.merk_type}</p>
                        <span style={{ fontSize: 12, color: 'var(--grey)' }}>Buiten gebruik</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Tab: Bulk status ── */}
          {tab === 'bulk' && (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                <button
                  onClick={() => setBulkFilter('')}
                  className={`filter-chip${!bulkFilter ? ' filter-chip-active' : ''}`}
                >
                  <span style={{ fontSize: 11, color: 'var(--grey)' }}>Alle</span>
                </button>
                {presentStatuses.map(s => (
                  <button key={s} onClick={() => { setBulkFilter(s); setSelected([]) }}
                    className={`filter-chip${bulkFilter === s ? ' filter-chip-active' : ''}`}>
                    <span className={`badge ${statusBadge[s]}`} style={{ fontSize: 11, padding: '1px 6px' }}>{statusLabel[s]}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--grey)' }}>
                  {selected.length > 0 ? `${selected.length} geselecteerd` : 'Selecteer laptops'}
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {selected.length > 0 && validBulkTargets.length > 0 && (
                    <>
                      <select className="input" style={{ width: 'auto', padding: '5px 28px 5px 10px', fontSize: 12, height: 32 }}
                        value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                        <option value="">— Nieuwe status —</option>
                        {validBulkTargets.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                      </select>
                      <button className="btn btn-primary" style={{ fontSize: 12 }} disabled={!bulkStatus} onClick={bulkWijzig}>
                        Toepassen
                      </button>
                    </>
                  )}
                  {selected.length > 0 && validBulkTargets.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>Gemengde statussen — selecteer één type</span>
                  )}
                  {selected.length > 0 && (
                    <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setSelected([])}>Deselecteer</button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                {bulkLaptops.map(laptop => {
                  const isSelected = selected.includes(laptop.id)
                  return (
                    <div
                      key={laptop.id}
                      className="card-row"
                      onClick={() => setSelected(prev => isSelected ? prev.filter(id => id !== laptop.id) : [...prev, laptop.id])}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        outline: isSelected ? '2px solid var(--black)' : '2px solid transparent',
                        outlineOffset: -2, borderRadius: 4, transition: 'outline 0.1s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--border)',
                          background: isSelected ? 'var(--black)' : 'transparent', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && <span style={{ color: 'var(--white)', fontSize: 10, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{laptop.merk_type}</p>
                          <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>{laptop.specificaties || '—'}</p>
                        </div>
                      </div>
                      <span className={`badge ${statusBadge[laptop.status] || ''}`}>{statusLabel[laptop.status] || laptop.status}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Tab: Accounts ── */}
          {tab === 'accounts' && (
            <>
              <div style={{ marginBottom: 28 }}>
                <button className="btn btn-ghost" onClick={() => setShowUserForm(v => !v)}>
                  {showUserForm ? '✕ Annuleren' : '+ Account aanmaken'}
                </button>

                {showUserForm && (
                  <div className="card" style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="label">Naam *</label>
                        <input className="input" placeholder="Volledige naam" value={newName} onChange={e => setNewName(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">E-mailadres *</label>
                        <input type="email" className="input" placeholder="naam@asha.nl" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="label">Wachtwoord *</label>
                        <input type="password" className="input" placeholder="Tijdelijk wachtwoord" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Rol *</label>
                        <select className="input" value={newRole} onChange={e => { setNewRole(e.target.value); setAdminPass('') }}>
                          <option value="OWNER">Eigenaar</option>
                          <option value="HELPDESK">Helpdesk</option>
                          <option value="ADMIN">Beheerder</option>
                        </select>
                      </div>
                    </div>
                    {newRole === 'ADMIN' && (
                      <div>
                        <label className="label">Jouw wachtwoord * (vereist voor admin)</label>
                        <input type="password" className="input" placeholder="Jouw huidige wachtwoord" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                      </div>
                    )}
                    <div>
                      <button className="btn btn-primary" disabled={savingUser} onClick={maakAccount}>
                        {savingUser ? 'Opslaan…' : 'Account aanmaken'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                {users.map(u => (
                  <div key={u.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{u.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>{u.email}</p>
                    </div>
                    <span className={`badge ${roleBadge[u.role] || ''}`}>{roleLabel[u.role] || u.role}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  )
}
