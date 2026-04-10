import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../context/UserContext'
import CompassBg from '../components/CompassBg'

export default function Login() {
  const { loginWithCredentials, loggedIn, theme, toggleTheme } = useUser()
  const router = useRouter()
  const [login,    setLogin]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font)',
      padding: 24,
      position: 'relative',
    }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(34,197,94,0.7); }
          50%       { opacity: 0.5; box-shadow: 0 0 12px rgba(34,197,94,0.3); }
        }
      `}</style>

      {/* Compass watermark */}
      <CompassBg position="center" size={360} dark={isDark} />

      {/* Bottom corner attribution */}
      <p style={{
        position: 'fixed', bottom: 16, right: 20,
        fontSize: 10, color: 'var(--grey)', margin: 0,
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        Stichting Asha
      </p>

      {/* Login card */}
      <div style={{ width: '100%', maxWidth: 340, position: 'relative', zIndex: 1 }}>
        {/* Logo / wordmark */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          {/* Status dot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px rgba(34,197,94,0.7)',
              display: 'inline-block',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
          </div>

          {/* Wordmark */}
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>Asha</span>
            <span style={{ alignSelf: 'flex-end', marginBottom: 6, lineHeight: 1 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>O</span><span style={{ fontSize: 13, fontWeight: 600 }}>s</span>
            </span>
          </h1>

          <p style={{ fontSize: 10, color: 'var(--grey)', margin: '6px 0 0', letterSpacing: '0.08em' }}>v3.6.9</p>
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

        {/* Theme toggle */}
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
