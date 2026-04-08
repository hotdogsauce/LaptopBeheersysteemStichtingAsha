import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useFloating, useHover, useInteractions,
  FloatingPortal, offset, flip, shift, autoUpdate,
} from '@floating-ui/react'
import Layout from '../components/Layout'
import NumberStepper from '../components/NumberStepper'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import { useT } from '../context/LanguageContext'

interface Laptop {
  id: string
  merk_type: string
  status: string
  heeft_vga: boolean
  heeft_hdmi: boolean
  specificaties: string
  missingAt: string | null
}

const statusLabel: Record<string, string> = {
  AVAILABLE:      'Beschikbaar',
  RESERVED:       'Gereserveerd',
  IN_USE:         'In gebruik',
  IN_CONTROL:     'In controle',
  DEFECT:         'Defect',
  OUT_OF_SERVICE: 'Buiten gebruik',
  MISSING:        'Vermist',
}

const statusBadge: Record<string, string> = {
  AVAILABLE:      'badge-available',
  RESERVED:       'badge-reserved',
  IN_USE:         'badge-in-use',
  IN_CONTROL:     'badge-in-control',
  DEFECT:         'badge-defect',
  OUT_OF_SERVICE: 'badge-oos',
  MISSING:        'badge-missing',
}

const allowedTransitions: Record<string, string[]> = {
  AVAILABLE:      [],
  RESERVED:       ['IN_USE', 'AVAILABLE'],
  IN_USE:         ['IN_CONTROL'],
  IN_CONTROL:     ['AVAILABLE', 'DEFECT', 'MISSING'],
  DEFECT:         ['IN_CONTROL', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: [],
  MISSING:        ['OUT_OF_SERVICE', 'IN_CONTROL'],
}

const ALL_STATUSES = ['AVAILABLE', 'RESERVED', 'IN_USE', 'IN_CONTROL', 'DEFECT', 'MISSING', 'OUT_OF_SERVICE']

const statusOptClass: Record<string, string> = {
  AVAILABLE:      'ov-opt-available',
  RESERVED:       'ov-opt-reserved',
  IN_USE:         'ov-opt-in-use',
  IN_CONTROL:     'ov-opt-in-control',
  DEFECT:         'ov-opt-defect',
  MISSING:        'ov-opt-missing',
  OUT_OF_SERVICE: 'ov-opt-oos',
}

function countWorkdays(from: Date, to: Date): number {
  let count = 0
  const cur = new Date(from)
  while (cur < to) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function addWorkdays(from: Date, days: number): Date {
  const d = new Date(from)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d
}

function useMissingCountdown(missingAt: string | null) {
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    if (!missingAt) { setLabel(''); return }

    function update() {
      const deadline = addWorkdays(new Date(missingAt!), 7)
      const now = new Date()
      const msLeft = deadline.getTime() - now.getTime()

      if (msLeft <= 0) { setLabel('Wordt buiten gebruik gesteld…'); setUrgent(true); return }

      const hoursLeft = msLeft / (1000 * 60 * 60)
      const workdaysLeft = countWorkdays(now, deadline)

      if (workdaysLeft <= 1 && hoursLeft < 24) {
        setUrgent(true)
        if (hoursLeft < 1) {
          const mins = Math.ceil(msLeft / (1000 * 60))
          setLabel(`${mins} min. resterend`)
        } else if (hoursLeft < 4) {
          setLabel(`${Math.ceil(hoursLeft)} uur resterend`)
        } else {
          setLabel(`${Math.ceil(hoursLeft)} uur resterend`)
        }
      } else {
        setUrgent(false)
        setLabel(`${workdaysLeft} werkdag${workdaysLeft === 1 ? '' : 'en'} resterend`)
      }
    }

    update()
    const interval = setInterval(update, 60 * 1000)
    return () => clearInterval(interval)
  }, [missingAt])

  return { label, urgent }
}

function MissingCountdown({ missingAt }: { missingAt: string | null }) {
  const { label, urgent } = useMissingCountdown(missingAt)
  if (!label) return null
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color: urgent ? 'var(--red)' : '#92400e',
      background: urgent ? '#fef2f2' : '#fffbeb',
      border: `1px solid ${urgent ? '#fecaca' : '#fde68a'}`,
      borderRadius: 99,
      padding: '2px 8px',
      letterSpacing: 0,
      animation: urgent ? 'pulse-urgent 1.5s ease-in-out infinite' : 'none',
    }}>
      ⏱ {label}
    </span>
  )
}

function HoverCard({ laptop, children }: { laptop: Laptop; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'right-start',
    strategy: 'fixed',
    middleware: [offset(12), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const hover = useHover(context, { delay: { open: 0, close: 80 } })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover])

  const ports = [laptop.heeft_vga && 'VGA', laptop.heeft_hdmi && 'HDMI'].filter(Boolean).join(' · ')

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>
      <FloatingPortal>
        <AnimatePresence>
          {open && (
            /* Outer div owns the floating position — keeps Framer Motion transforms separate */
            <div
              key="hovercard"
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 9999 }}
              {...getFloatingProps()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.13, ease: 'easeOut' }}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  pointerEvents: 'none',
                  minWidth: 180,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', margin: '0 0 4px' }}>{laptop.merk_type}</p>
                {laptop.specificaties && (
                  <p style={{ fontSize: 11, color: 'var(--grey)', margin: '0 0 4px' }}>{laptop.specificaties}</p>
                )}
                {ports && (
                  <p style={{ fontSize: 11, color: 'var(--grey)', margin: '0 0 4px' }}>Poorten: {ports}</p>
                )}
                <span className={`badge ${statusBadge[laptop.status] || ''}`} style={{ fontSize: 11 }}>
                  {statusLabel[laptop.status] || laptop.status}
                </span>
                {laptop.status === 'MISSING' && laptop.missingAt && (
                  <p style={{ fontSize: 11, color: 'var(--grey)', margin: '6px 0 0' }}>
                    Vermist sinds {new Date(laptop.missingAt).toLocaleDateString('nl-NL')}
                  </p>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  )
}

function SkeletonRow() {
  return (
    <div className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ width: 180, height: 14 }} />
        <div className="skeleton" style={{ width: 120, height: 11 }} />
      </div>
      <div className="skeleton" style={{ width: 88, height: 22, borderRadius: 99 }} />
    </div>
  )
}

export default function Home() {
  const { selectedUserId, selectedUser, loggedInUser } = useUser()
  const { toast } = useToast()
  const { t } = useT()
  const router = useRouter()
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [nieuwMerk, setNieuwMerk] = useState('')
  const [nieuwSpec, setNieuwSpec] = useState('')
  const [nieuwVga, setNieuwVga] = useState(false)
  const [nieuwHdmi, setNieuwHdmi] = useState(false)
  const [nieuwRamGb, setNieuwRamGb] = useState<string>('')
  const [nieuwWifi, setNieuwWifi] = useState(false)
  const [nieuwWifiVerbonden, setNieuwWifiVerbonden] = useState(false)
  const [nieuwToetsen, setNieuwToetsen] = useState(false)
  const [nieuwCamera, setNieuwCamera] = useState(false)
  const [nieuwMicrofoon, setNieuwMicrofoon] = useState(false)
  const [nieuwDrives, setNieuwDrives] = useState<{ letter: string; type: string; size_gb: string; free_gb: string }[]>([])

  const [wijzigId, setWijzigId] = useState<string | null>(null)
  const [nieuweStatus, setNieuweStatus] = useState('')
  const [maintenanceLog, setMaintenanceLog] = useState('')

  const filteredLaptops = activeFilters.length === 0
    ? laptops
    : laptops.filter(l => activeFilters.includes(l.status))

  // Statuses that actually exist in current data
  const presentStatuses = ALL_STATUSES.filter(s => laptops.some(l => l.status === s))

  useEffect(() => {
    if (!selectedUserId) { setLaptops([]); return }
    setLoading(true)
    gql('{ laptops { id merk_type status heeft_vga heeft_hdmi specificaties missingAt } }', undefined, selectedUserId)
      .then(data => { setLaptops(data.data?.laptops || []); setLoading(false) })
  }, [selectedUserId])

  function herlaadLaptops() {
    gql('{ laptops { id merk_type status heeft_vga heeft_hdmi specificaties missingAt } }', undefined, selectedUserId)
      .then(data => setLaptops(data.data?.laptops || []))
  }

  function toggleFilter(status: string) {
    setActiveFilters(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  async function maakLaptopAan() {
    if (!nieuwMerk.trim()) { toast('Merk/type is verplicht.', 'error'); return }
    const drives = nieuwDrives
      .filter(d => d.letter.trim() && d.type && d.size_gb)
      .map(d => ({ letter: d.letter.trim().toUpperCase(), type: d.type, size_gb: parseInt(d.size_gb), free_gb: parseInt(d.free_gb) || 0 }))
    for (const d of drives) {
      if (d.size_gb <= 0) { toast(`Schijf ${d.letter}: grootte moet groter dan 0 GB zijn.`, 'error'); return }
      if (d.free_gb < 0) { toast(`Schijf ${d.letter}: vrije ruimte kan niet negatief zijn.`, 'error'); return }
      if (d.free_gb > d.size_gb) { toast(`Schijf ${d.letter}: vrije ruimte kan niet groter zijn dan de totale grootte (${d.size_gb} GB).`, 'error'); return }
    }
    const data = await gql(
      `mutation($merk_type: String!, $specificaties: String, $heeft_vga: Boolean!, $heeft_hdmi: Boolean!, $ram_gb: Int, $heeft_wifi: Boolean!, $wifi_verbonden: Boolean!, $alle_toetsen_werken: Boolean!, $camera_werkt: Boolean!, $microfoon_werkt: Boolean!, $drives: [DriveInput!]) {
        createLaptop(merk_type: $merk_type, specificaties: $specificaties, heeft_vga: $heeft_vga, heeft_hdmi: $heeft_hdmi, ram_gb: $ram_gb, heeft_wifi: $heeft_wifi, wifi_verbonden: $wifi_verbonden, alle_toetsen_werken: $alle_toetsen_werken, camera_werkt: $camera_werkt, microfoon_werkt: $microfoon_werkt, drives: $drives) {
          id merk_type status
        }
      }`,
      {
        merk_type: nieuwMerk,
        specificaties: nieuwSpec || null,
        heeft_vga: nieuwVga,
        heeft_hdmi: nieuwHdmi,
        ram_gb: nieuwRamGb ? parseInt(nieuwRamGb) : null,
        heeft_wifi: nieuwWifi,
        wifi_verbonden: nieuwWifiVerbonden,
        alle_toetsen_werken: nieuwToetsen,
        camera_werkt: nieuwCamera,
        microfoon_werkt: nieuwMicrofoon,
        drives: drives.length > 0 ? drives : null,
      },
      selectedUserId
    )
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      toast(`Laptop "${nieuwMerk}" aangemaakt.`)
      setNieuwMerk(''); setNieuwSpec(''); setNieuwVga(false); setNieuwHdmi(false)
      setNieuwRamGb(''); setNieuwWifi(false); setNieuwWifiVerbonden(false)
      setNieuwToetsen(false); setNieuwCamera(false); setNieuwMicrofoon(false)
      setNieuwDrives([])
      setShowCreateForm(false)
      herlaadLaptops()
    }
  }

  async function wijzigStatus(laptopId: string) {
    if (!nieuweStatus) return
    if (!maintenanceLog.trim()) { toast('Voeg een logopmerking toe.', 'error'); return }
    const laptop   = laptops.find(l => l.id === laptopId)
    const isAdmin  = loggedInUser?.role === 'ADMIN'

    // Admin uses bulkStatusChange (with their own credentials); helpdesk uses processReturn
    let data: any
    if (isAdmin) {
      data = await gql(
        `mutation($laptopIds: [ID!]!, $status: LaptopStatus!, $maintenanceLog: String) {
          bulkStatusChange(laptopIds: $laptopIds, status: $status, maintenanceLog: $maintenanceLog) { id status }
        }`,
        { laptopIds: [laptopId], status: nieuweStatus, maintenanceLog },
        loggedInUser!.userId   // always admin's own ID, never the selected user's
      )
    } else {
      data = await gql(
        `mutation($laptopId: ID!, $status: LaptopStatus!, $maintenanceLog: String) {
          processReturn(laptopId: $laptopId, status: $status, maintenanceLog: $maintenanceLog) { id status }
        }`,
        { laptopId, status: nieuweStatus, maintenanceLog },
        selectedUserId
      )
    }

    const adminBlocked = data.errors?.some((e: any) =>
      /admin|niet toegestaan|permission/i.test(e.message)
    )

    if (data.errors && !adminBlocked) {
      toast(data.errors[0].message, 'error')
      return
    }

    if (adminBlocked) {
      // Helpdesk tried a transition that needs admin — notify admin and inform user
      fetch('/api/notify-status', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          laptopName: laptop?.merk_type,
          laptopId,
          newStatus:  nieuweStatus,
          reportedBy: loggedInUser?.name,
          blocked:    true,
        }),
      }).catch(() => {})
      toast('Geen toestemming. De beheerder is geïnformeerd.', 'error')
      setWijzigId(null); setNieuweStatus(''); setMaintenanceLog('')
      return
    }

    toast(`Status gewijzigd naar ${statusLabel[nieuweStatus] || nieuweStatus}.`)
    setWijzigId(null); setNieuweStatus(''); setMaintenanceLog('')
    herlaadLaptops()

    // Notify admins for sensitive statuses set by non-admins
    const notifyStatuses = ['MISSING', 'OUT_OF_SERVICE']
    if (!isAdmin && notifyStatuses.includes(nieuweStatus) && laptop) {
      fetch('/api/notify-status', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          laptopName:     laptop.merk_type,
          laptopId:       laptop.id,
          newStatus:      nieuweStatus,
          reportedBy:     loggedInUser?.name,
          maintenanceLog: maintenanceLog.trim(),
          blocked:        false,
        }),
      }).catch(() => {})
    }
  }

  return (
    <Layout title={t('ov_title')} subtitle={t('ov_sub')}>

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">💻</div>
          <p className="empty-text">{t('ov_select_user')}</p>
        </div>
      )}

      {selectedUserId && (
        <>
          {(selectedUser?.role === 'ADMIN' || selectedUser?.role === 'HELPDESK') && (
            <div style={{ marginBottom: 28 }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateForm(v => !v)}>
                {showCreateForm ? t('ov_cancel') : t('ov_add')}
              </button>
              {showCreateForm && (
                <div className="card" style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="label">Merk / type *</label>
                      <input className="input" placeholder="bijv. Dell Latitude 5520" value={nieuwMerk} onChange={e => setNieuwMerk(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Specificaties</label>
                      <input className="input" placeholder="bijv. i5, Windows 11" value={nieuwSpec} onChange={e => setNieuwSpec(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="label">RAM (GB)</label>
                      <NumberStepper value={nieuwRamGb} onChange={setNieuwRamGb} min={0} step={4} />
                    </div>
                  </div>

                  <div>
                    <label className="label">Poorten & connectiviteit</label>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={nieuwVga} onChange={e => setNieuwVga(e.target.checked)} /> VGA poort
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={nieuwHdmi} onChange={e => setNieuwHdmi(e.target.checked)} /> HDMI poort
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={nieuwWifi} onChange={e => setNieuwWifi(e.target.checked)} /> Wi-Fi aanwezig
                      </label>
                      {nieuwWifi && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={nieuwWifiVerbonden} onChange={e => setNieuwWifiVerbonden(e.target.checked)} /> Wi-Fi verbonden
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="label">Hardware status</label>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={nieuwToetsen} onChange={e => setNieuwToetsen(e.target.checked)} /> Alle toetsen werken
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={nieuwCamera} onChange={e => setNieuwCamera(e.target.checked)} /> Camera werkt
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={nieuwMicrofoon} onChange={e => setNieuwMicrofoon(e.target.checked)} /> Microfoon werkt
                      </label>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label className="label" style={{ margin: 0 }}>Schijven</label>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: '3px 10px' }}
                        onClick={() => setNieuwDrives(prev => [...prev, { letter: '', type: 'SSD', size_gb: '', free_gb: '' }])}
                      >
                        + Schijf toevoegen
                      </button>
                    </div>
                    {nieuwDrives.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>Nog geen schijven toegevoegd.</p>
                    )}
                    <div style={{ display: 'grid', gap: 8 }}>
                      {nieuwDrives.map((drive, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                          <div>
                            <label className="label" style={{ fontSize: 11 }}>Letter</label>
                            <input
                              className="input"
                              placeholder="C"
                              maxLength={2}
                              value={drive.letter}
                              onChange={e => setNieuwDrives(prev => prev.map((d, j) => j === i ? { ...d, letter: e.target.value } : d))}
                            />
                          </div>
                          <div>
                            <label className="label" style={{ fontSize: 11 }}>Type</label>
                            <select
                              className="input"
                              value={drive.type}
                              onChange={e => setNieuwDrives(prev => prev.map((d, j) => j === i ? { ...d, type: e.target.value } : d))}
                            >
                              <option value="SSD">SSD</option>
                              <option value="HDD">HDD</option>
                            </select>
                          </div>
                          <div>
                            <label className="label" style={{ fontSize: 11 }}>Grootte (GB)</label>
                            <input
                              type="number"
                              className="input"
                              placeholder="256"
                              value={drive.size_gb}
                              onChange={e => setNieuwDrives(prev => prev.map((d, j) => j === i ? { ...d, size_gb: e.target.value } : d))}
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="label" style={{ fontSize: 11 }}>Vrije ruimte (GB)</label>
                            <input
                              type="number"
                              className="input"
                              placeholder="120"
                              value={drive.free_gb}
                              onChange={e => setNieuwDrives(prev => prev.map((d, j) => j === i ? { ...d, free_gb: e.target.value } : d))}
                              min="0"
                              max={drive.size_gb ? drive.size_gb : undefined}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: 12, padding: '6px 10px', color: 'var(--red)' }}
                            onClick={() => setNieuwDrives(prev => prev.filter((_, j) => j !== i))}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div><button className="btn btn-primary" onClick={maakLaptopAan}>Aanmaken</button></div>
                </div>
              )}
            </div>
          )}

          {/* Status filter chips */}
          {!loading && presentStatuses.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {presentStatuses.map(s => {
                const active = activeFilters.includes(s)
                const count = laptops.filter(l => l.status === s).length
                return (
                  <button
                    key={s}
                    onClick={() => toggleFilter(s)}
                    className={`ov-chip${active ? ' ov-chip-active' : ''}`}
                  >
                    <span className={`badge ${statusBadge[s]}`} style={{ fontSize: 11, padding: '1px 6px' }}>
                      {statusLabel[s]}
                    </span>
                    <span style={{ fontSize: 11, color: active ? 'var(--black)' : 'var(--grey)', fontWeight: 500 }}>
                      {count}
                    </span>
                  </button>
                )
              })}
              {activeFilters.length > 0 && (
                <button className="ov-chip" onClick={() => setActiveFilters([])}>
                  <span style={{ fontSize: 11, color: 'var(--grey)' }}>✕ Wis filters</span>
                </button>
              )}
            </div>
          )}

          {loading && (
            <div style={{ display: 'grid', gap: 8 }}>
              {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
            </div>
          )}

          {!loading && filteredLaptops.length === 0 && (
            <div className="empty">
              <div className="empty-icon">📦</div>
              <p className="empty-text">{activeFilters.length > 0 ? 'Geen laptops met dit filter' : 'Geen laptops gevonden'}</p>
            </div>
          )}

          {!loading && filteredLaptops.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {filteredLaptops.map(laptop => {
                const opties = loggedInUser?.role === 'ADMIN'
                  ? ALL_STATUSES.filter(s => s !== laptop.status)
                  : (allowedTransitions[laptop.status] || [])
                const kanWijzigen = (loggedInUser?.role === 'ADMIN' || selectedUser?.role === 'HELPDESK') && opties.length > 0
                const isOpen = wijzigId === laptop.id

                return (
                  <HoverCard key={laptop.id} laptop={laptop}>
                    <div className="ov-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ cursor: 'pointer' }} onClick={() => router.push(`/laptops/${laptop.id}`)}>
                          <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{laptop.merk_type}</p>
                          <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                            {laptop.specificaties || '—'}
                            {laptop.heeft_vga && ' · VGA'}
                            {laptop.heeft_hdmi && ' · HDMI'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {laptop.status === 'MISSING' && (
                            <MissingCountdown missingAt={laptop.missingAt} />
                          )}
                          <span className={`badge ${statusBadge[laptop.status] || ''}`}>
                            {statusLabel[laptop.status] || laptop.status}
                          </span>
                          {kanWijzigen && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => { setWijzigId(isOpen ? null : laptop.id); setNieuweStatus(''); setMaintenanceLog('') }}
                            >
                              {isOpen ? 'Sluiten' : 'Wijzig'}
                            </button>
                          )}
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            className="ov-panel"
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                          >
                            <div>
                              <label className="label">Nieuwe status</label>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {opties.map(opt => (
                                  <button
                                    key={opt}
                                    className={`ov-status-opt ${statusOptClass[opt] || ''}${nieuweStatus === opt ? ' ov-status-opt-active' : ''}`}
                                    onClick={() => setNieuweStatus(opt)}
                                  >
                                    {statusLabel[opt] || opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {nieuweStatus && (
                              <div>
                                <label className="label">
                                  Logopmerking <span style={{ color: 'var(--red)' }}>*</span>
                                </label>
                                <input
                                  className="ov-input"
                                  placeholder={
                                    nieuweStatus === 'DEFECT'         ? 'Beschrijf het defect…' :
                                    nieuweStatus === 'MISSING'        ? 'Bijv. niet teruggegeven na activiteit…' :
                                    nieuweStatus === 'OUT_OF_SERVICE' ? 'Bijv. onherstelbaar defect, ouderdom…' :
                                    'Reden voor statuswijziging…'
                                  }
                                  value={maintenanceLog}
                                  onChange={e => setMaintenanceLog(e.target.value)}
                                />
                              </div>
                            )}
                            <div>
                              <button className="btn btn-primary" disabled={!nieuweStatus} onClick={() => wijzigStatus(laptop.id)}>
                                Status opslaan
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </HoverCard>
                )
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
