import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User { id: string; name: string; role: string }
interface Activity { id: string; title: string }
interface SoftwareRequest {
  id: string
  title: string
  beschrijving: string | null
  status: string
  rejectionReason: string | null
  createdAt: string
  requester: { name: string }
  approver: { name: string } | null
  activity: { title: string }
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  REQUESTED: { label: 'In afwachting', color: 'text-amber-400',   bg: 'bg-amber-950',   border: 'border-amber-800' },
  APPROVED:  { label: 'Goedgekeurd',   color: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-800' },
  REJECTED:  { label: 'Afgewezen',     color: 'text-red-400',     bg: 'bg-red-950',     border: 'border-red-800' },
}

const API = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

function gql(query: string, variables?: Record<string, unknown>, userId?: string) {
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
    body: JSON.stringify({ query, variables }),
  }).then(r => r.json())
}

// Minimum datum: 2 dagen vooruit voor softwareaanvraag (activiteit moet ≥2 dagen weg zijn)
function today() {
  return new Date().toISOString().split('T')[0]
}

export default function Software() {
  const [users, setUsers] = useState<User[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  // OWNER: aanvraag formulier
  const [titel, setTitel] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [activityId, setActivityId] = useState('')
  const [myRequests, setMyRequests] = useState<SoftwareRequest[]>([])

  // ADMIN: beoordelen
  const [pendingRequests, setPendingRequests] = useState<SoftwareRequest[]>([])
  const [redenMap, setRedenMap] = useState<Record<string, string>>({})

  const selectedUser = users.find(u => u.id === selectedUserId)
  const ownerUsers = users.filter(u => u.role === 'OWNER')
  const adminUsers = users.filter(u => u.role === 'ADMIN')

  useEffect(() => {
    gql(`query { users { id name role } activities { id title } }`)
      .then(data => {
        setUsers(data.data?.users || [])
        setActivities(data.data?.activities || [])
      })
  }, [])

  useEffect(() => {
    if (!selectedUserId || !selectedUser) return
    setBericht(null)
    if (selectedUser.role === 'OWNER') {
      gql(`query($userId: ID!) { mySoftwareRequests(userId: $userId) { id title beschrijving status rejectionReason createdAt requester { name } approver { name } activity { title } } }`,
        { userId: selectedUserId }, selectedUserId)
        .then(data => setMyRequests(data.data?.mySoftwareRequests || []))
    }
    if (selectedUser.role === 'ADMIN') {
      gql(`query { pendingSoftwareRequests { id title beschrijving status rejectionReason createdAt requester { name } approver { name } activity { title } } }`,
        undefined, selectedUserId)
        .then(data => setPendingRequests(data.data?.pendingSoftwareRequests || []))
    }
  }, [selectedUserId])

  async function doeAanvraag() {
    if (!titel.trim()) { setBericht({ text: 'Titel is verplicht.', type: 'fout' }); return }
    if (!activityId) { setBericht({ text: 'Selecteer een activiteit.', type: 'fout' }); return }
    const data = await gql(
      `mutation($userId: ID!, $activityId: ID!, $title: String!, $beschrijving: String) {
        requestSoftware(userId: $userId, activityId: $activityId, title: $title, beschrijving: $beschrijving) { id status }
      }`,
      { userId: selectedUserId, activityId, title: titel, beschrijving: beschrijving || null },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: 'Softwareaanvraag ingediend.', type: 'ok' })
      setTitel(''); setBeschrijving(''); setActivityId('')
      gql(`query($userId: ID!) { mySoftwareRequests(userId: $userId) { id title beschrijving status rejectionReason createdAt requester { name } approver { name } activity { title } } }`,
        { userId: selectedUserId }, selectedUserId)
        .then(data => setMyRequests(data.data?.mySoftwareRequests || []))
    }
  }

  async function beoordeel(requestId: string, approve: boolean) {
    const reason = redenMap[requestId]
    if (!approve && !reason) { setBericht({ text: 'Vul een reden in bij afwijzing.', type: 'fout' }); return }
    const data = await gql(
      `mutation($requestId: ID!, $adminId: ID!, $approve: Boolean!, $reason: String) {
        reviewSoftwareRequest(requestId: $requestId, adminId: $adminId, approve: $approve, reason: $reason) { id status }
      }`,
      { requestId, adminId: selectedUserId, approve, reason: reason || null },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: approve ? 'Aanvraag goedgekeurd.' : 'Aanvraag afgewezen.', type: 'ok' })
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    }
  }

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }} className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');`}</style>

      <header className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Stichting Asha</p>
          <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-extrabold tracking-tight">Software aanvragen</h1>
        </div>
        <Link href="/" className="text-sm border border-slate-700 hover:border-slate-400 px-4 py-2 rounded transition-colors">← Overzicht</Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-10">
        {/* Gebruiker selecteren */}
        <div className="mb-8">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Ingelogd als</label>
          <select
            className="bg-slate-900 border border-slate-700 focus:border-slate-400 outline-none rounded px-4 py-3 w-full text-sm transition-colors"
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}>
            <option value="">— Selecteer jouw account —</option>
            <optgroup label="Eigenaar activiteit">
              {ownerUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </optgroup>
            <optgroup label="Beheerder">
              {adminUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </optgroup>
          </select>
        </div>

        {bericht && (
          <div className={`mb-6 px-4 py-3 rounded text-sm border ${bericht.type === 'ok' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-red-950 border-red-800 text-red-400'}`}>
            {bericht.text}
          </div>
        )}

        {!selectedUserId && (
          <div className="text-center py-16 text-slate-600 text-sm">Selecteer een account om verder te gaan.</div>
        )}

        {/* OWNER view */}
        {selectedUser?.role === 'OWNER' && (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
              <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-5">Nieuwe softwareaanvraag</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Software titel *</label>
                  <input
                    className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                    placeholder="bijv. Scratch 3.0, Python 3.12..."
                    value={titel}
                    onChange={e => setTitel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Toelichting</label>
                  <textarea
                    className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors resize-none"
                    rows={2}
                    placeholder="Waarvoor is de software nodig?"
                    value={beschrijving}
                    onChange={e => setBeschrijving(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Activiteit *</label>
                  <select
                    className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                    value={activityId}
                    onChange={e => setActivityId(e.target.value)}>
                    <option value="">— Selecteer activiteit —</option>
                    {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <p className="text-xs text-slate-600">Aanvraag moet minimaal 2 dagen voor de activiteit worden ingediend.</p>
                <button onClick={doeAanvraag} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded transition-colors w-fit">
                  Aanvraag indienen
                </button>
              </div>
            </div>

            <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-4">
              Mijn aanvragen <span className="text-slate-500 font-normal text-sm">({myRequests.length})</span>
            </h2>
            {myRequests.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">Nog geen aanvragen ingediend.</p>
            ) : (
              <div className="grid gap-3">
                {myRequests.map(r => {
                  const s = statusConfig[r.status]
                  return (
                    <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{r.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{r.activity.title}</p>
                          {r.beschrijving && <p className="text-xs text-slate-500">{r.beschrijving}</p>}
                          {r.rejectionReason && <p className="text-xs text-red-400 mt-1">Reden: {r.rejectionReason}</p>}
                        </div>
                        <span className={`text-xs ${s?.bg} ${s?.color} ${s?.border} border px-3 py-1 rounded-full shrink-0`}>
                          {s?.label || r.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ADMIN view */}
        {selectedUser?.role === 'ADMIN' && (
          <>
            <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-4">
              Openstaande aanvragen <span className="text-slate-500 font-normal text-sm">({pendingRequests.length})</span>
            </h2>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-sm">
                <p className="text-3xl mb-3">✓</p>
                Geen openstaande softwareaanvragen.
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map(r => (
                  <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-sm">{r.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Activiteit: {r.activity.title}</p>
                        <p className="text-xs text-slate-500">Aanvrager: {r.requester.name}</p>
                        {r.beschrijving && <p className="text-xs text-slate-400 mt-1 italic">{r.beschrijving}</p>}
                      </div>
                      <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-3 py-1 rounded-full shrink-0">
                        In afwachting
                      </span>
                    </div>
                    <input
                      className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm mb-3 transition-colors"
                      placeholder="Reden voor afwijzing (verplicht bij afkeuren)..."
                      value={redenMap[r.id] || ''}
                      onChange={e => setRedenMap(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <div className="flex gap-3">
                      <button onClick={() => beoordeel(r.id, true)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded transition-colors">
                        Goedkeuren
                      </button>
                      <button onClick={() => beoordeel(r.id, false)} className="flex-1 bg-slate-800 hover:bg-red-900 border border-slate-700 hover:border-red-700 text-sm px-4 py-2 rounded transition-colors">
                        Afwijzen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
