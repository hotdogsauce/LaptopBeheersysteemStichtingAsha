import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User { id: string; name: string; role: string }
interface Laptop {
  id: string
  merk_type: string
  status: string
  specificaties: string
  heeft_vga: boolean
  heeft_hdmi: boolean
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

// Statussen die NIET uit beheer genomen mogen worden
const GEBLOKKEERD = ['RESERVED', 'IN_USE']

const API = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

function gql(query: string, variables?: Record<string, unknown>, userId?: string) {
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
    body: JSON.stringify({ query, variables }),
  }).then(r => r.json())
}

export default function Beheer() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)
  const [decommissionId, setDecommissionId] = useState('')
  const [reden, setReden] = useState('')

  const adminUsers = users.filter(u => u.role === 'ADMIN')
  const actiefLaptops = laptops.filter(l => !['OUT_OF_SERVICE'].includes(l.status))
  const uitBeheerLaptops = laptops.filter(l => l.status === 'OUT_OF_SERVICE')

  useEffect(() => {
    gql(`query { users { id name role } }`)
      .then(data => setUsers(data.data?.users || []))
  }, [])

  useEffect(() => {
    if (!selectedUserId) return
    herlaadLaptops()
  }, [selectedUserId])

  function herlaadLaptops() {
    gql(`query { laptops { id merk_type status specificaties heeft_vga heeft_hdmi } }`, undefined, selectedUserId)
      .then(data => setLaptops(data.data?.laptops || []))
  }

  async function uitBeheer(laptopId: string) {
    if (!reden.trim()) { setBericht({ text: 'Reden is verplicht.', type: 'fout' }); return }
    const data = await gql(
      `mutation($laptopId: ID!, $reden: String!) {
        decommissionLaptop(laptopId: $laptopId, reden: $reden) { id status merk_type }
      }`,
      { laptopId, reden },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: `${data.data.decommissionLaptop.merk_type} is uit beheer genomen.`, type: 'ok' })
      setDecommissionId(''); setReden('')
      herlaadLaptops()
    }
  }

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }} className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');`}</style>

      <header className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Stichting Asha</p>
          <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-extrabold tracking-tight">Laptop beheer</h1>
        </div>
        <Link href="/" className="text-sm border border-slate-700 hover:border-slate-400 px-4 py-2 rounded transition-colors">← Overzicht</Link>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10">
        <div className="mb-8">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Ingelogd als beheerder</label>
          <select
            className="bg-slate-900 border border-slate-700 focus:border-slate-400 outline-none rounded px-4 py-3 w-full text-sm transition-colors"
            value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); setBericht(null); setDecommissionId('') }}>
            <option value="">— Selecteer jouw account —</option>
            {adminUsers.map(u => <option key={u.id} value={u.id}>{u.name} (Beheerder)</option>)}
          </select>
        </div>

        {bericht && (
          <div className={`mb-6 px-4 py-3 rounded text-sm border ${bericht.type === 'ok' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-red-950 border-red-800 text-red-400'}`}>
            {bericht.text}
          </div>
        )}

        {!selectedUserId ? (
          <div className="text-center py-16 text-slate-600 text-sm">Selecteer een beheerder om verder te gaan.</div>
        ) : (
          <>
            {/* Actieve laptops */}
            <div className="mb-10">
              <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-4">
                Actieve laptops <span className="text-slate-500 font-normal text-sm">({actiefLaptops.length})</span>
              </h2>
              <div className="grid gap-2">
                {actiefLaptops.map(laptop => {
                  const s = statusConfig[laptop.status] || { label: laptop.status, color: 'text-slate-400', dot: 'bg-slate-400' }
                  const geblokkeerd = GEBLOKKEERD.includes(laptop.status)
                  const isOpen = decommissionId === laptop.id
                  return (
                    <div key={laptop.id} className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg px-6 py-4 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`}></span>
                          <div>
                            <p className="font-medium text-sm">{laptop.merk_type}</p>
                            <p className="text-xs text-slate-500">{laptop.specificaties || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className={`font-medium ${s.color}`}>{s.label}</span>
                          {geblokkeerd ? (
                            <span className="text-slate-600 border border-slate-800 px-2 py-1 rounded text-xs">Vergrendeld</span>
                          ) : (
                            <button
                              onClick={() => { setDecommissionId(isOpen ? '' : laptop.id); setReden('') }}
                              className="text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-800 px-2 py-1 rounded transition-colors">
                              {isOpen ? 'Annuleren' : 'Uit beheer'}
                            </button>
                          )}
                        </div>
                      </div>
                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-slate-800 grid gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Reden *</label>
                            <input
                              className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                              placeholder="bijv. Onherstelbaar defect, verouderd model..."
                              value={reden}
                              onChange={e => setReden(e.target.value)}
                            />
                          </div>
                          <p className="text-xs text-slate-600">Let op: laptop wordt permanent op OUT_OF_SERVICE gezet.</p>
                          <button
                            onClick={() => uitBeheer(laptop.id)}
                            className="bg-red-900 hover:bg-red-800 border border-red-700 text-white text-xs px-4 py-2 rounded transition-colors w-fit">
                            Bevestig: uit beheer nemen
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Uit beheer genomen laptops */}
            {uitBeheerLaptops.length > 0 && (
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-4 text-slate-500">
                  Uit beheer genomen <span className="font-normal text-sm">({uitBeheerLaptops.length})</span>
                </h2>
                <div className="grid gap-2">
                  {uitBeheerLaptops.map(laptop => (
                    <div key={laptop.id} className="bg-slate-950 border border-slate-800 rounded-lg px-6 py-3 flex justify-between items-center opacity-60">
                      <div className="flex items-center gap-4">
                        <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0"></span>
                        <p className="text-sm text-slate-500">{laptop.merk_type}</p>
                      </div>
                      <span className="text-xs text-slate-600">Buiten gebruik</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
