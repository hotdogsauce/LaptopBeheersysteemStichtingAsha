import { useState, useRef } from 'react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import { useT } from '../context/LanguageContext'

type Section = 'naam' | 'settings' | 'manual' | null

function resizeToSquare(file: File, size = 80): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')!
        const s = Math.min(img.width, img.height)
        const sx = (img.width - s) / 2
        const sy = (img.height - s) / 2
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function Account() {
  const { loggedInUser, users } = useUser()
  const { toast } = useToast()
  const { t } = useT()
  const roleLabel: Record<string, string> = { ADMIN: t('role_admin'), OWNER: t('role_owner'), HELPDESK: t('role_helpdesk') }
  const [section, setSection] = useState<Section>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Avatar
  const myUser = users.find(u => u.id === loggedInUser?.userId)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Kies een afbeeldingsbestand.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { toast('Bestand mag maximaal 5 MB zijn.', 'error'); return }
    setUploadingAvatar(true)
    const avatar = await resizeToSquare(file)
    const data = await gql(
      `mutation($userId: ID!, $avatar: String!) { uploadAvatar(userId: $userId, avatar: $avatar) { id avatar } }`,
      { userId: loggedInUser!.userId, avatar },
      loggedInUser!.userId
    )
    setUploadingAvatar(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Profielfoto bijgewerkt.')
    e.target.value = ''
  }

  // Name change
  const [nieuweNaam, setNieuweNaam] = useState('')
  const [savingNaam, setSavingNaam] = useState(false)

  async function wijzigNaam() {
    if (!nieuweNaam.trim()) { toast('Vul een naam in.', 'error'); return }
    if (nieuweNaam.trim() === loggedInUser!.name) { toast('Naam is gelijk aan de huidige naam.', 'error'); return }
    setSavingNaam(true)
    const data = await gql(
      `mutation($userId: ID!, $name: String) { updateUser(userId: $userId, name: $name) { id name } }`,
      { userId: loggedInUser!.userId, name: nieuweNaam.trim() },
      loggedInUser!.userId
    )
    setSavingNaam(false)
    if (data.errors) { toast(data.errors[0].message, 'error'); return }
    toast('Naam gewijzigd.')
    // Update stored session so the header reflects the new name
    const updated = { ...loggedInUser!, name: data.data.updateUser.name }
    localStorage.setItem('asha-session', JSON.stringify(updated))
    setNieuweNaam('')
  }

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
    <Layout title={t('acc_title')}>
      {/* Profile card */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={loggedInUser.name} avatar={myUser?.avatar} size={52} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            title="Profielfoto wijzigen"
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--black)', color: 'var(--white)',
              border: '2px solid var(--bg)', cursor: 'pointer',
              fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {uploadingAvatar ? '…' : '+'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
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
          onClick={() => setSection(section === 'naam' ? null : 'naam')}
          className="card-row"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', background: 'none', border: 'none', width: '100%',
            textAlign: 'left', fontFamily: 'var(--font)', padding: '14px 2px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>Naam wijzigen</span>
          <span style={{ fontSize: 12, color: 'var(--grey)', transform: section === 'naam' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>

        <button
          onClick={() => setSection(section === 'settings' ? null : 'settings')}
          className="card-row"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', background: 'none', border: 'none', width: '100%',
            textAlign: 'left', fontFamily: 'var(--font)', padding: '14px 2px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>{t('acc_change_pw')}</span>
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
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>{t('acc_guide')}</span>
          <span style={{ fontSize: 12, color: 'var(--grey)', transform: section === 'manual' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
      </div>

      {/* ── Naam wijzigen ── */}
      {section === 'naam' && (
        <div className="card section-enter" style={{ marginBottom: 32, display: 'grid', gap: 16 }}>
          <div>
            <label className="label">Nieuwe naam</label>
            <input className="input" placeholder={loggedInUser.name} value={nieuweNaam} onChange={e => setNieuweNaam(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: 'fit-content' }} disabled={savingNaam} onClick={wijzigNaam}>
            {savingNaam ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      )}

      {/* ── Wachtwoord veranderen ── */}
      {section === 'settings' && (
        <div className="card section-enter" style={{ marginBottom: 32, display: 'grid', gap: 16 }}>
          <h2 style={{ marginBottom: 4 }}>{t('acc_save_pw')}</h2>
          <div>
            <label className="label">{t('acc_curr_pw')}</label>
            <input type="password" className="input" value={huidig} onChange={e => setHuidig(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="label">{t('acc_new_pw')}</label>
            <input type="password" className="input" value={nieuw} onChange={e => setNieuw(e.target.value)} placeholder={t('acc_min')} />
          </div>
          <div>
            <label className="label">{t('acc_confirm_pw')}</label>
            <input type="password" className="input" value={bevestig} onChange={e => setBevestig(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" disabled={saving} onClick={wijzigWachtwoord} style={{ width: 'fit-content' }}>
            {saving ? t('saving') : t('acc_save_pw')}
          </button>
        </div>
      )}

      {/* ── Handleiding ── */}
      {section === 'manual' && (
        <div className="section-enter" style={{ display: 'grid', gap: 12, marginBottom: 32 }}>

          {/* App toevoegen aan beginscherm */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: 'var(--black)' }}>
              {t('acc_install_title')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--grey)', margin: '0 0 16px' }}>
              {t('acc_install_desc')}
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
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{t('acc_android')}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--grey)', transform: platform === 'android' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
              </button>

              {platform === 'android' && (
                <div className="section-enter" style={{ padding: '16px 20px', background: 'var(--bg-soft)', borderRadius: 8, display: 'grid', gap: 10 }}>
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
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{t('acc_ios')}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--grey)', transform: platform === 'ios' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
              </button>

              {platform === 'ios' && (
                <div className="section-enter" style={{ padding: '16px 20px', background: 'var(--bg-soft)', borderRadius: 8, display: 'grid', gap: 10 }}>
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
                    {t('acc_ios_note')}
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
