import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'

interface HulpVraag {
  id: string
  voornaamKlant: string
  achternaamKlant: string | null
  categorie: string
  apparaatType: string | null
  status: string
  vraag: string
  oplossing: string
  escalatie: boolean
  vervolgAfspraak: string | null
  vervolgMetWie: string | null
  vervolgNotitie: string | null
  createdAt: string
  helperBy: { name: string }
}

const categorieLabel: Record<string, string> = {
  MOBIEL: 'Mobiel', TABLET: 'Tablet', LAPTOP: 'Laptop',
  INTERNET_WIFI: 'Internet / Wifi', ACCOUNT: 'Account', OVERIG: 'Overig',
}

const CATEGORIEEN = Object.keys(categorieLabel)

const HV_QUERY = `{
  id voornaamKlant achternaamKlant categorie apparaatType status
  vraag oplossing escalatie vervolgAfspraak vervolgMetWie vervolgNotitie
  createdAt helperBy { name }
}`

export default function Hulpvragen() {
  const { selectedUserId, selectedUser, loggedInUser } = useUser()
  const { toast } = useToast()

  // Form state
  const [voornaam,         setVoornaam]         = useState('')
  const [achternaam,       setAchternaam]        = useState('')
  const [categorie,        setCategorie]         = useState('OVERIG')
  const [apparaat,         setApparaat]          = useState('')
  const [status,           setStatus]            = useState('OPEN')
  const [vraag,            setVraag]             = useState('')
  const [oplossing,        setOplossing]         = useState('')
  const [escalatie,        setEscalatie]         = useState(false)
  const [vervolgDatum,     setVervolgDatum]      = useState('')
  const [vervolgTijd,      setVervolgTijd]       = useState('')
  const [vervolgMetWie,    setVervolgMetWie]     = useState('')
  const [vervolgNotitie,   setVervolgNotitie]    = useState('')
  const [saving,           setSaving]            = useState(false)

  // List state
  const [hulpVragen,       setHulpVragen]        = useState<HulpVraag[]>([])
  const [filterStatus,     setFilterStatus]      = useState<'ALLE' | 'OPEN' | 'AFGEROND'>('ALLE')
  const [confirmSluitId,   setConfirmSluitId]    = useState<string | null>(null)

  const isAdmin    = loggedInUser?.role === 'ADMIN'
  const isHelpdesk = loggedInUser?.role === 'HELPDESK' || isAdmin

  useEffect(() => {
    if (!selectedUserId || !isHelpdesk) return
    laadHulpVragen()
  }, [selectedUserId])

  function laadHulpVragen() {
    const query = isAdmin
      ? `{ alleHulpVragen ${HV_QUERY} }`
      : `{ mijnHulpVragen ${HV_QUERY} }`
    gql(query, undefined, selectedUserId)
      .then(d => setHulpVragen(d.data?.alleHulpVragen || d.data?.mijnHulpVragen || []))
  }

  async function registreer() {
    if (!voornaam.trim())   { toast('Voornaam klant is verplicht.', 'error'); return }
    if (!vraag.trim())      { toast('Vraag/probleem is verplicht.', 'error'); return }
    if (!oplossing.trim())  { toast('Oplossing is verplicht.', 'error'); return }
    if (escalatie && (!vervolgDatum || !vervolgTijd)) {
      toast('Datum en tijd vervolgafspraak zijn verplicht bij escalatie.', 'error'); return
    }

    const vervolgAfspraak = escalatie && vervolgDatum && vervolgTijd
      ? new Date(`${vervolgDatum}T${vervolgTijd}`).toISOString()
      : null

    setSaving(true)
    const data = await gql(
      `mutation(
        $voornaamKlant: String!, $achternaamKlant: String,
        $categorie: HulpVraagCategorie!, $apparaatType: String,
        $status: HulpVraagStatus!, $vraag: String!, $oplossing: String!,
        $escalatie: Boolean!, $vervolgAfspraak: String,
        $vervolgMetWie: String, $vervolgNotitie: String
      ) {
        registreerHulpVraag(
          voornaamKlant: $voornaamKlant, achternaamKlant: $achternaamKlant,
          categorie: $categorie, apparaatType: $apparaatType,
          status: $status, vraag: $vraag, oplossing: $oplossing,
          escalatie: $escalatie, vervolgAfspraak: $vervolgAfspraak,
          vervolgMetWie: $vervolgMetWie, vervolgNotitie: $vervolgNotitie
        ) { id }
      }`,
      {
        voornaamKlant: voornaam.trim(),
        achternaamKlant: achternaam.trim() || null,
        categorie, apparaatType: apparaat.trim() || null,
        status, vraag: vraag.trim(), oplossing: oplossing.trim(),
        escalatie, vervolgAfspraak,
        vervolgMetWie: vervolgMetWie.trim() || null,
        vervolgNotitie: vervolgNotitie.trim() || null,
      },
      selectedUserId
    )
    setSaving(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Hulpvraag geregistreerd.')
    setVoornaam(''); setAchternaam(''); setCategorie('OVERIG'); setApparaat('')
    setStatus('OPEN'); setVraag(''); setOplossing(''); setEscalatie(false)
    setVervolgDatum(''); setVervolgTijd(''); setVervolgMetWie(''); setVervolgNotitie('')
    laadHulpVragen()
  }

  async function sluit(id: string) {
    const data = await gql(
      `mutation($id: ID!) { sluitHulpVraag(id: $id) { id status } }`,
      { id }, selectedUserId
    )
    setConfirmSluitId(null)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Hulpvraag afgerond.')
    setHulpVragen(prev => prev.map(h => h.id === id ? { ...h, status: 'AFGEROND' } : h))
  }

  // Partition: upcoming follow-ups (open + has future vervolgAfspraak), then rest filtered
  const now = new Date()
  const metVervolg = hulpVragen.filter(
    h => h.status === 'OPEN' && h.escalatie && h.vervolgAfspraak && new Date(h.vervolgAfspraak) >= now
  ).sort((a, b) => new Date(a.vervolgAfspraak!).getTime() - new Date(b.vervolgAfspraak!).getTime())

  const metVervolgIds = new Set(metVervolg.map(h => h.id))
  const overige = hulpVragen
    .filter(h => !metVervolgIds.has(h.id))
    .filter(h => filterStatus === 'ALLE' || h.status === filterStatus)

  if (!isHelpdesk) {
    return (
      <Layout title="Hulpvragen" subtitle="Noteer vragen van bezoekers">
        <div className="alert alert-error">Deze pagina is alleen toegankelijk voor helpdesk medewerkers.</div>
      </Layout>
    )
  }

  return (
    <Layout title="Hulpvragen" subtitle="Noteer vragen van bezoekers">

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">💬</div>
          <p className="empty-text">Selecteer een gebruiker om verder te gaan</p>
        </div>
      )}

      {selectedUserId && (
        <>
          {/* ── Registratieformulier ── */}
          <div className="card" style={{ marginBottom: 40 }}>
            <h2 style={{ marginBottom: 4 }}>Nieuwe hulpvraag</h2>
            <p style={{ fontSize: 13, color: 'var(--grey)', margin: '0 0 20px' }}>
              Noteer kort de vraag, jouw oplossing en of er een vervolgafspraak nodig is.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="label">Voornaam klant *</label>
                <input className="input" placeholder="bijv. Jan" value={voornaam} onChange={e => setVoornaam(e.target.value)} />
              </div>
              <div>
                <label className="label">Achternaam klant</label>
                <input className="input" placeholder="bijv. de Vries" value={achternaam} onChange={e => setAchternaam(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
              <div>
                <label className="label">Categorie</label>
                <select className="input" value={categorie} onChange={e => setCategorie(e.target.value)}>
                  {CATEGORIEEN.map(c => <option key={c} value={c}>{categorieLabel[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Apparaattype</label>
                <input className="input" placeholder="Bijv. Telefoon, Router, Tv..." value={apparaat} onChange={e => setApparaat(e.target.value)} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="OPEN">Open</option>
                  <option value="AFGEROND">Afgerond</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="label">Vraag / probleem *</label>
              <textarea className="input" rows={3} placeholder="Beschrijf het probleem van de klant..." value={vraag} onChange={e => setVraag(e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="label">Oplossing *</label>
              <textarea className="input" rows={3} placeholder="Hoe is het opgelost?" value={oplossing} onChange={e => setOplossing(e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            {/* Escalatie toggle */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <p className="label" style={{ marginBottom: 10 }}>Escalatie / vervolgafspraak</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setEscalatie(false)}
                  style={{
                    padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)',
                    background: !escalatie ? 'var(--black)' : 'transparent',
                    color: !escalatie ? 'var(--white)' : 'var(--grey)',
                    border: '1px solid var(--border)',
                  }}
                >Geen escalatie</button>
                <button
                  onClick={() => setEscalatie(true)}
                  style={{
                    padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)',
                    background: escalatie ? 'var(--black)' : 'transparent',
                    color: escalatie ? 'var(--white)' : 'var(--grey)',
                    border: '1px solid var(--border)',
                  }}
                >Wel escalatie</button>
              </div>

              {escalatie && (
                <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="label">Datum vervolgafspraak *</label>
                      <input type="date" className="input" value={vervolgDatum} onChange={e => setVervolgDatum(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Tijdstip *</label>
                      <input type="time" className="input" value={vervolgTijd} onChange={e => setVervolgTijd(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Met wie / waar</label>
                    <input className="input" placeholder="bijv. IT afdeling kamer 3, collega Pieter..." value={vervolgMetWie} onChange={e => setVervolgMetWie(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Notitie voor vervolgafspraak</label>
                    <textarea className="input" rows={2} placeholder="Context voor de volgende keer..." value={vervolgNotitie} onChange={e => setVervolgNotitie(e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="btn btn-primary" disabled={saving} onClick={registreer}>
                {saving ? 'Opslaan…' : 'Hulpvraag registreren'}
              </button>
            </div>
          </div>

          {/* ── Lijst ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>
              {isAdmin ? 'Alle hulpvragen' : 'Jouw hulpvragen'}
              <span style={{ fontWeight: 400, color: 'var(--grey)', fontSize: 14, marginLeft: 8 }}>({hulpVragen.length})</span>
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['ALLE', 'OPEN', 'AFGEROND'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`filter-chip${filterStatus === s ? ' filter-chip-active' : ''}`}>
                  <span style={{ fontSize: 11 }}>{s === 'ALLE' ? 'Alle' : s === 'OPEN' ? 'Open' : 'Afgerond'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming follow-ups */}
          {metVervolg.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p className="section-label" style={{ marginBottom: 10, color: 'var(--red)' }}>
                Aankomende vervolgafspraken ({metVervolg.length})
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {metVervolg.map(h => (
                  <HulpVraagKaart key={h.id} h={h} isAdmin={isAdmin}
                    onSluit={() => setConfirmSluitId(h.id)}
                    highlight />
                ))}
              </div>
            </div>
          )}

          {/* Rest */}
          {overige.length === 0 ? (
            <div className="empty" style={{ padding: '40px 0' }}>
              <p className="empty-text">Geen hulpvragen gevonden.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {overige.map(h => (
                <HulpVraagKaart key={h.id} h={h} isAdmin={isAdmin}
                  onSluit={() => setConfirmSluitId(h.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirmation modal */}
      {confirmSluitId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ maxWidth: 360, width: '100%', margin: 16 }}>
            <h3 style={{ marginBottom: 8 }}>Hulpvraag afronden?</h3>
            <p style={{ fontSize: 13, color: 'var(--grey)', margin: '0 0 20px' }}>
              De hulpvraag wordt gemarkeerd als afgerond. Dit kan niet ongedaan worden gemaakt.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => sluit(confirmSluitId)}>
                Ja, afronden
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmSluitId(null)}>
                Annuleer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function HulpVraagKaart({ h, isAdmin, onSluit, highlight }: {
  h: HulpVraag
  isAdmin: boolean
  onSluit: () => void
  highlight?: boolean
}) {
  const [open, setOpen] = useState(false)

  const klantNaam = [h.voornaamKlant, h.achternaamKlant].filter(Boolean).join(' ')
  const logDatum  = new Date(h.createdAt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const vervolgDatum = h.vervolgAfspraak
    ? new Date(h.vervolgAfspraak).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="card-row" style={{ borderLeft: highlight ? '3px solid var(--red)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>{klantNaam}</p>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500,
              background: h.status === 'OPEN' ? 'var(--yellow-soft, #fef9c3)' : 'var(--green-soft, #dcfce7)',
              color: h.status === 'OPEN' ? '#854d0e' : '#166534',
            }}>
              {h.status === 'OPEN' ? 'Open' : 'Afgerond'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--grey)', padding: '2px 8px', background: 'var(--surface-2, #f3f4f6)', borderRadius: 4 }}>
              {categorieLabel[h.categorie] || h.categorie}
            </span>
            {h.apparaatType && (
              <span style={{ fontSize: 11, color: 'var(--grey)' }}>{h.apparaatType}</span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--grey)' }}>
            {logDatum}{isAdmin ? ` · ${h.helperBy.name}` : ''}
            {vervolgDatum && <span style={{ color: 'var(--red)', marginLeft: 8 }}>Vervolg: {vervolgDatum}{h.vervolgMetWie ? ` · ${h.vervolgMetWie}` : ''}</span>}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--black)' }}>{h.vraag}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
          {h.status === 'OPEN' && (
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={onSluit}>
              Afronden
            </button>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            style={{ fontSize: 12, color: 'var(--grey)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            {open ? 'Minder' : 'Meer'}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'grid', gap: 8 }}>
          <div>
            <p className="label" style={{ marginBottom: 2 }}>Oplossing</p>
            <p style={{ margin: 0, fontSize: 13 }}>{h.oplossing}</p>
          </div>
          {h.escalatie && (
            <div style={{ padding: '10px 12px', background: 'var(--surface-2, #f3f4f6)', borderRadius: 6 }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600 }}>Escalatie</p>
              {vervolgDatum && <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--grey)' }}>Afspraak: {vervolgDatum}</p>}
              {h.vervolgMetWie && <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--grey)' }}>Met: {h.vervolgMetWie}</p>}
              {h.vervolgNotitie && <p style={{ margin: '0', fontSize: 12, color: 'var(--grey)' }}>{h.vervolgNotitie}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
