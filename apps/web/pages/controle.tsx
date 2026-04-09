import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useT } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'

interface Laptop { id: string; merk_type: string; status: string; specificaties: string }
interface ChecklistHistory {
  id: string
  passed: boolean
  createdAt: string
  submittedBy: { name: string }
  toetsenbord_ok: boolean | null
  camera_ok: boolean | null
  microfoon_ok: boolean | null
  schijf_type: string | null
  ram_totaal: string | null
  wifi_signaal: number | null
  ping_ms: number | null
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%', background: 'var(--black)',
          color: 'var(--white)', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{number}</span>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{title}</p>
      </div>
      <div style={{ paddingLeft: 34, display: 'grid', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        className={`btn ${value === true ? 'btn-primary' : 'btn-ghost'}`}
        style={{ fontSize: 12, padding: '5px 16px' }}
        onClick={() => onChange(true)}
      >Ja</button>
      <button
        type="button"
        className={`btn ${value === false ? 'btn-danger' : 'btn-ghost'}`}
        style={{ fontSize: 12, padding: '5px 16px' }}
        onClick={() => onChange(false)}
      >Nee</button>
    </div>
  )
}

function Check({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span style={{ color: 'var(--grey)', fontSize: 12 }}>—</span>
  return <span style={{ fontSize: 12, color: ok ? '#16a34a' : 'var(--red)' }}>{ok ? '✓' : '✕'}</span>
}

const emptyForm = () => ({
  schijf_type: '',
  schijf_grootte: '',
  schijf_sneller: '',
  ram_totaal: '',
  ram_gebruikt: '',
  opslag_vrij: '',
  opstartprogrammas: '',
  energie_ingesteld: null as boolean | null,
  wifi_signaal: '',
  ping_ms: '',
  toetsenbord_ok: null as boolean | null,
  camera_ok: null as boolean | null,
  microfoon_ok: null as boolean | null,
})

export default function Controle() {
  const { selectedUserId, selectedUser } = useUser()
  const { t } = useT()
  const { toast } = useToast()
  const [inControlLaptops, setInControlLaptops] = useState<Laptop[]>([])
  const [selectedLaptopId, setSelectedLaptopId] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [history, setHistory] = useState<ChecklistHistory[]>([])
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = form.toetsenbord_ok !== null && form.camera_ok !== null && form.microfoon_ok !== null

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (!selectedUserId || selectedUser?.role !== 'HELPDESK') return
    gql('{ laptopsByStatus(status: IN_CONTROL) { id merk_type status specificaties } }', undefined, selectedUserId)
      .then(d => setInControlLaptops(d.data?.laptopsByStatus || []))
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedLaptopId || !selectedUserId) return
    setForm(emptyForm())
    gql(
      `query($laptopId: ID!) {
        checklistsByLaptop(laptopId: $laptopId) {
          id passed createdAt
          submittedBy { name }
          toetsenbord_ok camera_ok microfoon_ok
          schijf_type ram_totaal wifi_signaal ping_ms
        }
      }`,
      { laptopId: selectedLaptopId },
      selectedUserId
    ).then(d => setHistory(d.data?.checklistsByLaptop || []))
  }, [selectedLaptopId])

  async function indienen() {
    if (!canSubmit) return
    setSubmitting(true)
    const vars: Record<string, unknown> = {
      laptopId: selectedLaptopId,
      toetsenbord_ok: form.toetsenbord_ok,
      camera_ok: form.camera_ok,
      microfoon_ok: form.microfoon_ok,
    }
    if (form.schijf_type) vars.schijf_type = form.schijf_type
    if (form.schijf_grootte) vars.schijf_grootte = form.schijf_grootte
    if (form.schijf_sneller) vars.schijf_sneller = form.schijf_sneller
    if (form.ram_totaal) vars.ram_totaal = form.ram_totaal
    if (form.ram_gebruikt) vars.ram_gebruikt = form.ram_gebruikt
    if (form.opslag_vrij) vars.opslag_vrij = form.opslag_vrij
    if (form.opstartprogrammas) vars.opstartprogrammas = form.opstartprogrammas
    if (form.energie_ingesteld !== null) vars.energie_ingesteld = form.energie_ingesteld
    if (form.wifi_signaal) vars.wifi_signaal = parseInt(form.wifi_signaal)
    if (form.ping_ms) vars.ping_ms = parseInt(form.ping_ms)

    const data = await gql(
      `mutation(
        $laptopId: ID!, $toetsenbord_ok: Boolean!, $camera_ok: Boolean!, $microfoon_ok: Boolean!,
        $schijf_type: String, $schijf_grootte: String, $schijf_sneller: String,
        $ram_totaal: String, $ram_gebruikt: String, $opslag_vrij: String,
        $opstartprogrammas: String, $energie_ingesteld: Boolean,
        $wifi_signaal: Int, $ping_ms: Int
      ) {
        submitChecklist(
          laptopId: $laptopId, toetsenbord_ok: $toetsenbord_ok, camera_ok: $camera_ok, microfoon_ok: $microfoon_ok,
          schijf_type: $schijf_type, schijf_grootte: $schijf_grootte, schijf_sneller: $schijf_sneller,
          ram_totaal: $ram_totaal, ram_gebruikt: $ram_gebruikt, opslag_vrij: $opslag_vrij,
          opstartprogrammas: $opstartprogrammas, energie_ingesteld: $energie_ingesteld,
          wifi_signaal: $wifi_signaal, ping_ms: $ping_ms
        ) { id passed laptop { merk_type status } }
      }`,
      vars,
      selectedUserId
    )
    setSubmitting(false)
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      const { passed, laptop } = data.data.submitChecklist
      toast(
        passed
          ? `Checklist geslaagd. ${laptop.merk_type} is weer beschikbaar.`
          : `Checklist niet geslaagd. ${laptop.merk_type} → DEFECT.`,
        passed ? 'ok' : 'error'
      )
      setSelectedLaptopId('')
      setForm(emptyForm())
      gql('{ laptopsByStatus(status: IN_CONTROL) { id merk_type status specificaties } }', undefined, selectedUserId)
        .then(d => setInControlLaptops(d.data?.laptopsByStatus || []))
    }
  }

  return (
    <Layout title={t('ctrl_title')} subtitle={t('ctrl_sub')}>

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">✓</div>
          <p className="empty-text">{t('select_user')}</p>
        </div>
      )}

      {selectedUserId && selectedUser?.role !== 'HELPDESK' && (
        <div className="alert alert-error">{t('ctrl_no_access')}</div>
      )}

      {selectedUserId && selectedUser?.role === 'HELPDESK' && (
        <>
          <div style={{ marginBottom: 28 }}>
            <label className="label">Laptop selecteren (in controle)</label>
            {inControlLaptops.length === 0 ? (
              <div className="empty" style={{ padding: '32px 0' }}>
                <div className="empty-icon">✓</div>
                <p className="empty-text">Geen laptops in controlestatus.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {inControlLaptops.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLaptopId(l.id)}
                    style={{
                      textAlign: 'left', padding: '12px 16px',
                      borderRadius: 'var(--radius)',
                      border: selectedLaptopId === l.id ? '1px solid var(--black)' : '1px solid var(--border)',
                      background: selectedLaptopId === l.id ? 'var(--black)' : 'var(--white)',
                      color: selectedLaptopId === l.id ? 'var(--white)' : 'var(--black)',
                      cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)',
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
            <div className="card card-form" style={{ marginBottom: 32 }}>
              <h2 style={{ marginBottom: 24, fontSize: 16 }}>Controlelijst</h2>

              {/* Deel 1 – Hardware */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                {t('ctrl_p1')}
              </p>

              <Step number={1} title={t('ctrl_s1')}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label={t('ctrl_disk_type')}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['SSD', 'HDD'].map(t => (
                        <button key={t} type="button"
                          className={`btn ${form.schijf_type === t ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: 12, padding: '5px 16px' }}
                          onClick={() => set('schijf_type', t)}
                        >{t}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label={t('ctrl_disk_size')}>
                    <input className="input" placeholder="bijv. 256 GB" value={form.schijf_grootte} onChange={e => set('schijf_grootte', e.target.value)} />
                  </Field>
                </div>
                <Field label={t('ctrl_disk_faster')}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['SSD', 'HDD'].map(t => (
                      <button key={t} type="button"
                        className={`btn ${form.schijf_sneller === t ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: 12, padding: '5px 16px' }}
                        onClick={() => set('schijf_sneller', t)}
                      >{t}</button>
                    ))}
                  </div>
                </Field>
              </Step>

              <Step number={2} title={t('ctrl_s2')}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label={t('ctrl_ram_total')}>
                    <input className="input" placeholder="bijv. 8 GB" value={form.ram_totaal} onChange={e => set('ram_totaal', e.target.value)} />
                  </Field>
                  <Field label={t('ctrl_ram_used')}>
                    <input className="input" placeholder="bijv. 3,2 GB" value={form.ram_gebruikt} onChange={e => set('ram_gebruikt', e.target.value)} />
                  </Field>
                </div>
              </Step>

              <Step number={3} title={t('ctrl_s3')}>
                <Field label={t('ctrl_storage')}>
                  <input className="input" placeholder="bijv. 120 GB" value={form.opslag_vrij} onChange={e => set('opslag_vrij', e.target.value)} />
                </Field>
              </Step>

              {/* Deel 2 – Optimaliseren */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 8 }}>
                {t('ctrl_p2')}
              </p>

              <Step number={4} title={t('ctrl_s4')}>
                <Field label={t('ctrl_startup')}>
                  <textarea
                    className="input"
                    placeholder="bijv. Spotify, OneDrive, Teams..."
                    value={form.opstartprogrammas}
                    onChange={e => set('opstartprogrammas', e.target.value)}
                    style={{ minHeight: 60, resize: 'vertical' }}
                  />
                </Field>
              </Step>

              <Step number={5} title={t('ctrl_s5')}>
                <Field label={t('ctrl_energy')}>
                  <YesNo value={form.energie_ingesteld} onChange={v => set('energie_ingesteld', v)} />
                </Field>
              </Step>

              {/* Deel 3 – Wi-Fi */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 8 }}>
                {t('ctrl_p3')}
              </p>

              <Step number={6} title={t('ctrl_s6')}>
                <Field label={`${t('ctrl_wifi_signal')} — netsh wlan show interfaces`}>
                  <input type="number" className="input" placeholder="bijv. 85" value={form.wifi_signaal}
                    onChange={e => set('wifi_signaal', e.target.value)} min="0" max="100"
                    style={{ width: 120 }} />
                </Field>
              </Step>

              <Step number={7} title={t('ctrl_s7')}>
                <Field label={`${t('ctrl_ping')} — ping google.com`}>
                  <input type="number" className="input" placeholder="bijv. 14" value={form.ping_ms}
                    onChange={e => set('ping_ms', e.target.value)} min="0"
                    style={{ width: 120 }} />
                </Field>
              </Step>

              {/* Deel 4 – Testen */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 8 }}>
                {t('ctrl_p4')}
              </p>

              <Step number={8} title={t('ctrl_s8')}>
                <Field label={`${t('ctrl_keyboard')} *`}>
                  <YesNo value={form.toetsenbord_ok} onChange={v => set('toetsenbord_ok', v)} />
                </Field>
              </Step>

              <Step number={9} title={t('ctrl_s9')}>
                <Field label={`${t('ctrl_camera')} *`}>
                  <YesNo value={form.camera_ok} onChange={v => set('camera_ok', v)} />
                </Field>
              </Step>

              <Step number={10} title={t('ctrl_s10')}>
                <Field label={`${t('ctrl_mic')} *`}>
                  <YesNo value={form.microfoon_ok} onChange={v => set('microfoon_ok', v)} />
                </Field>
              </Step>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20, marginTop: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <button
                  className={`btn ${canSubmit && form.toetsenbord_ok && form.camera_ok && form.microfoon_ok ? 'btn-primary' : canSubmit ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={indienen}
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? t('saving') : canSubmit
                    ? (form.toetsenbord_ok && form.camera_ok && form.microfoon_ok ? t('ctrl_submit_ok') : t('ctrl_submit_issues'))
                    : t('ctrl_fill')}
                </button>
                {!canSubmit && (
                  <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                    Stap 8, 9 en 10 zijn verplicht
                  </span>
                )}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <p className="section-label">{t('ctrl_history')}</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {history.map(r => (
                  <div key={r.id} className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                        {new Date(r.createdAt).toLocaleDateString('nl-NL')} — {r.submittedBy.name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--grey)', margin: '3px 0 0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {r.toetsenbord_ok !== null && <span><Check ok={r.toetsenbord_ok} /> Toetsenbord</span>}
                        {r.camera_ok !== null && <span><Check ok={r.camera_ok} /> Camera</span>}
                        {r.microfoon_ok !== null && <span><Check ok={r.microfoon_ok} /> Microfoon</span>}
                        {r.schijf_type && <span>Schijf: {r.schijf_type}</span>}
                        {r.ram_totaal && <span>RAM: {r.ram_totaal}</span>}
                        {r.wifi_signaal != null && <span>Wi-Fi: {r.wifi_signaal}%</span>}
                        {r.ping_ms != null && <span>Ping: {r.ping_ms}ms</span>}
                      </p>
                    </div>
                    <span className={`badge ${r.passed ? 'badge-approved' : 'badge-defect'}`} style={{ fontSize: 11, flexShrink: 0 }}>
                      {r.passed ? t('ctrl_passed') : t('ctrl_failed')}
                    </span>
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
