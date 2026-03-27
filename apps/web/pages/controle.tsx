import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'

interface Laptop { id: string; merk_type: string; status: string; specificaties: string }
interface ChecklistReport {
  id: string
  passed: boolean
  createdAt: string
  submittedBy: { name: string }
}

const CHECKLIST_ITEMS: { key: string; label: string; beschrijving: string }[] = [
  { key: 'geenSchade',    label: 'Geen zichtbare schade',   beschrijving: 'Geen schade aan scherm, toetsenbord of behuizing' },
  { key: 'geenBestanden', label: 'Schone software',         beschrijving: 'Geen ongewenste bestanden of internetgeschiedenis' },
  { key: 'schoongemaakt', label: 'Hygiëne in orde',         beschrijving: 'Laptop is schoongemaakt' },
  { key: 'accuOk',        label: 'Accu > 80% + lader OK',   beschrijving: 'Accu is opgeladen en lader functioneert' },
  { key: 'updatesOk',     label: 'Software up-to-date',     beschrijving: 'OS en vereiste software zijn bijgewerkt' },
]

export default function Controle() {
  const { selectedUserId, selectedUser } = useUser()
  const [inControlLaptops, setInControlLaptops] = useState<Laptop[]>([])
  const [selectedLaptopId, setSelectedLaptopId] = useState('')
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({
    geenSchade: false, geenBestanden: false, schoongemaakt: false, accuOk: false, updatesOk: false,
  })
  const [checklistHistory, setChecklistHistory] = useState<ChecklistReport[]>([])
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  const allChecked = Object.values(checklistItems).every(v => v)
  const checkedCount = Object.values(checklistItems).filter(Boolean).length

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'HELPDESK') return
    gql('{ laptopsByStatus(status: IN_CONTROL) { id merk_type status specificaties } }', undefined, selectedUserId)
      .then(data => setInControlLaptops(data.data?.laptopsByStatus || []))
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedLaptopId || !selectedUserId) return
    setChecklistItems({ geenSchade: false, geenBestanden: false, schoongemaakt: false, accuOk: false, updatesOk: false })
    gql(
      `query($laptopId: ID!) { checklistsByLaptop(laptopId: $laptopId) { id passed createdAt submittedBy { name } } }`,
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
          ? `Checklist geslaagd. ${laptop.merk_type} is weer beschikbaar.`
          : `Checklist niet geslaagd. ${laptop.merk_type} → DEFECT.`,
        type: passed ? 'ok' : 'fout'
      })
      setSelectedLaptopId('')
      gql('{ laptopsByStatus(status: IN_CONTROL) { id merk_type status specificaties } }', undefined, selectedUserId)
        .then(d => setInControlLaptops(d.data?.laptopsByStatus || []))
    }
  }

  return (
    <Layout title="Controle na gebruik" subtitle="Controleer laptops die zijn ingeleverd">

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">✓</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'HELPDESK' && (
        <div className="alert alert-error">
          Deze pagina is alleen toegankelijk voor helpdeskmedewerkers.
        </div>
      )}

      {selectedUserId && selectedUser?.role === 'HELPDESK' && (
        <>
          {bericht && (
            <div className={bericht.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'}>
              {bericht.text}
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <label className="label">Laptop selecteren (in controle)</label>
            {inControlLaptops.length === 0 ? (
              <div className="empty" style={{ padding: '32px 0' }}>
                <p className="empty-text">Geen laptops in controlestatus.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {inControlLaptops.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLaptopId(l.id)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius)',
                      border: selectedLaptopId === l.id ? '1px solid var(--black)' : '1px solid var(--border)',
                      background: selectedLaptopId === l.id ? 'var(--black)' : 'var(--white)',
                      color: selectedLaptopId === l.id ? 'var(--white)' : 'var(--black)',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontFamily: 'var(--font)',
                      fontWeight: selectedLaptopId === l.id ? 500 : 400,
                      transition: 'all 0.12s',
                    }}
                  >
                    {l.merk_type}
                    {l.specificaties && (
                      <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 8 }}>{l.specificaties}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedLaptopId && (
            <div className="card" style={{ marginBottom: 32 }}>
              <h2 style={{ marginBottom: 20 }}>Controlelijst</h2>
              <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                {CHECKLIST_ITEMS.map(item => (
                  <label
                    key={item.key}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={checklistItems[item.key] || false}
                      onChange={e => setChecklistItems(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>{item.beschrijving}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  className={`btn ${allChecked ? 'btn-primary' : 'btn-danger'}`}
                  onClick={indienen}
                >
                  {allChecked ? 'Indienen — alles OK' : 'Indienen — bevindingen'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                  {checkedCount}/5 items afgevinkt
                </span>
              </div>
            </div>
          )}

          {checklistHistory.length > 0 && (
            <div>
              <p className="section-label" style={{ marginBottom: 10 }}>Eerdere controles</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {checklistHistory.map(r => (
                  <div
                    key={r.id}
                    className={r.passed ? 'alert alert-ok' : 'alert alert-error'}
                    style={{ marginBottom: 0, fontSize: 12 }}
                  >
                    {r.passed ? 'Geslaagd' : 'Niet geslaagd'} — {new Date(r.createdAt).toLocaleDateString('nl-NL')} — {r.submittedBy.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
