import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User { id: string; name: string; role: string }
interface Laptop { id: string; merk_type: string; status: string; specificaties: string }
interface Issue {
  id: string
  description: string
  resolved: boolean
  solution: string | null
  createdAt: string
  resolvedAt: string | null
  laptop: { id: string; merk_type: string }
  reportedBy: { name: string }
  resolvedBy: { name: string } | null
}

const statusConfig: Record<string, { label: string; dot: string }> = {
  AVAILABLE:      { label: 'Beschikbaar',    dot: 'bg-emerald-400' },
  RESERVED:       { label: 'Gereserveerd',   dot: 'bg-amber-400' },
  IN_USE:         { label: 'In gebruik',     dot: 'bg-blue-400' },
  IN_CONTROL:     { label: 'In controle',    dot: 'bg-violet-400' },
  DEFECT:         { label: 'Defect',         dot: 'bg-red-400' },
  OUT_OF_SERVICE: { label: 'Buiten gebruik', dot: 'bg-slate-400' },
  MISSING:        { label: 'Vermist',        dot: 'bg-orange-400' },
}

const MELDBAAR = ['AVAILABLE', 'RESERVED', 'IN_USE', 'IN_CONTROL']
const API = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

function gql(query: string, variables?: Record<string, unknown>, userId?: string) {
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
    body: JSON.stringify({ query, variables }),
  }).then(r => r.json())
}

export default function Storingen() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [openIssues, setOpenIssues] = useState<Issue[]>([])
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  // Storing melden
  const [meldLaptopId, setMeldLaptopId] = useState('')
  const [meldOmschrijving, setMeldOmschrijving] = useState('')

  // Storing oplossen
  const [oplosId, setOplosId] = useState('')
  const [oplosOplossing, setOplosOplossing] = useState('')

  const helpdeskUsers = users.filter(u => u.role === 'HELPDESK')

  useEffect(() => {
    gql(`query { users { id name role } laptops { id merk_type status specificaties } }`)
      .then(data => {
        setUsers(data.data?.users || [])
        setLaptops(data.data?.laptops || [])
      })
  }, [])

  useEffect(() => {
    if (!selectedUserId) return
    herlaadIssues()
  }, [selectedUserId])

  function herlaadIssues() {
    gql(`query { openIssues { id description resolved solution createdAt resolvedAt laptop { id merk_type } reportedBy { name } resolvedBy { name } } }`, undefined, selectedUserId)
      .then(data => setOpenIssues(data.data?.openIssues || []))
  }

  async function meldStoring() {
    if (!meldLaptopId) { setBericht({ text: 'Selecteer een laptop.', type: 'fout' }); return }
    if (!meldOmschrijving.trim()) { setBericht({ text: 'Omschrijving is verplicht.', type: 'fout' }); return }
    const data = await gql(
      `mutation($laptopId: ID!, $description: String!) {
        reportIssue(laptopId: $laptopId, description: $description) { id description laptop { merk_type status } }
      }`,
      { laptopId: meldLaptopId, description: meldOmschrijving },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: `Storing gemeld voor ${data.data.reportIssue.laptop.merk_type}. Status → DEFECT.`, type: 'ok' })
      setMeldLaptopId(''); setMeldOmschrijving('')
      herlaadIssues()
      // Refresh laptops
      gql(`query { laptops { id merk_type status specificaties } }`, undefined, selectedUserId)
        .then(d => setLaptops(d.data?.laptops || []))
    }
  }

  async function losOp(issueId: string) {
    if (!oplosOplossing.trim()) { setBericht({ text: 'Oplossing is verplicht.', type: 'fout' }); return }
    const data = await gql(
      `mutation($issueId: ID!, $solution: String!) {
        resolveIssue(issueId: $issueId, solution: $solution) { id resolved laptop { merk_type status } }
      }`,
      { issueId, solution: oplosOplossing },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: `Storing opgelost. ${data.data.resolveIssue.laptop.merk_type} → IN_CONTROL.`, type: 'ok' })
      setOplosId(''); setOplosOplossing('')
      herlaadIssues()
      gql(`query { laptops { id merk_type status specificaties } }`, undefined, selectedUserId)
        .then(d => setLaptops(d.data?.laptops || []))
    }
  }

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }} className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');`}</style>

      <header className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Stichting Asha</p>
          <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-extrabold tracking-tight">Storingen</h1>
        </div>
        <Link href="/" className="text-sm border border-slate-700 hover:border-slate-400 px-4 py-2 rounded transition-colors">← Overzicht</Link>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10">
        <div className="mb-8">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Ingelogd als helpdesk</label>
          <select
            className="bg-slate-900 border border-slate-700 focus:border-slate-400 outline-none rounded px-4 py-3 w-full text-sm transition-colors"
            value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); setBericht(null) }}>
            <option value="">— Selecteer jouw account —</option>
            {helpdeskUsers.map(u => <option key={u.id} value={u.id}>{u.name} (Helpdesk)</option>)}
          </select>
        </div>

        {bericht && (
          <div className={`mb-6 px-4 py-3 rounded text-sm border ${bericht.type === 'ok' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-red-950 border-red-800 text-red-400'}`}>
            {bericht.text}
          </div>
        )}

        {!selectedUserId ? (
          <div className="text-center py-16 text-slate-600 text-sm">Selecteer een account om verder te gaan.</div>
        ) : (
          <div className="grid gap-8">
            {/* Storing melden */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-5">Storing melden</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Laptop *</label>
                  <select
                    className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors"
                    value={meldLaptopId}
                    onChange={e => setMeldLaptopId(e.target.value)}>
                    <option value="">— Selecteer laptop —</option>
                    {laptops.filter(l => MELDBAAR.includes(l.status)).map(l => {
                      const s = statusConfig[l.status]
                      return <option key={l.id} value={l.id}>{l.merk_type} — {s?.label || l.status}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Omschrijving storing *</label>
                  <textarea
                    className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors resize-none"
                    rows={3}
                    placeholder="Beschrijf de storing zo duidelijk mogelijk..."
                    value={meldOmschrijving}
                    onChange={e => setMeldOmschrijving(e.target.value)}
                  />
                </div>
                <button onClick={meldStoring} className="bg-red-700 hover:bg-red-600 text-white text-sm px-4 py-2 rounded transition-colors w-fit">
                  Storing melden
                </button>
              </div>
            </div>

            {/* Open storingen */}
            <div>
              <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-4">
                Open storingen <span className="text-slate-500 font-normal text-sm">({openIssues.length})</span>
              </h2>
              {openIssues.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-sm">Geen open storingen.</div>
              ) : (
                <div className="grid gap-3">
                  {openIssues.map(issue => (
                    <div key={issue.id} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-sm">{issue.laptop.merk_type}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Gemeld door: {issue.reportedBy.name}</p>
                          <p className="text-xs text-slate-400 mt-1">{issue.description}</p>
                        </div>
                        <span className="text-xs bg-red-950 border border-red-800 text-red-400 px-3 py-1 rounded-full">Open</span>
                      </div>
                      {oplosId === issue.id ? (
                        <div className="pt-3 border-t border-slate-800 grid gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Oplossing *</label>
                            <textarea
                              className="bg-slate-800 border border-slate-700 focus:border-slate-500 outline-none rounded px-3 py-2 w-full text-sm transition-colors resize-none"
                              rows={2}
                              placeholder="Beschrijf de uitgevoerde oplossing..."
                              value={oplosOplossing}
                              onChange={e => setOplosOplossing(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => losOp(issue.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition-colors">
                              Opslaan
                            </button>
                            <button onClick={() => { setOplosId(''); setOplosOplossing('') }} className="text-slate-500 hover:text-slate-300 text-xs px-3 py-1.5 transition-colors">
                              Annuleren
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setOplosId(issue.id); setOplosOplossing('') }} className="text-xs border border-slate-700 hover:border-slate-400 px-3 py-1.5 rounded transition-colors">
                          Oplossen →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
