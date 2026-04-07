import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'

interface Laptop { id: string; merk_type: string; status: string; specificaties: string }
interface Issue {
  id: string
  description: string
  resolved: boolean
  solution: string | null
  createdAt: string
  laptop: { id: string; merk_type: string }
  reportedBy: { name: string }
}

const statusLabel: Record<string, string> = {
  AVAILABLE: 'Beschikbaar', RESERVED: 'Gereserveerd', IN_USE: 'In gebruik',
  IN_CONTROL: 'In controle', DEFECT: 'Defect', OUT_OF_SERVICE: 'Buiten gebruik', MISSING: 'Vermist',
}

const MELDBAAR = ['AVAILABLE', 'RESERVED', 'IN_USE', 'IN_CONTROL']

export default function Storingen() {
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [openIssues, setOpenIssues] = useState<Issue[]>([])

  const [meldLaptopId, setMeldLaptopId] = useState('')
  const [meldOmschrijving, setMeldOmschrijving] = useState('')
  const [oplosId, setOplosId] = useState('')
  const [oplosOplossing, setOplosOplossing] = useState('')

  useEffect(() => {
    gql('{ laptops { id merk_type status specificaties } }')
      .then(data => setLaptops(data.data?.laptops || []))
  }, [])

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'HELPDESK') return
    herlaadIssues()
  }, [selectedUserId])

  function herlaadIssues() {
    gql(
      '{ openIssues { id description resolved solution createdAt laptop { id merk_type } reportedBy { name } } }',
      undefined, selectedUserId
    ).then(data => setOpenIssues(data.data?.openIssues || []))
  }

  async function meldStoring() {
    if (!meldLaptopId) { toast('Selecteer een laptop.', 'error'); return }
    if (!meldOmschrijving.trim()) { toast('Omschrijving is verplicht.', 'error'); return }
    const data = await gql(
      `mutation($laptopId: ID!, $description: String!) {
        reportIssue(laptopId: $laptopId, description: $description) { id description laptop { merk_type status } }
      }`,
      { laptopId: meldLaptopId, description: meldOmschrijving },
      selectedUserId
    )
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      toast(`Storing gemeld voor ${data.data.reportIssue.laptop.merk_type}. Status → DEFECT.`)
      setMeldLaptopId(''); setMeldOmschrijving('')
      herlaadIssues()
      gql('{ laptops { id merk_type status specificaties } }', undefined, selectedUserId)
        .then(d => setLaptops(d.data?.laptops || []))
    }
  }

  async function losOp(issueId: string) {
    if (!oplosOplossing.trim()) { toast('Oplossing is verplicht.', 'error'); return }
    const data = await gql(
      `mutation($issueId: ID!, $solution: String!) {
        resolveIssue(issueId: $issueId, solution: $solution) { id resolved laptop { merk_type status } }
      }`,
      { issueId, solution: oplosOplossing },
      selectedUserId
    )
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      toast(`Storing opgelost. ${data.data.resolveIssue.laptop.merk_type} → IN_CONTROL.`)
      setOplosId(''); setOplosOplossing('')
      herlaadIssues()
      gql('{ laptops { id merk_type status specificaties } }', undefined, selectedUserId)
        .then(d => setLaptops(d.data?.laptops || []))
    }
  }

  return (
    <Layout title="Storingen" subtitle="Storingen melden en oplossen">

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">🔧</div>
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
          <div className="card" style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 20 }}>Storing melden</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="label">Laptop *</label>
                <select
                  className="input"
                  value={meldLaptopId}
                  onChange={e => setMeldLaptopId(e.target.value)}
                >
                  <option value="">— Selecteer laptop —</option>
                  {laptops.filter(l => MELDBAAR.includes(l.status)).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.merk_type} — {statusLabel[l.status] || l.status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Omschrijving storing *</label>
                <textarea
                  className="input"
                  placeholder="Beschrijf de storing zo duidelijk mogelijk..."
                  value={meldOmschrijving}
                  onChange={e => setMeldOmschrijving(e.target.value)}
                />
              </div>
              <div>
                <button className="btn btn-danger" onClick={meldStoring}>
                  Storing melden
                </button>
              </div>
            </div>
          </div>

          <h2 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            {openIssues.length > 0 && (
              <img src="/icons/warning.png" alt="" width={20} height={20} style={{ opacity: 0.85, flexShrink: 0 }} />
            )}
            Open storingen{' '}
            <span style={{ fontWeight: 400, color: 'var(--grey)', fontSize: 14 }}>({openIssues.length})</span>
          </h2>

          {openIssues.length === 0 && (
            <div className="empty" style={{ padding: '40px 0' }}>
              <p className="empty-text">Geen open storingen.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {openIssues.map(issue => (
              <div key={issue.id} className="card-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: oplosId === issue.id ? 16 : 0 }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{issue.laptop.merk_type}</p>
                    <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                      Gemeld door: {issue.reportedBy.name}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--black)', margin: '6px 0 0' }}>
                      {issue.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-defect">Open</span>
                    {oplosId !== issue.id && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: '4px 12px' }}
                        onClick={() => { setOplosId(issue.id); setOplosOplossing('') }}
                      >
                        Oplossen
                      </button>
                    )}
                  </div>
                </div>

                {oplosId === issue.id && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'grid', gap: 12 }}>
                    <div>
                      <label className="label">Oplossing *</label>
                      <textarea
                        className="input"
                        placeholder="Beschrijf de uitgevoerde oplossing..."
                        value={oplosOplossing}
                        onChange={e => setOplosOplossing(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => losOp(issue.id)}>Opslaan</button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => { setOplosId(''); setOplosOplossing('') }}
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
