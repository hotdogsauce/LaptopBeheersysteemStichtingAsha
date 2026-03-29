import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../context/UserContext'

export default function Login() {
  const { loginWithCredentials, loggedIn, theme, toggleTheme } = useUser()
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isDark = theme === 'dark'

  useEffect(() => {
    if (loggedIn) router.replace('/')
  }, [loggedIn])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await loginWithCredentials(login.trim(), password)
    setLoading(false)
    if (err) setError(err)
    else router.replace('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--white)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font)',
      padding: 24,
    }}>
      {/* Compass watermark */}
      <svg aria-hidden viewBox="0 0 120 120" fill="none"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 360, opacity: isDark ? 0.016 : 0.02,
          pointerEvents: 'none', userSelect: 'none', zIndex: 0,
          color: isDark ? '#fff' : '#000',
        }}>
        <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="3" />
        <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="60" cy="60" r="3.5" fill="currentColor" />
        <polygon points="60,8 54,60 66,60" fill="currentColor" />
        <polygon points="60,112 54,60 66,60" stroke="currentColor" strokeWidth="2" fill="none" />
        <polygon points="112,60 60,54 60,66" stroke="currentColor" strokeWidth="2" fill="none" />
        <polygon points="8,60 60,54 60,66" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="21.5" y1="21.5" x2="27.5" y2="27.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="98.5" y1="21.5" x2="92.5" y2="27.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="21.5" y1="98.5" x2="27.5" y2="92.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="98.5" y1="98.5" x2="92.5" y2="92.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div style={{ width: '100%', maxWidth: 340, position: 'relative', zIndex: 1 }}>
        {/* Logo / wordmark */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey)', margin: 0 }}>
            Stichting Asha
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: '4px 0 0' }}>
            Laptopbeheer
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label className="label">Gebruikersnaam of e-mailadres</label>
            <input
              className="input"
              type="text"
              autoComplete="username"
              value={login}
              onChange={e => setLogin(e.target.value)}
              placeholder="gebruikersnaam"
              required
            />
          </div>
          <div>
            <label className="label">Wachtwoord</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? 'Bezig…' : 'Inloggen'}
          </button>
        </form>

        {/* Theme toggle bottom */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={toggleTheme}
            title={isDark ? 'Schakel naar licht' : 'Schakel naar donker'}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <span style={{
              display: 'block', width: 9, height: 9, borderRadius: '50%',
              background: isDark ? 'var(--black)' : 'transparent',
              border: '1.5px solid var(--grey)',
            }} />
          </button>
        </div>
      </div>
    </div>
  )
}
