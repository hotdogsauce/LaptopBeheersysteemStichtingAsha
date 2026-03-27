import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User { id: string; name: string; role: string }
interface Laptop { id: string; merk_type: string; status: string; specificaties: string }
interface ChecklistReport {
  id: string
  passed: boolean
  createdAt: string
  geenSchade: boolean
  geenBestanden: boolean
  schoongemaakt: boolean
  accuOk: boolean
  updatesOk: boolean
  submittedBy: { name: string }
}

const CHECKLIST_ITEMS: { key: string; label: string; beschrijving: string }[] = [
  { key: 'geenSchade',    label: 'Geen zichtbare schade',   beschrijving: 'Geen schade aan scherm, toetsenbord of behuizing' },
  { key: 'geenBestanden', label: 'Schone software',         beschrijving: 'Geen ongewenste bestanden of internetgeschiedenis' },
  { key: 'schoongemaakt', label: 'Hygiëne in orde',         beschrijving: 'Laptop is schoongemaakt' },
  { key: 'accuOk',        label: 'Accu > 80% + lader OK',   beschrijving: 'Accu is opgeladen en lader functioneert' },
  { key: 'updatesOk',     label: 'Software up-to-date',     beschrijving: 'OS en vereiste software zijn bijgewerkt' },
]

const API = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

function gql(query: string, variables?: Record<string, unknown>, userId?: string) {
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
    body: JSON.stringify({ query, variables }),
  }).then(r => r.json())
}

export default function Controle() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [inControlLaptops, setInControlLaptops] = useState<Laptop[]>([])
  const [selectedLaptopId, setSelectedLaptopId] = useState('')
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({
    geenSchade: false, geenBestanden: false, schoongemaakt: false, accuOk: false, updatesOk: false,
  })
  const [checklistHistory, setChecklistHistory] = useState<ChecklistReport[]>([])
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  const helpdeskUsers = users.filter(u => u.role === 'HELPDESK')
  const allChecked = Object.values(checklistItems).every(v => v)

  useEffect(() => {
    gql(`query { users { id name role } }`)
      .then(data => setUsers(data.data?.users || []))
  }, [])

  useEffect(() => {
    if (!selectedUserId) return
    gql(`query { laptopsByStatus(status: IN_CONTROL) { id merk_type status specificaties } }`, undefined, selectedUserId)
      .then(data => setInControlLaptops(data.data?.laptopsByStatus || []))
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedLaptopId || !selectedUserId) return
    setChecklistItems({ geenSchade: false, geenBestanden: false, schoongemaakt: false, accuOk: false, updatesOk: false })
    gql(
      `query($laptopId: ID!) { checklistsByLaptop(laptopId: $laptopId) { id passed createdAt geenSchade geenBestanden schoongemaakt accuOk updatesOk submittedBy { name } } }`,
      { laptopId: selectedLaptopId },
      selectedUserId
    ).then(data => setChecklistHistory(data.data?.checklistsByLaptop || []))
  }, [selectedLaptopId])

  async function indienen() {
    const data = await gql(
      `mutation($laptopId: ID!, $geenSchade: Boolean!, $geenBestanden: Boolean!, $schoongemaakt: Boolean!, $accuOk: Boolean!, $updatesOk: Boolean!) {
        submitChecklist(laptopId: $laptopId, geenSchade: $geenSchade, geenBestanden: $geenBestanden, schoongemaakt: $schoongemaakt, accuOk: $accuOk, updatesOk: $updatesOk) {
          id passed laptop { merk_type status }
        }
      }`,
      { laptopId: selectedLaptopId, ...checklistItems },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      const { passed, laptop } = data.data.submitChecklist
      setBericht({
        text: passed
          ? `✓ Checklist geslaagd! ${laptop.merk_type} is weer BESCHIKBAAR.`
          : `✗ Checklist niet geslaagd. ${laptop.merk_type} → DEFECT (storing aanmelden aanbevolen).`,
        type: passed ? 'ok' : 'fout'
      })
      setSelectedLaptopId('')
      gql(`query { laptopsByStatus(status: IN_CONTROL) { id merk_type status specificaties } }`, undefined, selectedUserId)
        .then(d => setInControlLaptops(d.data?.laptopsByStatus || []))
    }
  }

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }} className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');`}</style>

      <header className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Stichting Asha</p>
          <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-extrabold tracking-tight">Controle na gebruik</h1>
        </div>
        <Link href="/" className="text-sm border border-slate-700 hover:border-slate-400 px-4 py-2 rounded transition-colors">← Overzicht</Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-10">
        <div className="mb-8">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Ingelogd als helpdesk</label>
          <select
            className="bg-slate-900 border border-slate-700 focus:border-slate-400 outline-none rounded px-4 py-3 w-full text-sm transition-colors"
            value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); setSelectedLaptopId(''); setBericht(null) }}>
            <option value="">— Selecteer jouw account —</option>
            {helpdeskUsers.map(u => <option key={u.id} value={u.id}>{u.name} (Helpdesk)</option>)}
          </select>
        </div>

        {bericht && (
          <div className={`mb-6 px-4 py-3 rounded text-sm border ${bericht.type === 'ok' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-red-950 border-red-800 text-red-400'}`}>
            {bericht.text}
          </div>
        )}

        {selectedUserId && (
          <>
            <div className="mb-6">
              <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Laptop selecteren (IN_CONTROL)</label>
              {inControlLaptops.length === 0 ? (
                <p className="text-slate-600 text-sm">Geen laptops in controle.</p>
              ) : (
                <div className="grid gap-2">
                  {inControlLaptops.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLaptopId(l.id)}
                      className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                        selectedLaptopId === l.id
                          ? 'bg-violet-950 border-violet-600 text-violet-200'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                      }`}>
                      <span className="font-medium">{l.merk_type}</span>
                      {l.specificaties && <span className="text-slate-500 ml-2 text-xs">{l.specificaties}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedLaptopId && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-base mb-5">Controlelijst</h2>
                <div className="grid gap-3 mb-6">
                  {CHECKLIST_ITEMS.map(item => (
                    <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checklistItems[item.key] || false}
                        onChange={e => setChecklistItems(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium group-hover:text-slate-200 transition-colors">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.beschrijving}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={indienen}
                    className={`text-sm px-4 py-2 rounded transition-colors text-white ${
                      allChecked ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-700 hover:bg-amber-600'
                    }`}>
                    {allChecked ? 'Indienen — alles OK' : 'Indienen — bevindingen'}
                  </button>
                  <p className="text-xs text-slate-500">
                    {Object.values(checklistItems).filter(Boolean).length}/5 items afgevinkt
                  </p>
                </div>
              </div>
            )}

            {checklistHistory.length > 0 && (
              <div className="mt-8">
                <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="font-bold text-sm mb-3 text-slate-400">
                  Eerdere controles voor deze laptop
                </h2>
                <div className="grid gap-2">
                  {checklistHistory.map(r => (
                    <div key={r.id} className={`rounded-lg px-4 py-3 border text-xs ${r.passed ? 'bg-emerald-950 border-emerald-900 text-emerald-400' : 'bg-red-950 border-red-900 text-red-400'}`}>
                      {r.passed ? '✓ Geslaagd' : '✗ Niet geslaagd'} — {new Date(r.createdAt).toLocaleDateString('nl-NL')} — {r.submittedBy.name}
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
