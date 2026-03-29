import { useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'

const roleLabel: Record<string, string> = {
  ADMIN: 'Beheerder', OWNER: 'Eigenaar', HELPDESK: 'Helpdesk',
}

type Section = 'settings' | 'manual' | null

export default function Account() {
  const { loggedInUser, logout } = useUser()
  const { toast } = useToast()
  const [section, setSection] = useState<Section>(null)

  // Settings state
  const [huidig, setHuidig] = useState('')
  const [nieuw, setNieuw] = useState('')
  const [bevestig, setBevestig] = useState('')
  const [saving, setSaving] = useState(false)

  // Manual: which platform is expanded
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null)

  async function wijzigWachtwoord() {
    if (!huidig || !nieuw || !bevestig) { toast('Vul alle velden in.', 'error'); return }
    if (nieuw !== bevestig) { toast('Nieuwe wachtwoorden komen niet overeen.', 'error'); return }
    if (nieuw.length < 6) { toast('Nieuw wachtwoord moet minimaal 6 tekens zijn.', 'error'); return }
    setSaving(true)
    const data = await gql(
      `mutation($login: String!, $password: String!) {
        login(login: $login, password: $password) { userId }
      }`,
      { login: loggedInUser!.username, password: huidig }
    )
    if (data.errors || !data.data?.login) {
      setSaving(false); toast('Huidig wachtwoord is onjuist.', 'error'); return
    }
    // Update password via createUser-like flow — use a dedicated mutation if available,
    // otherwise call the changePassword mutation (we'll add it inline here via the API)
    const upd = await gql(
      `mutation($login: String!, $newPassword: String!, $currentPassword: String!) {
        changePassword(login: $login, newPassword: $newPassword, currentPassword: $currentPassword)
      }`,
      { login: loggedInUser!.username, newPassword: nieuw, currentPassword: huidig }
    )
    setSaving(false)
    if (upd.errors) { toast(upd.errors[0].message, 'error'); return }
    toast('Wachtwoord gewijzigd.')
    setHuidig(''); setNieuw(''); setBevestig('')
  }

  if (!loggedInUser) return null

  return (
    <Layout title="Mijn account">
      {/* Profile card */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-soft)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20, flexShrink: 0,
        }}>
          {loggedInUser.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{loggedInUser.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--grey)' }}>
            @{loggedInUser.username} · {roleLabel[loggedInUser.role] || loggedInUser.role}
          </p>
        </div>
      </div>

      {/* Menu buttons */}
      <div style={{ display: 'grid', gap: 8, marginBottom: 32 }}>
        <button
          onClick={() => setSection(section === 'settings' ? null : 'settings')}
          className="card-row"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', background: 'none', border: 'none', width: '100%',
            textAlign: 'left', fontFamily: 'var(--font)', padding: '14px 2px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>Instellingen</span>
          <span style={{ fontSize: 12, color: 'var(--grey)', transform: section === 'settings' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>

        <button
          onClick={() => setSection(section === 'manual' ? null : 'manual')}
          className="card-row"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', background: 'none', border: 'none', width: '100%',
            textAlign: 'left', fontFamily: 'var(--font)', padding: '14px 2px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>Handleiding & app installeren</span>
          <span style={{ fontSize: 12, color: 'var(--grey)', transform: section === 'manual' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
      </div>

      {/* ── Instellingen ── */}
      {section === 'settings' && (
        <div className="card" style={{ marginBottom: 32, display: 'grid', gap: 16 }}>
          <h2 style={{ marginBottom: 4 }}>Wachtwoord wijzigen</h2>
          <div>
            <label className="label">Huidig wachtwoord</label>
            <input type="password" className="input" value={huidig} onChange={e => setHuidig(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="label">Nieuw wachtwoord</label>
            <input type="password" className="input" value={nieuw} onChange={e => setNieuw(e.target.value)} placeholder="Minimaal 6 tekens" />
          </div>
          <div>
            <label className="label">Bevestig nieuw wachtwoord</label>
            <input type="password" className="input" value={bevestig} onChange={e => setBevestig(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" disabled={saving} onClick={wijzigWachtwoord} style={{ width: 'fit-content' }}>
            {saving ? 'Opslaan…' : 'Wachtwoord wijzigen'}
          </button>
        </div>
      )}

      {/* ── Handleiding ── */}
      {section === 'manual' && (
        <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>

          {/* App toevoegen aan beginscherm */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: 'var(--black)' }}>
              App toevoegen aan beginscherm
            </p>
            <p style={{ fontSize: 13, color: 'var(--grey)', margin: '0 0 16px' }}>
              Installeer Laptopbeheer als app op je telefoon — geen app store nodig.
            </p>

            <div style={{ display: 'grid', gap: 8 }}>
              {/* Android */}
              <button
                onClick={() => setPlatform(platform === 'android' ? null : 'android')}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-soft)', cursor: 'pointer', fontFamily: 'var(--font)', width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🤖</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>Android</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--grey)', transform: platform === 'android' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
              </button>

              {platform === 'android' && (
                <div style={{ padding: '16px 20px', background: 'var(--bg-soft)', borderRadius: 8, display: 'grid', gap: 10 }}>
                  {[
                    'Open de site in Chrome op je Android telefoon.',
                    'Tik op de drie puntjes (⋮) rechtsboven.',
                    'Kies "Toevoegen aan startscherm".',
                    'Tik op "Installeren" of "Toevoegen".',
                    'De app verschijnt nu op je beginscherm.',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', background: 'var(--black)', color: 'var(--white)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
                      }}>{i + 1}</span>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--black)', lineHeight: 1.5 }}>{step}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* iOS */}
              <button
                onClick={() => setPlatform(platform === 'ios' ? null : 'ios')}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-soft)', cursor: 'pointer', fontFamily: 'var(--font)', width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🍎</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>iPhone / iPad (iOS)</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--grey)', transform: platform === 'ios' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
              </button>

              {platform === 'ios' && (
                <div style={{ padding: '16px 20px', background: 'var(--bg-soft)', borderRadius: 8, display: 'grid', gap: 10 }}>
                  {[
                    'Open de site in Safari op je iPhone of iPad.',
                    'Tik op het deel-icoon (□↑) onderaan het scherm.',
                    'Scroll naar beneden en tik op "Zet op beginscherm".',
                    'Pas eventueel de naam aan en tik op "Voeg toe".',
                    'De app verschijnt nu op je beginscherm.',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', background: 'var(--black)', color: 'var(--white)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
                      }}>{i + 1}</span>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--black)', lineHeight: 1.5 }}>{step}</p>
                    </div>
                  ))}
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--grey)' }}>
                    Let op: gebruik Safari. Chrome op iOS ondersteunt dit niet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
