import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '../context/UserContext'

const roleLabel: Record<string, string> = {
  ADMIN: 'Beheerder',
  OWNER: 'Eigenaar',
  HELPDESK: 'Helpdesk',
}

const navByRole: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: '/', label: 'Overzicht' },
    { href: '/reserveringen', label: 'Reserveringen' },
    { href: '/beheer', label: 'Beheer' },
    { href: '/software', label: 'Software' },
    { href: '/ai', label: 'AI assistent' },
  ],
  OWNER: [
    { href: '/aanvragen', label: 'Aanvragen' },
    { href: '/software', label: 'Software' },
    { href: '/ai', label: 'AI assistent' },
  ],
  HELPDESK: [
    { href: '/', label: 'Overzicht' },
    { href: '/storingen', label: 'Storingen' },
    { href: '/controle', label: 'Controle' },
    { href: '/ai', label: 'AI assistent' },
  ],
}

interface LayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const { users, selectedUserId, setSelectedUserId, selectedUser, theme, toggleTheme } = useUser()
  const router = useRouter()

  const navItems = selectedUser ? (navByRole[selectedUser.role] || []) : []
  const isDark = theme === 'dark'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--white)',
      fontFamily: 'var(--font)',
      position: 'relative',
    }}>

      {/* Ghost navbar — separated by shadow depth, not a line */}
      <nav style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        background: 'var(--white)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.35)'
          : '0 1px 0 rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.04)',
      }}>
        <span style={{
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.12em',
          color: 'var(--black)',
          textTransform: 'uppercase',
        }}>
          Asha
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Schakel naar licht' : 'Schakel naar donker'}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: 0,
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{
              display: 'block',
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: isDark ? 'var(--black)' : 'transparent',
              border: '1.5px solid var(--grey)',
              transition: 'all 0.2s',
            }} />
          </button>

          {/* User selector */}
          <select
            className="input"
            style={{
              width: 200,
              padding: '5px 28px 5px 10px',
              fontSize: 12,
              height: 32,
              letterSpacing: '0.01em',
              border: '1px solid var(--border)',
              borderRadius: 20,
              background: 'var(--white)',
            }}
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
          >
            <option value="">— Selecteer gebruiker —</option>
            <optgroup label="Beheerder">
              {users.filter(u => u.role === 'ADMIN').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </optgroup>
            <optgroup label="Eigenaar activiteit">
              {users.filter(u => u.role === 'OWNER').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </optgroup>
            <optgroup label="Helpdesk">
              {users.filter(u => u.role === 'HELPDESK').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </nav>

      {/* Page body */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Sidebar — no borders, just space and organic decoration */}
        <aside style={{
          width: 210,
          padding: '52px 0 0 38px',
          flexShrink: 0,
          background: 'var(--white)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {selectedUser ? (
            <>
              <div style={{ marginBottom: 36 }}>
                <p className="section-label">{roleLabel[selectedUser.role] || selectedUser.role}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)', margin: 0, letterSpacing: '-0.01em' }}>
                  {selectedUser.name}
                </p>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {navItems.map(item => {
                  const isActive = router.pathname === item.href
                  return (
                    <Link key={item.href} href={item.href} style={{
                      display: 'block',
                      padding: '8px 0',
                      fontSize: 13,
                      color: isActive ? 'var(--black)' : 'var(--grey)',
                      fontWeight: isActive ? 600 : 400,
                      textDecoration: 'none',
                      transition: 'color 0.15s, letter-spacing 0.15s',
                      letterSpacing: isActive ? '-0.02em' : '0',
                    }}>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </>
          ) : null}

          {/* Organic floral decoration — bottom of sidebar */}
          <img
            aria-hidden
            src="/imgs/metro_60.png"
            alt=""
            style={{
              position: 'absolute',
              bottom: -20,
              left: -10,
              width: 140,
              opacity: isDark ? 0.04 : 0.07,
              filter: isDark ? 'invert(1)' : 'none',
              pointerEvents: 'none',
              userSelect: 'none',
              transform: 'rotate(-15deg)',
            }}
          />
        </aside>

        {/* Main content */}
        <main style={{
          flex: 1,
          padding: '52px 64px 120px',
          minWidth: 0,
          maxWidth: 880,
          position: 'relative',
        }}>
          {(title || subtitle) && (
            <div className="page-header">
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* metro_51 — large organic watermark bottom-right, replaces text anchor */}
      <img
        aria-hidden
        src="/imgs/metro_51.png"
        alt=""
        style={{
          position: 'fixed',
          bottom: -60,
          right: -60,
          width: 420,
          opacity: isDark ? 0.04 : 0.055,
          filter: isDark ? 'invert(1)' : 'none',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      />
    </div>
  )
}
