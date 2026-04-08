import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import AvatarCropModal from '../components/AvatarCropModal'
import UseAnimations from 'react-useanimations'
import trash2 from 'react-useanimations/lib/trash2'
import download from 'react-useanimations/lib/download'
import settings from 'react-useanimations/lib/settings'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import { useT } from '../context/LanguageContext'

interface Laptop {
  id: string
  merk_type: string
  status: string
  specificaties: string
  heeft_vga: boolean
  heeft_hdmi: boolean
  isTestLaptop: boolean
  ram_gb: number | null
}

interface License {
  id: string
  softwareTitle: string
  createdAt: string
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
  DEFECT:         ['IN_CONTROL', 'OUT_OF_SERVICE'],
  MISSING:        ['OUT_OF_SERVICE'],
}

const roleLabel: Record<string, string> = { ADMIN: 'Beheerder', OWNER: 'Eigenaar', HELPDESK: 'Helpdesk' }
const roleBadge: Record<string, string> = { ADMIN: 'badge-defect', OWNER: 'badge-approved', HELPDESK: 'badge-in-use' }

interface AuditLogEntry {
  id: string
  event: string
  userId: string | null
  details: string
  createdAt: string
}

type Tab = 'laptops' | 'bulk' | 'accounts' | 'audit' | 'licenties'

export default function Beheer() {
  const router = useRouter()
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const { t: tr } = useT()
  const [tab, setTab] = useState<Tab>('laptops')
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [decommissionId, setDecommissionId] = useState('')
  const [reden, setReden] = useState('')

  // Bulk
  const [selected, setSelected] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkFilter, setBulkFilter] = useState('')
  const [bulkLog, setBulkLog] = useState('')

  // Licenties
  const [licenses, setLicenses] = useState<License[]>([])
  const [testLaptops, setTestLaptops] = useState<Laptop[]>([])
  const [licTitle, setLicTitle] = useState('')
  const [licTestLaptopId, setLicTestLaptopId] = useState('')
  const [savingLic, setSavingLic] = useState(false)

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Accounts
  const [users, setUsers] = useState<{ id: string; name: string; username: string; email: string | null; role: string; avatar?: string | null }[]>([])
  const [showUserForm, setShowUserForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('OWNER')
  const [adminPass, setAdminPass] = useState('')
  const [savingUser, setSavingUser] = useState(false)
  // Edit/delete state
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editResetPw, setEditResetPw] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [uploadingEditAvatar, setUploadingEditAvatar] = useState(false)
  const [deletingEditAvatar,  setDeletingEditAvatar]  = useState(false)
  const [editCropFile,        setEditCropFile]        = useState<File | null>(null)
  const editAvatarRef = useRef<HTMLInputElement>(null)

  const actiefLaptops = laptops.filter(l => l.status !== 'OUT_OF_SERVICE')
  const uitBeheerLaptops = laptops.filter(l => l.status === 'OUT_OF_SERVICE')

  // Bulk: only show laptops matching filter, and compute valid target statuses
  const bulkLaptops = bulkFilter ? laptops.filter(l => l.status === bulkFilter) : laptops
  const selectedLaptops = laptops.filter(l => selected.includes(l.id))
  const uniqueSelectedStatuses = [...new Set(selectedLaptops.map(l => l.status))]
  const validBulkTargets = uniqueSelectedStatuses.length === 1
    ? (BULK_TARGETS[uniqueSelectedStatuses[0]] || [])
    : []

  function getBulkBlockReason(): string | null {
    if (selectedLaptops.length === 0) return null
    if (validBulkTargets.length > 0) return null
    if (uniqueSelectedStatuses.length > 1)
      return `Selecteer laptops van dezelfde status. Je hebt nu: ${uniqueSelectedStatuses.map(s => statusLabel[s]).join(', ')}.`
    const s = uniqueSelectedStatuses[0]
    if (s === 'RESERVED')
      return 'Gereserveerde laptops kunnen niet worden omgezet — annuleer de reservering eerst.'
    if (s === 'IN_USE')
      return 'Laptops in gebruik kunnen niet worden omgezet — verwerk ze eerst via Controle na gebruik.'
    if (s === 'OUT_OF_SERVICE')
      return 'Deze laptops zijn al buiten gebruik en kunnen niet verder worden omgezet.'
    return 'Geen geldige statusovergang mogelijk voor de huidige selectie.'
  }
  const bulkBlockReason = getBulkBlockReason()

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'ADMIN') return
    herlaadLaptops()
    herlaadUsers()
  }, [selectedUserId])

  useEffect(() => {
    if (tab !== 'audit' || !selectedUserId || selectedUser?.role !== 'ADMIN') return
    setAuditLoading(true)
    gql('{ auditLogs(limit: 100) { id event userId details createdAt } }', undefined, selectedUserId)
      .then(d => { setAuditLogs(d.data?.auditLogs || []); setAuditLoading(false) })
      .catch(() => setAuditLoading(false))
  }, [tab, selectedUserId])

  useEffect(() => {
    if (tab !== 'licenties' || !selectedUserId || selectedUser?.role !== 'ADMIN') return
    herlaadLicenties()
  }, [tab, selectedUserId])

  function herlaadLaptops() {
    gql('{ laptops { id merk_type status specificaties heeft_vga heeft_hdmi isTestLaptop ram_gb } }', undefined, selectedUserId)
      .then(data => setLaptops(data.data?.laptops || []))
  }

  function herlaadLicenties() {
    gql('{ licenses { id softwareTitle createdAt } testLaptops { id merk_type ram_gb specificaties } }', undefined, selectedUserId)
      .then(data => {
        setLicenses(data.data?.licenses || [])
        setTestLaptops(data.data?.testLaptops || [])
      })
  }

  function herlaadUsers() {
    gql('{ users { id name username email role avatar } }', undefined, selectedUserId)
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
    if (!bulkLog.trim()) { toast('Logopmerking is verplicht bij bulk statuswijziging.', 'error'); return }
    const data = await gql(
      `mutation($laptopIds: [ID!]!, $status: LaptopStatus!, $maintenanceLog: String) {
        bulkStatusChange(laptopIds: $laptopIds, status: $status, maintenanceLog: $maintenanceLog) { id status }
      }`,
      { laptopIds: selected, status: bulkStatus, maintenanceLog: bulkLog }, selectedUserId
    )
    if (data.errors) { toast(data.errors[0].message, 'error') }
    else {
      toast(`${selected.length} laptop(s) gewijzigd naar ${statusLabel[bulkStatus]}.`)
      setSelected([]); setBulkStatus(''); setBulkLog(''); herlaadLaptops()
    }
  }

  async function toggleTestLaptop(laptopId: string, current: boolean) {
    const data = await gql(
      `mutation($laptopId: ID!, $isTestLaptop: Boolean!) {
        setTestLaptop(laptopId: $laptopId, isTestLaptop: $isTestLaptop) { id isTestLaptop }
      }`,
      { laptopId, isTestLaptop: !current }, selectedUserId
    )
    if (data.errors) { toast(data.errors[0].message, 'error') }
    else { herlaadLaptops() }
  }

  async function voegLicenteToe() {
    if (!licTitle.trim()) { toast('Softwaretitel is verplicht.', 'error'); return }
    if (!licTestLaptopId) { toast('Selecteer een testlaptop.', 'error'); return }
    setSavingLic(true)
    const data = await gql(
      `mutation($softwareTitle: String!, $testLaptopId: ID!) {
        addLicense(softwareTitle: $softwareTitle, testLaptopId: $testLaptopId) { id softwareTitle }
      }`,
      { softwareTitle: licTitle.trim(), testLaptopId: licTestLaptopId }, selectedUserId
    )
    setSavingLic(false)
    if (data.errors) { toast(data.errors[0].message, 'error') }
    else {
      toast(`"${licTitle.trim()}" toegevoegd aan licentieregister.`)
      setLicTitle(''); setLicTestLaptopId(''); herlaadLicenties()
    }
  }

  async function verwijderLicentie(id: string, title: string) {
    const data = await gql(
      `mutation($id: ID!) { removeLicense(id: $id) }`,
      { id }, selectedUserId
    )
    if (data.errors) { toast(data.errors[0].message, 'error') }
    else { toast(`"${title}" verwijderd uit licentieregister.`); herlaadLicenties() }
  }

  async function maakAccount() {
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      toast('Naam, gebruikersnaam en wachtwoord zijn verplicht.', 'error'); return
    }
    if (newRole === 'ADMIN' && !adminPass.trim()) {
      toast('Vul jouw wachtwoord in om een beheerder aan te maken.', 'error'); return
    }
    setSavingUser(true)
    const data = await gql(
      `mutation($name: String!, $username: String!, $email: String, $password: String!, $role: UserRole!, $adminPassword: String) {
        createUser(name: $name, username: $username, email: $email, password: $password, role: $role, adminPassword: $adminPassword) { id name role }
      }`,
      { name: newName, username: newUsername, email: newEmail.trim() || null, password: newPassword, role: newRole, adminPassword: adminPass || null },
      selectedUserId
    )
    setSavingUser(false)
    if (data.errors) { toast(data.errors[0].message, 'error') }
    else {
      toast(`Account voor ${newName} aangemaakt.`)
      setNewName(''); setNewUsername(''); setNewEmail(''); setNewPassword(''); setAdminPass(''); setNewRole('OWNER')
      setShowUserForm(false); herlaadUsers()
    }
  }

  function handleEditAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editId) return
    if (!file.type.startsWith('image/')) { toast('Kies een afbeeldingsbestand.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { toast('Bestand mag maximaal 5 MB zijn.', 'error'); return }
    setEditCropFile(file)
    e.target.value = ''
  }

  async function handleEditCropConfirm(avatar: string) {
    if (!editId) return
    setEditCropFile(null)
    setUploadingEditAvatar(true)
    const data = await gql(
      `mutation($userId: ID!, $avatar: String!) { uploadAvatar(userId: $userId, avatar: $avatar) { id avatar } }`,
      { userId: editId, avatar },
      selectedUserId
    )
    setUploadingEditAvatar(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Profielfoto bijgewerkt.')
    herlaadUsers()
  }

  async function handleEditAvatarDelete() {
    if (!editId) return
    setDeletingEditAvatar(true)
    const data = await gql(
      `mutation($userId: ID!) { deleteAvatar(userId: $userId) { id avatar } }`,
      { userId: editId },
      selectedUserId
    )
    setDeletingEditAvatar(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Profielfoto verwijderd.')
    herlaadUsers()
  }

  function openEdit(u: { id: string; name: string; username: string; email: string | null }) {
    setEditId(u.id); setEditName(u.name); setEditUsername(u.username); setEditEmail(u.email || ''); setEditResetPw('')
    setDeleteConfirmId(null)
  }

  async function slaEditOp() {
    if (!editId) return
    setSavingEdit(true)
    const data = await gql(
      `mutation($userId: ID!, $name: String, $username: String, $email: String) {
        updateUser(userId: $userId, name: $name, username: $username, email: $email) { id name username email role }
      }`,
      { userId: editId, name: editName.trim() || undefined, username: editUsername.trim() || undefined, email: editEmail.trim() || null },
      selectedUserId
    )
    setSavingEdit(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast(`Account bijgewerkt.`)
    setEditId(null); herlaadUsers()
  }

  async function resetWachtwoord() {
    if (!editId || !editResetPw.trim()) { toast('Vul een nieuw wachtwoord in.', 'error'); return }
    setSavingEdit(true)
    const data = await gql(
      `mutation($userId: ID!, $newPassword: String!) { adminResetPassword(userId: $userId, newPassword: $newPassword) }`,
      { userId: editId, newPassword: editResetPw },
      selectedUserId
    )
    setSavingEdit(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Wachtwoord gereset.'); setEditResetPw('')
  }

  async function verwijderUser(userId: string) {
    const data = await gql(
      `mutation($userId: ID!) { deleteUser(userId: $userId) }`,
      { userId }, selectedUserId
    )
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Account verwijderd.')
    setDeleteConfirmId(null); setEditId(null); herlaadUsers()
  }

  function exportAuditCSV() {
    if (auditLogs.length === 0) return
    const header = 'Tijdstip,Gebeurtenis,Gebruiker ID,Details'
    const rows = auditLogs.map(l => {
      const ts = new Date(l.createdAt).toLocaleString('nl-NL')
      const details = l.details.replace(/"/g, '""')
      return `"${ts}","${l.event}","${l.userId || ''}","${details}"`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const eventLabel: Record<string, string> = {
    reservation_reviewed: 'Reservering beoordeeld',
    software_request_reviewed: 'Softwareaanvraag beoordeeld',
    laptop_status_changed: 'Laptop status gewijzigd',
    ai_question: 'AI vraag gesteld',
  }

  const presentStatuses = ALL_STATUSES.filter(s => laptops.some(l => l.status === s))

  return (
    <Layout title={tr('beh_title')} subtitle={tr('beh_sub')}>

      {!selectedUserId && (
        <div className="empty"><div className="empty-icon">🖥</div>
          <p className="empty-text">{tr('select_user')}</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'ADMIN' && (
        <div className="alert alert-error">{tr('beh_no_access')}</div>
      )}

      {selectedUserId && selectedUser?.role === 'ADMIN' && (
        <>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
            {(['laptops', 'bulk', 'accounts', 'audit', 'licenties'] as Tab[]).map(t => (
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {t === 'accounts' && <UseAnimations animation={settings} size={14} strokeColor={tab === 'accounts' ? '#000000' : '#7d7d7d'} wrapperStyle={{ display: 'flex' }} />}
                  {t === 'laptops' ? tr('beh_tab_retire') : t === 'bulk' ? tr('beh_tab_bulk') : t === 'accounts' ? tr('beh_tab_accounts') : t === 'audit' ? tr('beh_tab_audit') : 'Licenties'}
                </span>
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
                            <button
                              onClick={() => toggleTestLaptop(laptop.id, laptop.isTestLaptop)}
                              style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font)',
                                background: laptop.isTestLaptop ? 'var(--black)' : 'transparent',
                                color: laptop.isTestLaptop ? 'var(--white)' : 'var(--grey)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {laptop.isTestLaptop ? 'Testlaptop' : 'Geen testlaptop'}
                            </button>
                            {geblokkeerd ? (
                              <span style={{ fontSize: 12, color: 'var(--grey)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 5 }}>{tr('beh_retire_locked')}</span>
                            ) : (
                              <button className="btn btn-danger-ghost" style={{ fontSize: 12, padding: '4px 12px' }}
                                onClick={() => { setDecommissionId(isOpen ? '' : laptop.id); setReden('') }}>
                                {isOpen ? tr('beh_retire_cancel') : tr('beh_retire_done')}
                              </button>
                            )}
                          </div>
                        </div>
                        {isOpen && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'grid', gap: 12 }}>
                            <div>
                              <label className="label">{tr('res_reason')}</label>
                              <input className="input" placeholder="bijv. Onherstelbaar defect, verouderd model..." value={reden} onChange={e => setReden(e.target.value)} />
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>{tr('beh_retire_warning')}</p>
                            <button className="btn btn-danger" onClick={() => uitBeheer(laptop.id)}>{tr('beh_retire_confirm')}</button>
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
                  <span style={{ fontSize: 11, color: 'var(--grey)' }}>{tr('beh_bulk_all')}</span>
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
                      <input className="input" style={{ width: 200, padding: '5px 10px', fontSize: 12, height: 32 }}
                        placeholder="Logopmerking (verplicht)"
                        value={bulkLog} onChange={e => setBulkLog(e.target.value)} />
                      <select className="input" style={{ width: 'auto', padding: '5px 28px 5px 10px', fontSize: 12, height: 32 }}
                        value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                        <option value="">{tr('beh_bulk_new')}</option>
                        {validBulkTargets.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                      </select>
                      <button className="btn btn-primary" style={{ fontSize: 12 }} disabled={!bulkStatus} onClick={bulkWijzig}>
                        {tr('beh_bulk_apply')}
                      </button>
                    </>
                  )}
                  {bulkBlockReason && (
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>{bulkBlockReason}</span>
                  )}
                  {selected.length > 0 && (
                    <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setSelected([])}>{tr('beh_bulk_deselect')}</button>
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
                  {showUserForm ? `✕ ${tr('cancel')}` : tr('beh_acc_add')}
                </button>

                {showUserForm && (
                  <div className="card" style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="label">{tr('beh_acc_name')}</label>
                        <input className="input" placeholder="Volledige naam" value={newName} onChange={e => setNewName(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">{tr('beh_acc_username')}</label>
                        <input className="input" placeholder="bijv. jan_de_vries" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label">{tr('beh_acc_email')}</label>
                      <input type="email" className="input" placeholder="naam@asha.nl" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="label">{tr('beh_acc_password')}</label>
                        <input type="password" className="input" placeholder="Tijdelijk wachtwoord" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">{tr('beh_acc_role')}</label>
                        <select className="input" value={newRole} onChange={e => { setNewRole(e.target.value); setAdminPass('') }}>
                          <option value="OWNER">{tr('role_owner')}</option>
                          <option value="HELPDESK">{tr('role_helpdesk')}</option>
                          <option value="ADMIN">{tr('role_admin')}</option>
                        </select>
                      </div>
                    </div>
                    {newRole === 'ADMIN' && (
                      <div>
                        <label className="label">{tr('beh_acc_admin_pw')}</label>
                        <input type="password" className="input" placeholder="Jouw huidige wachtwoord" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                      </div>
                    )}
                    <div>
                      <button className="btn btn-primary" disabled={savingUser} onClick={maakAccount}>
                        {savingUser ? tr('saving') : tr('beh_acc_create')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                {users.map(u => {
                  const isEditing = editId === u.id
                  const isConfirmDelete = deleteConfirmId === u.id
                  return (
                    <div key={u.id} className="card-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={u.name} avatar={u.avatar} size={32} />
                          <div>
                            <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{u.name}</p>
                            <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                              @{u.username}{u.email ? ` · ${u.email}` : ''}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${roleBadge[u.role] || ''}`}>{roleLabel[u.role] || u.role}</span>
                          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '3px 10px' }}
                            onClick={() => router.push(`/gebruiker/${u.id}`)}>
                            Bekijk
                          </button>
                          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '3px 10px' }}
                            onClick={() => isEditing ? setEditId(null) : openEdit(u)}>
                            {isEditing ? '✕' : 'Wijzig'}
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'grid', gap: 14 }}>
                          {/* Avatar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar name={u.name} avatar={u.avatar} size={40} />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: 12, padding: '3px 10px' }}
                                disabled={uploadingEditAvatar || deletingEditAvatar}
                                onClick={() => editAvatarRef.current?.click()}
                              >
                                {uploadingEditAvatar ? 'Uploaden…' : 'Foto wijzigen'}
                              </button>
                              {u.avatar && (
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: 12, padding: '3px 10px', color: 'var(--grey)' }}
                                  disabled={deletingEditAvatar || uploadingEditAvatar}
                                  onClick={handleEditAvatarDelete}
                                >
                                  {deletingEditAvatar ? 'Verwijderen…' : 'Foto verwijderen'}
                                </button>
                              )}
                            </div>
                            <input ref={editAvatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditAvatarChange} />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label className="label">Naam</label>
                              <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
                            </div>
                            <div>
                              <label className="label">Gebruikersnaam</label>
                              <input className="input" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
                            </div>
                          </div>
                          <div>
                            <label className="label">E-mail</label>
                            <input type="email" className="input" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" style={{ fontSize: 12 }} disabled={savingEdit} onClick={slaEditOp}>
                              {savingEdit ? 'Opslaan…' : 'Opslaan'}
                            </button>
                          </div>

                          <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                            <label className="label">Wachtwoord resetten</label>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                              <input type="password" className="input" placeholder="Nieuw wachtwoord (min. 6)" value={editResetPw} onChange={e => setEditResetPw(e.target.value)} style={{ flex: 1 }} />
                              <button className="btn btn-ghost" style={{ fontSize: 12, whiteSpace: 'nowrap' }} disabled={savingEdit} onClick={resetWachtwoord}>
                                Reset
                              </button>
                            </div>
                          </div>

                          {u.id !== selectedUserId && (
                            <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                              {!isConfirmDelete ? (
                                <button className="btn btn-danger-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => setDeleteConfirmId(u.id)}>
                                  <UseAnimations animation={trash2} size={16} strokeColor="#8b0000" wrapperStyle={{ display: 'flex' }} />
                                  Account verwijderen
                                </button>
                              ) : (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>Zeker weten? Dit kan niet ongedaan worden.</p>
                                  <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={() => verwijderUser(u.id)}>Ja, verwijder</button>
                                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setDeleteConfirmId(null)}>Annuleer</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {/* ── Tab: Licenties ── */}
          {tab === 'licenties' && (
            <>
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Software toevoegen aan licentieregister</h3>
                <p style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16, marginTop: 0 }}>
                  Alleen software in dit register kan door eigenaren worden aangevraagd. Selecteer de testlaptop die is gebruikt voor validatie — deze mag niet meer RAM hebben dan de zwakste actieve laptop.
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label className="label">Softwaretitel *</label>
                    <input className="input" placeholder="bijv. Scratch 3.0, Python 3.12..." value={licTitle} onChange={e => setLicTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Testlaptop *</label>
                    <select className="input" value={licTestLaptopId} onChange={e => setLicTestLaptopId(e.target.value)}>
                      <option value="">— Selecteer testlaptop —</option>
                      {testLaptops.map(l => (
                        <option key={l.id} value={l.id}>{l.merk_type}{l.ram_gb ? ` · ${l.ram_gb}GB RAM` : ''}{l.specificaties ? ` · ${l.specificaties}` : ''}</option>
                      ))}
                    </select>
                    {testLaptops.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--red)', margin: '4px 0 0' }}>
                        Geen testlaptops beschikbaar. Markeer eerst een laptop als testlaptop via het tabblad "Uit beheer nemen".
                      </p>
                    )}
                  </div>
                  <button className="btn btn-primary" style={{ width: 'fit-content' }} disabled={savingLic} onClick={voegLicenteToe}>
                    {savingLic ? 'Toevoegen…' : 'Toevoegen aan register'}
                  </button>
                </div>
              </div>

              <h3 style={{ marginBottom: 12 }}>Geregistreerde software ({licenses.length})</h3>
              {licenses.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--grey)' }}>Nog geen software geregistreerd.</p>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {licenses.map(l => (
                    <div key={l.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{l.softwareTitle}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--grey)' }}>
                          Toegevoegd {new Date(l.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <button className="btn btn-danger-ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => verwijderLicentie(l.id, l.softwareTitle)}>
                        Verwijderen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Tab: Audit log ── */}
          {tab === 'audit' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--grey)' }}>{tr('beh_audit_title')}</p>
                <button className="btn btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={exportAuditCSV} disabled={auditLogs.length === 0}>
                  <UseAnimations animation={download} size={16} strokeColor="#7d7d7d" wrapperStyle={{ display: 'flex' }} />
                  {tr('beh_audit_export')}
                </button>
              </div>

              {auditLoading ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="card-row" style={{ display: 'flex', gap: 12 }}>
                      <div className="skeleton" style={{ width: 90, height: 11 }} />
                      <div className="skeleton" style={{ width: 140, height: 11 }} />
                    </div>
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--grey)' }}>{tr('beh_audit_empty')}</p>
              ) : (
                <div style={{ display: 'grid', gap: 4 }}>
                  {auditLogs.map(log => {
                    let details: Record<string, unknown> = {}
                    try { details = JSON.parse(log.details) } catch {}
                    return (
                      <div key={log.id} className="card-row" style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: 16, alignItems: 'start' }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--grey)', lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(log.createdAt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>
                            {eventLabel[log.event] || log.event}
                          </p>
                          {Object.keys(details).length > 0 && (
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--grey)', lineHeight: 1.4 }}>
                              {Object.entries(details)
                                .filter(([k]) => k !== 'userId')
                                .map(([k, v]) => `${k}: ${String(v)}`)
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                        {log.userId && (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--grey)', whiteSpace: 'nowrap' }}>
                            {log.userId.slice(0, 8)}…
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {editCropFile && (
        <AvatarCropModal
          file={editCropFile}
          onConfirm={handleEditCropConfirm}
          onCancel={() => setEditCropFile(null)}
        />
      )}
    </Layout>
  )
}
