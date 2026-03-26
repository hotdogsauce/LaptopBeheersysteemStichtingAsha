import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  role: string
}

interface Activity {
  id: string
  title: string
  software_benodigdheden: string | null
}

interface Reservation {
  id: string
  status: string
  startDate: string
  endDate: string
  rejectionReason: string | null
  activity: { title: string }
  laptops: { id: string; merk_type: string }[]
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  REQUESTED:  { label: 'In afwachting', color: 'text-amber-400',   bg: 'bg-amber-950',  border: 'border-amber-800' },
  APPROVED:   { label: 'Goedgekeurd',   color: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-800' },
  REJECTED:   { label: 'Afgewezen',     color: 'text-red-400',     bg: 'bg-red-950',     border: 'border-red-800' },
  CANCELLED:  { label: 'Geannuleerd',   color: 'text-slate-400',   bg: 'bg-slate-900',   border: 'border-slate-700' },
  COMPLETED:  { label: 'Afgerond',      color: 'text-blue-400',    bg: 'bg-blue-950',    border: 'border-blue-800' },
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

// Minimale startdatum: vandaag + 2 dagen
function minStartDatum() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

export default function Aanvragen() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  // Formuliervelden
  const [activityId, setActivityId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const selectedUser = users.find(u => u.id === selectedUserId)
  const ownerUsers = users.filter(u => u.role === 'OWNER')

  useEffect(() => {
    gql(`query { users { id name role } activities { id title software_benodigdheden } }`)
      .then(data => {
        setUsers(data.data?.users || [])
        setActivities(data.data?.activities || [])
      })
  }, [])

  useEffect(() => {
    if (!selectedUserId) return
    gql(
      `query($userId: ID!) { myReservations(userId: $userId) {
        id status startDate endDate rejectionReason
        activity { title }
        laptops { id merk_type }
      } }`,
      { userId: selectedUserId },
      selectedUserId
    ).then(data => setMyReservations(data.data?.myReservations || []))
  }, [selectedUserId])

  function herlaadAanvragen() {
    if (!selectedUserId) return
    gql(
      `query($userId: ID!) { myReservations(userId: $userId) {
        id status startDate endDate rejectionReason
        activity { title }
        laptops { id merk_type }
      } }`,
      { userId: selectedUserId },
      selectedUserId
    ).then(data => setMyReservations(data.data?.myReservations || []))
  }

  async function doeAanvraag() {
    if (!activityId) { setBericht({ text: 'Selecteer een activiteit.', type: 'fout' }); return }
    if (!startDate) { setBericht({ text: 'Vul een startdatum in.', type: 'fout' }); return }
    if (!endDate)   { setBericht({ text: 'Vul een einddatum in.', type: 'fout' }); return }

    const data = await gql(
      `mutation($userId: ID!, $activityId: ID!, $startDate: String!, $endDate: String!) {
        requestReservation(userId: $userId, activityId: $activityId, startDate: $startDate, endDate: $endDate) {
          id status
        }
      }`,
      { userId: selectedUserId, activityId, startDate, endDate },
      selectedUserId
    )

    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: 'Aanvraag ingediend. De beheerder beoordeelt dit zo snel mogelijk.', type: 'ok' })
      setActivityId(''); setStartDate(''); setEndDate('')
      herlaadAanvragen()
    }
  }

  async function annuleer(reservationId: string) {
    const data = await gql(
      `mutation($reservationId: ID!, $userId: ID!) {
        cancelReservation(reservationId: $reservationId, userId: $userId) { id status }
      }`,
      { reservationId, userId: selectedUserId },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: 'Aanvraag geannuleerd.', type: 'ok' })
      herlaadAanvragen()
    }
  }

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }} className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');`}</style>

      <header className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Stichting Asha</p>
          <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-extrabold tracking-tight">
            Laptops aanvragen
          </h1>
        </div>
        <Link href="/"
          className="text-sm border border-slate-700 hover:border-slate-400 px-4 py-2 rounded transition-colors">
          ← Overzicht
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-10">

        {/* Gebruiker selecteren (alleen OWNERs) */}
        <div className="mb-8">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Ingelogd als eigenaar</label>
          <select
            className="bg-slate-900 border border-slate-700 focus:border-slate-400 outline-none rounded px-4 py-3 w-full text-sm transition-colors"
            value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); setBericht(null) }}
          >
            <option value="">— Selecteer jouw account —</option>
            {ownerUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({roleLabel[u.role] || u.role})
              </option>
            ))}
          </select>
          {selectedUser && selectedUser.role !== 'OWNER' && (
            <p className="text-xs text-amber-400 mt-2">Alleen eigenaren kunnen laptops aanvragen.</p>
          )}
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
          <div className="text-center py-16 text-slate-600">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">Selecteer je account om een aanvraag te doen</p>
          </div>
        )}

        {selectedUserId && selectedUser?.role === 'OWNER' && (
          <>
            {/* Aanvraagformulier */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
              <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-5">
                Nieuwe aanvraag
              </h2>

              <div className="grid gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Activiteit *</label>
                  <select
                    className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                    value={activityId}
                    onChange={e => setActivityId(e.target.value)}
                  >
                    <option value="">— Selecteer activiteit —</option>
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Startdatum *</label>
                    <input
                      type="date"
                      min={minStartDatum()}
                      className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Einddatum *</label>
                    <input
                      type="date"
                      min={startDate || minStartDatum()}
                      className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-600">Reserveringen moeten minimaal 2 dagen van tevoren worden aangevraagd.</p>

                <button
                  onClick={doeAanvraag}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded transition-colors w-fit">
                  Aanvraag indienen
                </button>
              </div>
            </div>

            {/* Mijn aanvragen */}
            <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-4">
              Mijn aanvragen <span className="text-slate-500 font-normal text-sm">({myReservations.length})</span>
            </h2>

            {myReservations.length === 0 && (
              <div className="text-center py-12 text-slate-600 text-sm">Nog geen aanvragen ingediend.</div>
            )}

            <div className="grid gap-3">
              {myReservations.map(r => {
                const s = statusConfig[r.status] || { label: r.status, color: 'text-slate-400', bg: 'bg-slate-900', border: 'border-slate-700' }
                return (
                  <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-sm">
                          {r.activity.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(r.startDate).toLocaleDateString('nl-NL')} → {new Date(r.endDate).toLocaleDateString('nl-NL')}
                        </p>
                        {r.laptops.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            Laptops: {r.laptops.map(l => l.merk_type).join(', ')}
                          </p>
                        )}
                        {r.rejectionReason && (
                          <p className="text-xs text-red-400 mt-1">Reden: {r.rejectionReason}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs ${s.bg} ${s.color} ${s.border} border px-3 py-1 rounded-full`}>
                          {s.label}
                        </span>
                        {(r.status === 'REQUESTED' || r.status === 'APPROVED') && (
                          <button
                            onClick={() => annuleer(r.id)}
                            className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                            Annuleren
                          </button>
                        )}
                      </div>
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
