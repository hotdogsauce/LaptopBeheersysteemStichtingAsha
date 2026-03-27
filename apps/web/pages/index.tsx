import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'

interface Laptop {
  id: string
  merk_type: string
  status: string
  heeft_vga: boolean
  heeft_hdmi: boolean
  specificaties: string
}

const statusLabel: Record<string, string> = {
  AVAILABLE:      'Beschikbaar',
  RESERVED:       'Gereserveerd',
  IN_USE:         'In gebruik',
  IN_CONTROL:     'In controle',
  DEFECT:         'Defect',
  OUT_OF_SERVICE: 'Buiten gebruik',
  MISSING:        'Vermist',
}

const statusBadge: Record<string, string> = {
  AVAILABLE:      'badge-available',
  RESERVED:       'badge-reserved',
  IN_USE:         'badge-in-use',
  IN_CONTROL:     'badge-in-control',
  DEFECT:         'badge-defect',
  OUT_OF_SERVICE: 'badge-oos',
  MISSING:        'badge-missing',
}

const allowedTransitions: Record<string, string[]> = {
  AVAILABLE:      [],
  RESERVED:       ['IN_USE', 'AVAILABLE'],
  IN_USE:         ['IN_CONTROL'],
  IN_CONTROL:     ['AVAILABLE', 'DEFECT', 'MISSING'],
  DEFECT:         ['OUT_OF_SERVICE'],
  OUT_OF_SERVICE: [],
  MISSING:        [],
}

export default function Home() {
  const { selectedUserId, selectedUser } = useUser()
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [loading, setLoading] = useState(false)
  const [bericht, setBericht] = useState<{ text: string; type: 'ok' | 'fout' } | null>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [nieuwMerk, setNieuwMerk] = useState('')
  const [nieuwSpec, setNieuwSpec] = useState('')
  const [nieuwVga, setNieuwVga] = useState(false)
  const [nieuwHdmi, setNieuwHdmi] = useState(false)

  const [wijzigId, setWijzigId] = useState<string | null>(null)
  const [nieuweStatus, setNieuweStatus] = useState('')
  const [maintenanceLog, setMaintenanceLog] = useState('')

  useEffect(() => {
    if (!selectedUserId) { setLaptops([]); return }
    setLoading(true)
    gql('{ laptops { id merk_type status heeft_vga heeft_hdmi specificaties } }', undefined, selectedUserId)
      .then(data => { setLaptops(data.data?.laptops || []); setLoading(false) })
  }, [selectedUserId])

  function herlaadLaptops() {
    gql('{ laptops { id merk_type status heeft_vga heeft_hdmi specificaties } }', undefined, selectedUserId)
      .then(data => setLaptops(data.data?.laptops || []))
  }

  async function maakLaptopAan() {
    if (!nieuwMerk.trim()) { setBericht({ text: 'Merk/type is verplicht.', type: 'fout' }); return }
    const data = await gql(
      `mutation($merk_type: String!, $specificaties: String, $heeft_vga: Boolean!, $heeft_hdmi: Boolean!) {
        createLaptop(merk_type: $merk_type, specificaties: $specificaties, heeft_vga: $heeft_vga, heeft_hdmi: $heeft_hdmi) {
          id merk_type status
        }
      }`,
      { merk_type: nieuwMerk, specificaties: nieuwSpec || null, heeft_vga: nieuwVga, heeft_hdmi: nieuwHdmi },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: `Laptop "${nieuwMerk}" aangemaakt.`, type: 'ok' })
      setNieuwMerk(''); setNieuwSpec(''); setNieuwVga(false); setNieuwHdmi(false)
      setShowCreateForm(false)
      herlaadLaptops()
    }
  }

  async function wijzigStatus(laptopId: string) {
    if (!nieuweStatus) return
    const data = await gql(
      `mutation($laptopId: ID!, $status: LaptopStatus!, $maintenanceLog: String) {
        processReturn(laptopId: $laptopId, status: $status, maintenanceLog: $maintenanceLog) { id status }
      }`,
      { laptopId, status: nieuweStatus, maintenanceLog: maintenanceLog || null },
      selectedUserId
    )
    if (data.errors) {
      setBericht({ text: data.errors[0].message, type: 'fout' })
    } else {
      setBericht({ text: `Status gewijzigd naar ${statusLabel[nieuweStatus] || nieuweStatus}.`, type: 'ok' })
      setWijzigId(null); setNieuweStatus(''); setMaintenanceLog('')
      herlaadLaptops()
    }
  }

  return (
    <Layout title="Overzicht" subtitle="Alle laptops in het systeem">

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">💻</div>
          <p className="empty-text">Selecteer een gebruiker in de navigatiebalk om verder te gaan</p>
        </div>
      )}

      {selectedUserId && (
        <>
          {bericht && (
            <div className={bericht.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'}>
              {bericht.text}
            </div>
          )}

          {(selectedUser?.role === 'ADMIN' || selectedUser?.role === 'HELPDESK') && (
            <div style={{ marginBottom: 28 }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setShowCreateForm(v => !v); setBericht(null) }}
              >
                {showCreateForm ? '✕ Annuleren' : '+ Laptop toevoegen'}
              </button>

              {showCreateForm && (
                <div className="card" style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                  <div>
                    <label className="label">Merk / type *</label>
                    <input
                      className="input"
                      placeholder="bijv. Dell Latitude 5520"
                      value={nieuwMerk}
                      onChange={e => setNieuwMerk(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Specificaties</label>
                    <input
                      className="input"
                      placeholder="bijv. i5 8GB 256SSD"
                      value={nieuwSpec}
                      onChange={e => setNieuwSpec(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={nieuwVga} onChange={e => setNieuwVga(e.target.checked)} />
                      VGA poort
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={nieuwHdmi} onChange={e => setNieuwHdmi(e.target.checked)} />
                      HDMI poort
                    </label>
                  </div>
                  <div>
                    <button className="btn btn-primary" onClick={maakLaptopAan}>Aanmaken</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && <p style={{ color: 'var(--grey)', fontSize: 13 }}>Laden...</p>}

          {!loading && laptops.length === 0 && (
            <div className="empty">
              <div className="empty-icon">📦</div>
              <p className="empty-text">Geen laptops gevonden</p>
            </div>
          )}

          {!loading && laptops.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {laptops.map(laptop => {
                const opties = allowedTransitions[laptop.status] || []
                const kanWijzigen = selectedUser?.role === 'HELPDESK' && opties.length > 0
                const isOpen = wijzigId === laptop.id

                return (
                  <div key={laptop.id} className="card-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{laptop.merk_type}</p>
                          <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>
                            {laptop.specificaties || '—'}
                            {laptop.heeft_vga && ' · VGA'}
                            {laptop.heeft_hdmi && ' · HDMI'}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={`badge ${statusBadge[laptop.status] || ''}`}>
                          {statusLabel[laptop.status] || laptop.status}
                        </span>
                        {kanWijzigen && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => { setWijzigId(isOpen ? null : laptop.id); setNieuweStatus(''); setMaintenanceLog('') }}
                          >
                            {isOpen ? 'Sluiten' : 'Wijzig'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'grid', gap: 12 }}>
                        <div>
                          <label className="label">Nieuwe status</label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {opties.map(opt => (
                              <button
                                key={opt}
                                className={`btn ${nieuweStatus === opt ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: 12, padding: '4px 12px' }}
                                onClick={() => setNieuweStatus(opt)}
                              >
                                {statusLabel[opt] || opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        {nieuweStatus === 'DEFECT' && (
                          <div>
                            <label className="label">Onderhoudslog</label>
                            <input
                              className="input"
                              placeholder="Beschrijf het defect..."
                              value={maintenanceLog}
                              onChange={e => setMaintenanceLog(e.target.value)}
                            />
                          </div>
                        )}
                        <div>
                          <button
                            className="btn btn-primary"
                            disabled={!nieuweStatus}
                            onClick={() => wijzigStatus(laptop.id)}
                          >
                            Status opslaan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
