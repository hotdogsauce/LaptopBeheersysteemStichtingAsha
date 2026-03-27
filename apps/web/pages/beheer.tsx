import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'

interface Laptop {
  id: string
  merk_type: string
  status: string
  specificaties: string
  heeft_vga: boolean
  heeft_hdmi: boolean
}

const statusLabel: Record<string, string> = {
  AVAILABLE: 'Beschikbaar', RESERVED: 'Gereserveerd', IN_USE: 'In gebruik',
  IN_CONTROL: 'In controle', DEFECT: 'Defect', OUT_OF_SERVICE: 'Buiten gebruik', MISSING: 'Vermist',
}

const statusBadge: Record<string, string> = {
  AVAILABLE: 'badge-available', RESERVED: 'badge-reserved', IN_USE: 'badge-in-use',
  IN_CONTROL: 'badge-in-control', DEFECT: 'badge-defect', OUT_OF_SERVICE: 'badge-oos', MISSING: 'badge-missing',
}

const GEBLOKKEERD = ['RESERVED', 'IN_USE']

export default function Beheer() {
  const { selectedUserId, selectedUser } = useUser()
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)
  const [decommissionId, setDecommissionId] = useState('')
  const [reden, setReden] = useState('')

  const actiefLaptops = laptops.filter(l => l.status !== 'OUT_OF_SERVICE')
  const uitBeheerLaptops = laptops.filter(l => l.status === 'OUT_OF_SERVICE')

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'ADMIN') return
    herlaadLaptops()
  }, [selectedUserId])

  function herlaadLaptops() {
    gql('{ laptops { id merk_type status specificaties heeft_vga heeft_hdmi } }', undefined, selectedUserId)
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
    <Layout
      title="Laptop beheer"
      subtitle="Laptops uit beheer nemen"
    >

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">🖥</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'ADMIN' && (
        <div className="alert alert-error">
          Deze pagina is alleen toegankelijk voor beheerders.
        </div>
      )}

      {selectedUserId && selectedUser?.role === 'ADMIN' && (
        <>
          {bericht && (
            <div className={bericht.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'}>
              {bericht.text}
            </div>
          )}

          <div style={{ marginBottom: 40 }}>
            <h2 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/icons/cogwheel.png" alt="" width={20} height={20} style={{ opacity: 0.7, flexShrink: 0 }} />
              Actieve laptops{' '}
              <span style={{ fontWeight: 400, color: 'var(--grey)', fontSize: 14 }}>({actiefLaptops.length})</span>
            </h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {actiefLaptops.map(laptop => {
                const geblokkeerd = GEBLOKKEERD.includes(laptop.status)
                const isOpen = decommissionId === laptop.id
                return (
                  <div key={laptop.id} className="card-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{laptop.merk_type}</p>
                        <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                          {laptop.specificaties || '—'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={`badge ${statusBadge[laptop.status] || ''}`}>
                          {statusLabel[laptop.status] || laptop.status}
                        </span>
                        {geblokkeerd ? (
                          <span style={{ fontSize: 12, color: 'var(--grey)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 5 }}>
                            Vergrendeld
                          </span>
                        ) : (
                          <button
                            className="btn btn-danger-ghost"
                            style={{ fontSize: 12, padding: '4px 12px' }}
                            onClick={() => { setDecommissionId(isOpen ? '' : laptop.id); setReden('') }}
                          >
                            {isOpen ? 'Annuleren' : 'Uit beheer'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'grid', gap: 12 }}>
                        <div>
                          <label className="label">Reden *</label>
                          <input
                            className="input"
                            placeholder="bijv. Onherstelbaar defect, verouderd model..."
                            value={reden}
                            onChange={e => setReden(e.target.value)}
                          />
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>
                          Let op: laptop wordt permanent op buiten gebruik gezet.
                        </p>
                        <div>
                          <button className="btn btn-danger" onClick={() => uitBeheer(laptop.id)}>
                            Bevestig: uit beheer nemen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {uitBeheerLaptops.length > 0 && (
            <div>
              <p className="section-label" style={{ marginBottom: 10 }}>
                Uit beheer genomen ({uitBeheerLaptops.length})
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                {uitBeheerLaptops.map(laptop => (
                  <div
                    key={laptop.id}
                    className="card-row"
                    style={{ opacity: 0.45, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--grey)' }}>{laptop.merk_type}</p>
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>Buiten gebruik</span>
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
