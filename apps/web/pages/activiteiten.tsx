import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'

interface Activity {
  id: string
  title: string
  start_datum_tijd: string
  eind_datum_tijd: string
  omschrijving: string | null
}

function formatDT(dt: string) {
  const d = new Date(dt)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function minDate() {
  return new Date().toISOString().slice(0, 16)
}

export default function Activiteiten() {
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [eind, setEind] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [saving, setSaving] = useState(false)

  const canCreate = selectedUser?.role === 'OWNER' || selectedUser?.role === 'ADMIN'

  useEffect(() => {
    if (!selectedUserId) return
    setLoading(true)
    gql('{ activities { id title start_datum_tijd eind_datum_tijd omschrijving } }', undefined, selectedUserId)
      .then(d => { setActivities(d.data?.activities || []); setLoading(false) })
  }, [selectedUserId])

  async function maakAan() {
    if (!title.trim()) { toast('Titel is verplicht.', 'error'); return }
    if (!start) { toast('Startdatum is verplicht.', 'error'); return }
    if (!eind) { toast('Einddatum is verplicht.', 'error'); return }
    setSaving(true)
    const data = await gql(
      `mutation($title: String!, $start: String!, $eind: String!, $omschrijving: String) {
        createActivity(title: $title, start_datum_tijd: $start, eind_datum_tijd: $eind, omschrijving: $omschrijving) {
          id title start_datum_tijd eind_datum_tijd omschrijving
        }
      }`,
      { title, start, eind, omschrijving: omschrijving || null },
      selectedUserId
    )
    setSaving(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast(`Activiteit "${title}" aangemaakt.`)
    setActivities(prev => [data.data.createActivity, ...prev])
    setTitle(''); setStart(''); setEind(''); setOmschrijving('')
    setShowForm(false)
  }

  return (
    <Layout title="Activiteiten" subtitle="Overzicht en beheer van activiteiten">

      {!selectedUserId && (
        <div className="empty"><div className="empty-icon">📅</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && !canCreate && (
        <div className="alert alert-error">Deze pagina is alleen toegankelijk voor eigenaren en beheerders.</div>
      )}

      {selectedUserId && canCreate && (
        <>
          <div style={{ marginBottom: 28 }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕ Annuleren' : '+ Activiteit toevoegen'}
            </button>

            {showForm && (
              <div className="card" style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                <div>
                  <label className="label">Titel *</label>
                  <input className="input" placeholder="bijv. Workshop Programmeren" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Startdatum & tijd *</label>
                    <input type="datetime-local" className="input" min={minDate()} value={start} onChange={e => setStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Einddatum & tijd *</label>
                    <input type="datetime-local" className="input" min={start || minDate()} value={eind} onChange={e => setEind(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Omschrijving</label>
                  <textarea className="input" placeholder="Korte omschrijving van de activiteit..." value={omschrijving} onChange={e => setOmschrijving(e.target.value)} />
                </div>
                <div>
                  <button className="btn btn-primary" disabled={saving} onClick={maakAan}>
                    {saving ? 'Opslaan…' : 'Activiteit aanmaken'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div style={{ display: 'grid', gap: 8 }}>
              {[1,2,3].map(i => (
                <div key={i} className="card-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div className="skeleton" style={{ width: 200, height: 14 }} />
                    <div className="skeleton" style={{ width: 140, height: 11 }} />
                  </div>
                  <div className="skeleton" style={{ width: 100, height: 11 }} />
                </div>
              ))}
            </div>
          )}

          {!loading && activities.length === 0 && (
            <div className="empty"><div className="empty-icon">📅</div>
              <p className="empty-text">Nog geen activiteiten</p>
            </div>
          )}

          {!loading && activities.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {activities.map(a => (
                <div key={a.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{a.title}</p>
                    {a.omschrijving && <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>{a.omschrijving}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>{formatDT(a.start_datum_tijd)}</p>
                    <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>→ {formatDT(a.eind_datum_tijd)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
