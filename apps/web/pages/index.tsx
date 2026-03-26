import { useEffect, useState } from 'react'
import Link from 'next/link'

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

const API = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

export default function Home() {
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ query: `query { laptops { id merk_type status heeft_vga heeft_hdmi specificaties } }` })
    })
      .then(r => r.json())
      .then(data => { setLaptops(data.data?.laptops || []); setLoading(false) })
  }, [userId])

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
        <Link href="/reserveringen"
          className="text-sm border border-slate-700 hover:border-slate-400 px-4 py-2 rounded transition-colors">
          Reserveringen →
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-10">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Gebruiker ID</label>
          <input
            className="bg-slate-900 border border-slate-700 focus:border-slate-400 outline-none rounded px-4 py-3 w-full text-sm transition-colors"
            placeholder="Plak hier je gebruiker ID uit Prisma Studio..."
            value={userId}
            onChange={e => setUserId(e.target.value)}
          />
        </div>

        {!userId && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-4xl mb-3">⌨</p>
            <p className="text-sm">Vul een gebruiker ID in om laptops te zien</p>
          </div>
        )}

        {userId && loading && <div className="text-center py-20 text-slate-500 text-sm">Laden...</div>}

        {userId && !loading && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-lg font-bold">
                Alle laptops <span className="text-slate-500 font-normal text-base">({laptops.length})</span>
              </h2>
            </div>
            <div className="grid gap-2">
              {laptops.map(laptop => {
                const s = statusConfig[laptop.status] || { label: laptop.status, color: 'text-slate-400', dot: 'bg-slate-400' }
                return (
                  <div key={laptop.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg px-6 py-4 flex justify-between items-center transition-colors">
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
                    </div>
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