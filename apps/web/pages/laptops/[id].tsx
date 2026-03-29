import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { useUser, gql } from '../../context/UserContext'

const statusLabel: Record<string, string> = {
  AVAILABLE: 'Beschikbaar', RESERVED: 'Gereserveerd', IN_USE: 'In gebruik',
  IN_CONTROL: 'In controle', DEFECT: 'Defect', OUT_OF_SERVICE: 'Buiten gebruik', MISSING: 'Vermist',
}
const statusBadge: Record<string, string> = {
  AVAILABLE: 'badge-available', RESERVED: 'badge-reserved', IN_USE: 'badge-in-use',
  IN_CONTROL: 'badge-in-control', DEFECT: 'badge-defect', OUT_OF_SERVICE: 'badge-oos', MISSING: 'badge-missing',
}
const resBadge: Record<string, string> = {
  REQUESTED: 'badge-pending', APPROVED: 'badge-approved', REJECTED: 'badge-rejected',
  CANCELLED: 'badge-oos', COMPLETED: 'badge-in-use',
}
const resLabel: Record<string, string> = {
  REQUESTED: 'In afwachting', APPROVED: 'Goedgekeurd', REJECTED: 'Afgewezen',
  CANCELLED: 'Geannuleerd', COMPLETED: 'Afgerond',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDT(d: string) {
  return new Date(d).toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface LaptopDetail {
  id: string
  merk_type: string
  status: string
  specificaties: string | null
  heeft_vga: boolean
  heeft_hdmi: boolean
  missingAt: string | null
  issues: {
    id: string; description: string; resolved: boolean; createdAt: string; resolvedAt: string | null
    reportedBy: { name: string }; resolvedBy: { name: string } | null; solution: string | null
  }[]
  checklists: {
    id: string; passed: boolean; createdAt: string; submittedBy: { name: string }
    geenSchade: boolean; geenBestanden: boolean; schoongemaakt: boolean; accuOk: boolean; updatesOk: boolean
  }[]
  reservations: {
    id: string; status: string; startDate: string; endDate: string
    requester: { name: string }; activity: { title: string }
  }[]
  decommission: { reden: string; datum: string; doneBy: { name: string } } | null
}

const QUERY = `
  query($id: ID!) {
    laptopDetail(id: $id) {
      id merk_type status specificaties heeft_vga heeft_hdmi missingAt
      issues { id description resolved createdAt resolvedAt solution reportedBy { name } resolvedBy { name } }
      checklists { id passed createdAt geenSchade geenBestanden schoongemaakt accuOk updatesOk submittedBy { name } }
      reservations { id status startDate endDate requester { name } activity { title } }
      decommission { reden datum doneBy { name } }
    }
  }
`

function Check({ ok }: { ok: boolean }) {
  return <span style={{ fontSize: 12, color: ok ? '#16a34a' : 'var(--red)' }}>{ok ? '✓' : '✕'}</span>
}

export default function LaptopDetailPage() {
  const router = useRouter()
  const { selectedUserId } = useUser()
  const [laptop, setLaptop] = useState<LaptopDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { id } = router.query

  useEffect(() => {
    if (!id || !selectedUserId) return
    setLoading(true)
    gql(QUERY, { id }, selectedUserId)
      .then(d => { setLaptop(d.data?.laptopDetail || null); setLoading(false) })
  }, [id, selectedUserId])

  if (!selectedUserId) return (
    <Layout title="Laptop detail">
      <div className="empty"><p className="empty-text">Selecteer een gebruiker om verder te gaan</p></div>
    </Layout>
  )

  if (loading) return (
    <Layout title="Laptop detail">
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
      </div>
    </Layout>
  )

  if (!laptop) return (
    <Layout title="Laptop detail">
      <div className="empty"><p className="empty-text">Laptop niet gevonden.</p></div>
    </Layout>
  )

  const ports = [laptop.heeft_vga && 'VGA', laptop.heeft_hdmi && 'HDMI'].filter(Boolean).join(', ')

  return (
    <Layout title={laptop.merk_type} subtitle={laptop.specificaties || undefined}>
      {/* Header card */}
      <div className="card" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`badge ${statusBadge[laptop.status] || ''}`}>{statusLabel[laptop.status] || laptop.status}</span>
            {laptop.missingAt && (
              <span style={{ fontSize: 12, color: 'var(--grey)' }}>Vermist sinds {fmt(laptop.missingAt)}</span>
            )}
          </div>
          {ports && <p style={{ margin: 0, fontSize: 13, color: 'var(--grey)' }}>Poorten: {ports}</p>}
          {laptop.decommission && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
              Uit beheer op {fmt(laptop.decommission.datum)} door {laptop.decommission.doneBy.name} — {laptop.decommission.reden}
            </div>
          )}
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => router.back()}>← Terug</button>
      </div>

      {/* Reserveringen */}
      <section style={{ marginBottom: 40 }}>
        <p className="section-label" style={{ marginBottom: 12 }}>
          Reserveringen ({laptop.reservations.length})
        </p>
        {laptop.reservations.length === 0 && <p style={{ fontSize: 13, color: 'var(--grey)' }}>Geen reserveringen.</p>}
        <div style={{ display: 'grid', gap: 6 }}>
          {laptop.reservations.map(r => (
            <div key={r.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 500, fontSize: 13, margin: 0 }}>{r.activity.title}</p>
                <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                  {r.requester.name} · {fmt(r.startDate)} → {fmt(r.endDate)}
                </p>
              </div>
              <span className={`badge ${resBadge[r.status] || ''}`} style={{ fontSize: 11 }}>{resLabel[r.status] || r.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Storingen */}
      <section style={{ marginBottom: 40 }}>
        <p className="section-label" style={{ marginBottom: 12 }}>
          Storingen ({laptop.issues.length})
        </p>
        {laptop.issues.length === 0 && <p style={{ fontSize: 13, color: 'var(--grey)' }}>Geen storingen geregistreerd.</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {laptop.issues.map(issue => (
            <div key={issue.id} className="card-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{issue.description}</p>
                  <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                    Gemeld door {issue.reportedBy.name} op {fmtDT(issue.createdAt)}
                  </p>
                  {issue.resolved && issue.solution && (
                    <p style={{ fontSize: 12, color: '#16a34a', margin: '4px 0 0' }}>
                      Opgelost: {issue.solution}
                      {issue.resolvedBy && ` (${issue.resolvedBy.name}, ${fmtDT(issue.resolvedAt!)})`}
                    </p>
                  )}
                </div>
                <span className={`badge ${issue.resolved ? 'badge-approved' : 'badge-defect'}`} style={{ fontSize: 11, flexShrink: 0 }}>
                  {issue.resolved ? 'Opgelost' : 'Open'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Checklists */}
      <section style={{ marginBottom: 40 }}>
        <p className="section-label" style={{ marginBottom: 12 }}>
          Controle checklists ({laptop.checklists.length})
        </p>
        {laptop.checklists.length === 0 && <p style={{ fontSize: 13, color: 'var(--grey)' }}>Geen checklists ingediend.</p>}
        <div style={{ display: 'grid', gap: 6 }}>
          {laptop.checklists.map(cl => (
            <div key={cl.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                  {fmtDT(cl.createdAt)} — {cl.submittedBy.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--grey)', margin: '4px 0 0', display: 'flex', gap: 12 }}>
                  <span><Check ok={cl.geenSchade} /> Geen schade</span>
                  <span><Check ok={cl.geenBestanden} /> Geen bestanden</span>
                  <span><Check ok={cl.schoongemaakt} /> Schoon</span>
                  <span><Check ok={cl.accuOk} /> Accu OK</span>
                  <span><Check ok={cl.updatesOk} /> Updates OK</span>
                </p>
              </div>
              <span className={`badge ${cl.passed ? 'badge-approved' : 'badge-defect'}`} style={{ fontSize: 11, flexShrink: 0 }}>
                {cl.passed ? 'Geslaagd' : 'Niet geslaagd'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  )
}
