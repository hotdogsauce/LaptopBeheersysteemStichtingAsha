import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  role: string
  email: string
}

interface Laptop {
  id: string
  merk_type: string
  status: string
  heeft_vga: boolean
  heeft_hdmi: boolean
  specificaties: string
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  AVAILABLE:      { label: 'Beschikbaar',    color: 'text-emerald-400', dot: 'bg-emerald-400' },
  RESERVED:       { label: 'Gereserveerd',   color: 'text-amber-400',   dot: 'bg-amber-400' },
  IN_USE:         { label: 'In gebruik',     color: 'text-blue-400',    dot: 'bg-blue-400' },
  IN_CONTROL:     { label: 'In controle',    color: 'text-violet-400',  dot: 'bg-violet-400' },
  DEFECT:         { label: 'Defect',         color: 'text-red-400',     dot: 'bg-red-400' },
  OUT_OF_SERVICE: { label: 'Buiten gebruik', color: 'text-slate-400',   dot: 'bg-slate-400' },
  MISSING:        { label: 'Vermist',        color: 'text-orange-400',  dot: 'bg-orange-400' },
}

const allowedTransitions: Record<string, string[]> = {
  AVAILABLE:      [],
  RESERVED:       ['IN_USE', 'AVAILABLE'],
  IN_USE:         ['IN_CONTROL'],
  IN_CONTROL:     ['AVAILABLE', 'DEFECT', 'MISSING'],
  DEFECT:         ['OUT_OF_SERVICE'],
  OUT_OF_SERVICE: [],
  MISSING:        [],
}

const roleLabel: Record<string, string> = {
  ADMIN: 'Beheerder',
  OWNER: 'Eigenaar activiteit',
  HELPDESK: 'Helpdesk',
}

const API = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

function gql(query: string, variables?: Record<string, unknown>, userId?: string) {
  return fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    },
    body: JSON.stringify({ query, variables }),
  }).then(r => r.json())
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [loading, setLoading] = useState(false)
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  // Laptop aanmaken
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [nieuwMerk, setNieuwMerk] = useState('')
  const [nieuwSpec, setNieuwSpec] = useState('')
  const [nieuwVga, setNieuwVga] = useState(false)
  const [nieuwHdmi, setNieuwHdmi] = useState(false)

  // Status wijzigen
  const [wijzigId, setWijzigId] = useState<string | null>(null)
  const [nieuweStatus, setNieuweStatus] = useState('')
  const [maintenanceLog, setMaintenanceLog] = useState('')

  const selectedUser = users.find(u => u.id === selectedUserId)

  // Haal gebruikers op bij laden
  useEffect(() => {
    gql(`query { users { id name role email } }`)
      .then(data => setUsers(data.data?.users || []))
  }, [])

  // Haal laptops op wanneer gebruiker wijzigt
  useEffect(() => {
    if (!selectedUserId) return
    setLoading(true)
    gql(`query { laptops { id merk_type status heeft_vga heeft_hdmi specificaties } }`, undefined, selectedUserId)
      .then(data => { setLaptops(data.data?.laptops || []); setLoading(false) })
  }, [selectedUserId])

  function herlaadLaptops() {
    if (!selectedUserId) return
    gql(`query { laptops { id merk_type status heeft_vga heeft_hdmi specificaties } }`, undefined, selectedUserId)
      .then(data => setLaptops(data.data?.laptops || []))
  }

  async function maakLaptopAan() {
    if (!nieuwMerk.trim()) { setBericht({ text: 'Merk/type is verplicht.', type: 'fout' }); return }
    const data = await gql(
      `mutation($merk_type: String!, $specificaties: String, $heeft_vga: Boolean!, $heeft_hdmi: Boolean!) {
        createLaptop(merk_type: $merk_type, specificaties: $specificaties, heeft_vga: $heeft_vga, heeft_hdmi: $heeft_hdmi) {
          id merk_type status
        }
      }`,
      { merk_type: nieuwMerk, specificaties: nieuwSpec || null, heeft_vga: nieuwVga, heeft_hdmi: nieuwHdmi },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: `Laptop "${nieuwMerk}" aangemaakt.`, type: 'ok' })
      setNieuwMerk(''); setNieuwSpec(''); setNieuwVga(false); setNieuwHdmi(false)
      setShowCreateForm(false)
      herlaadLaptops()
    }
  }

  async function wijzigStatus(laptopId: string) {
    if (!nieuweStatus) return
    const data = await gql(
      `mutation($laptopId: ID!, $status: LaptopStatus!, $maintenanceLog: String) {
        processReturn(laptopId: $laptopId, status: $status, maintenanceLog: $maintenanceLog) {
          id status
        }
      }`,
      { laptopId, status: nieuweStatus, maintenanceLog: maintenanceLog || null },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: `Status gewijzigd naar ${statusConfig[nieuweStatus]?.label || nieuweStatus}.`, type: 'ok' })
      setWijzigId(null); setNieuweStatus(''); setMaintenanceLog('')
      herlaadLaptops()
    }
  }

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }} className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');`}</style>

      <header className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Stichting Asha</p>
          <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-extrabold tracking-tight">
            Laptopbeheer
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {selectedUser?.role === 'OWNER' && (<>
            <Link href="/aanvragen" className="text-sm border border-slate-700 hover:border-slate-400 px-3 py-2 rounded transition-colors">Aanvragen</Link>
            <Link href="/software" className="text-sm border border-slate-700 hover:border-slate-400 px-3 py-2 rounded transition-colors">Software</Link>
          </>)}
          {selectedUser?.role === 'ADMIN' && (<>
            <Link href="/reserveringen" className="text-sm border border-slate-700 hover:border-slate-400 px-3 py-2 rounded transition-colors">Reserveringen</Link>
            <Link href="/beheer" className="text-sm border border-slate-700 hover:border-slate-400 px-3 py-2 rounded transition-colors">Beheer</Link>
            <Link href="/software" className="text-sm border border-slate-700 hover:border-slate-400 px-3 py-2 rounded transition-colors">Software</Link>
          </>)}
          {selectedUser?.role === 'HELPDESK' && (<>
            <Link href="/storingen" className="text-sm border border-slate-700 hover:border-slate-400 px-3 py-2 rounded transition-colors">Storingen</Link>
            <Link href="/controle" className="text-sm border border-slate-700 hover:border-slate-400 px-3 py-2 rounded transition-colors">Controle</Link>
          </>)}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">

        {/* Gebruiker selecteren */}
        <div className="mb-8">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Ingelogd als</label>
          <select
            className="bg-slate-900 border border-slate-700 focus:border-slate-400 outline-none rounded px-4 py-3 w-full text-sm transition-colors"
            value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); setWijzigId(null); setBericht(null) }}
          >
            <option value="">— Selecteer een gebruiker —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({roleLabel[u.role] || u.role})
              </option>
            ))}
          </select>
        </div>

        {bericht && (
          <div className={`mb-6 px-4 py-3 rounded text-sm border ${
            bericht.type === 'ok'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
              : 'bg-red-950 border-red-800 text-red-400'
          }`}>
            {bericht.text}
          </div>
        )}

        {!selectedUserId && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-4xl mb-3">⌨</p>
            <p className="text-sm">Selecteer een gebruiker om verder te gaan</p>
          </div>
        )}

        {selectedUserId && loading && <div className="text-center py-20 text-slate-500 text-sm">Laden...</div>}

        {selectedUserId && !loading && (
          <>
            {/* Laptop aanmaken (ADMIN / HELPDESK) */}
            {(selectedUser?.role === 'ADMIN' || selectedUser?.role === 'HELPDESK') && (
              <div className="mb-8">
                <button
                  onClick={() => { setShowCreateForm(v => !v); setBericht(null) }}
                  className="text-sm border border-slate-700 hover:border-slate-400 px-4 py-2 rounded transition-colors mb-4">
                  {showCreateForm ? '✕ Annuleren' : '+ Laptop aanmaken'}
                </button>

                {showCreateForm && (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 grid gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Merk / type *</label>
                      <input
                        className="bg-slate-800 border border-slate-700 focus:border-slate-400 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                        placeholder="bijv. Dell Latitude 5520"
                        value={nieuwMerk}
                        onChange={e => setNieuwMerk(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Specificaties</label>
                      <input
                        className="bg-slate-800 border border-slate-700 focus:border-slate-400 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                        placeholder="bijv. i5 8GB 256SSD"
                        value={nieuwSpec}
                        onChange={e => setNieuwSpec(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-6 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={nieuwVga} onChange={e => setNieuwVga(e.target.checked)} className="accent-emerald-500" />
                        VGA poort
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={nieuwHdmi} onChange={e => setNieuwHdmi(e.target.checked)} className="accent-emerald-500" />
                        HDMI poort
                      </label>
                    </div>
                    <button
                      onClick={maakLaptopAan}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded transition-colors w-fit">
                      Aanmaken
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Laptopoverzicht */}
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-lg font-bold">
                Alle laptops <span className="text-slate-500 font-normal text-base">({laptops.length})</span>
              </h2>
            </div>

            <div className="grid gap-2">
              {laptops.map(laptop => {
                const s = statusConfig[laptop.status] || { label: laptop.status, color: 'text-slate-400', dot: 'bg-slate-400' }
                const opties = allowedTransitions[laptop.status] || []
                const kanWijzigen = selectedUser?.role === 'HELPDESK' && opties.length > 0
                const isOpen = wijzigId === laptop.id

                return (
                  <div key={laptop.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg px-6 py-4 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`}></span>
                        <div>
                          <p className="font-medium text-sm">{laptop.merk_type}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{laptop.specificaties || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-xs">
                        <span className="text-slate-500">{laptop.heeft_vga ? '✓ VGA' : '✗ VGA'}</span>
                        <span className="text-slate-500">{laptop.heeft_hdmi ? '✓ HDMI' : '✗ HDMI'}</span>
                        <span className={`font-medium ${s.color}`}>{s.label}</span>
                        {kanWijzigen && (
                          <button
                            onClick={() => { setWijzigId(isOpen ? null : laptop.id); setNieuweStatus(''); setMaintenanceLog('') }}
                            className="text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-500 px-2 py-1 rounded text-xs transition-colors">
                            {isOpen ? 'Sluiten' : 'Wijzig'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Status wijzigen panel (inline) */}
                    {isOpen && (
                      <div className="mt-4 pt-4 border-t border-slate-800 grid gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Nieuwe status</label>
                          <div className="flex gap-2 flex-wrap">
                            {opties.map(opt => (
                              <button
                                key={opt}
                                onClick={() => setNieuweStatus(opt)}
                                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                                  nieuweStatus === opt
                                    ? 'bg-slate-600 border-slate-400 text-slate-100'
                                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                }`}>
                                {statusConfig[opt]?.label || opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        {nieuweStatus === 'DEFECT' && (
                          <div>
                            <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Onderhoudslog *</label>
                            <input
                              className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                              placeholder="Beschrijf het defect..."
                              value={maintenanceLog}
                              onChange={e => setMaintenanceLog(e.target.value)}
                            />
                          </div>
                        )}
                        <button
                          onClick={() => wijzigStatus(laptop.id)}
                          disabled={!nieuweStatus}
                          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs px-4 py-2 rounded transition-colors w-fit">
                          Status opslaan
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
