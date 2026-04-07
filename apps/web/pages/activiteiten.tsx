import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'

interface Activity {
  id: string
  title: string
  omschrijving: string | null
}

export default function Activiteiten() {
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [saving, setSaving] = useState(false)

  const canCreate = selectedUser?.role === 'OWNER' || selectedUser?.role === 'ADMIN'

  useEffect(() => {
    if (!selectedUserId) return
    setLoading(true)
    gql('{ activities { id title omschrijving } }', undefined, selectedUserId)
      .then(d => { setActivities(d.data?.activities || []); setLoading(false) })
  }, [selectedUserId])

  async function maakAan() {
    if (!title.trim()) { toast('Titel is verplicht.', 'error'); return }
    setSaving(true)
    const data = await gql(
      `mutation($title: String!, $omschrijving: String) {
        createActivity(title: $title, omschrijving: $omschrijving) {
          id title omschrijving
        }
      }`,
      { title, omschrijving: omschrijving || null },
      selectedUserId
    )
    setSaving(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast(`Activiteit "${title}" aangemaakt.`)
    setActivities(prev => [data.data.createActivity, ...prev])
    setTitle(''); setOmschrijving('')
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
                <div key={i} className="card-row">
                  <div className="skeleton" style={{ width: 200, height: 14 }} />
                  <div className="skeleton" style={{ width: 140, height: 11, marginTop: 6 }} />
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
                <div key={a.id} className="card-row">
                  <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{a.title}</p>
                  {a.omschrijving && <p style={{ fontSize: 12, color: 'var(--grey)', margin: '2px 0 0' }}>{a.omschrijving}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
