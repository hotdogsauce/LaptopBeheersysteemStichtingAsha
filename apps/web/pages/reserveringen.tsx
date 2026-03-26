import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Reservation {
  id: string
  status: string
  startDate: string
  endDate: string
  rejectionReason: string | null
  requester: { name: string }
  activity: { title: string }
}

const API = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

export default function Reserveringen() {
  const [reserveringen, setReserveringen] = useState<Reservation[]>([])
  const [userId, setUserId] = useState('')
  const [reden, setReden] = useState<Record<string, string>>({})
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  useEffect(() => {
    if (!userId) return
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({
        query: `query { pendingReservations { id status startDate endDate rejectionReason requester { name } activity { title } } }`
      })
    })
      .then(r => r.json())
      .then(data => setReserveringen(data.data?.pendingReservations || []))
  }, [userId])

  async function beoordeel(reservationId: string, approve: boolean) {
    const reason = reden[reservationId]
    if (!approve && !reason) {
      setBericht({ text: 'Vul een reden in bij afwijzing.', type: 'fout' })
      return
    }
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({
        query: `mutation($id: ID!, $adminId: ID!, $approve: Boolean!, $reason: String) {
          reviewReservation(reservationId: $id, adminId: $adminId, approve: $approve, reason: $reason) { id status }
        }`,
        variables: { id: reservationId, adminId: userId, approve, reason: reason || null }
      })
    })
    const data = await res.json()
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: approve ? 'Reservering goedgekeurd.' : 'Reservering afgewezen.', type: 'ok' })
      setReserveringen(prev => prev.filter(r => r.id !== reservationId))
    }
  }

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }} className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');`}</style>

      <header className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Stichting Asha</p>
          <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-extrabold tracking-tight">
            Reserveringen
          </h1>
        </div>
        <Link href="/"
          className="text-sm border border-slate-700 hover:border-slate-400 px-4 py-2 rounded transition-colors">
          ← Laptops
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-10">
        <div className="mb-10">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Admin gebruiker ID</label>
          <input
            className="bg-slate-900 border border-slate-700 focus:border-slate-400 outline-none rounded px-4 py-3 w-full text-sm transition-colors"
            placeholder="Plak hier je admin ID..."
            value={userId}
            onChange={e => setUserId(e.target.value)}
          />
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

        {!userId && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">Vul een admin ID in om aanvragen te zien</p>
          </div>
        )}

        {userId && reserveringen.length === 0 && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">Geen openstaande aanvragen</p>
          </div>
        )}

        <div className="grid gap-4">
          {reserveringen.map(r => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base">
                    {r.activity.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Aanvrager: {r.requester.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(r.startDate).toLocaleDateString('nl-NL')} → {new Date(r.endDate).toLocaleDateString('nl-NL')}
                  </p>
                </div>
                <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-3 py-1 rounded-full">
                  In afwachting
                </span>
              </div>
              <input
                className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm mb-4 transition-colors"
                placeholder="Reden voor afwijzing (verplicht bij afkeuren)..."
                value={reden[r.id] || ''}
                onChange={e => setReden(prev => ({ ...prev, [r.id]: e.target.value }))}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => beoordeel(r.id, true)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded transition-colors">
                  Goedkeuren
                </button>
                <button
                  onClick={() => beoordeel(r.id, false)}
                  className="flex-1 bg-slate-800 hover:bg-red-900 border border-slate-700 hover:border-red-700 text-sm px-4 py-2 rounded transition-colors">
                  Afwijzen
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}