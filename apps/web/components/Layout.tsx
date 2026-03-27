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
  ],
  OWNER: [
    { href: '/aanvragen', label: 'Aanvragen' },
    { href: '/software', label: 'Software' },
  ],
  HELPDESK: [
    { href: '/', label: 'Overzicht' },
    { href: '/storingen', label: 'Storingen' },
    { href: '/controle', label: 'Controle' },
  ],
}

interface LayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const { users, selectedUserId, setSelectedUserId, selectedUser } = useUser()
  const router = useRouter()

  const navItems = selectedUser ? (navByRole[selectedUser.role] || []) : []

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--white)', fontFamily: 'var(--font)' }}>

      {/* Ghost navbar */}
      <nav style={{
        height: 52,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        background: 'var(--white)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.06em', color: 'var(--black)' }}>
          ASHA
        </span>

        <select
          className="input"
          style={{ width: 210, padding: '5px 32px 5px 10px', fontSize: 13, height: 34 }}
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
      </nav>

      {/* Page body */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Whisper sidebar */}
        <aside style={{
          width: 188,
          borderRight: '1px solid var(--border-subtle)',
          padding: '32px 0',
          flexShrink: 0,
          background: 'var(--white)',
        }}>
          {selectedUser ? (
            <>
              <div style={{ padding: '0 20px', marginBottom: 24 }}>
                <p className="section-label">{roleLabel[selectedUser.role] || selectedUser.role}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)', margin: 0 }}>{selectedUser.name}</p>
              </div>
              <nav>
                {navItems.map(item => {
                  const isActive = router.pathname === item.href
                  return (
                    <Link key={item.href} href={item.href} style={{
                      display: 'block',
                      padding: '8px 20px',
                      fontSize: 13,
                      color: isActive ? 'var(--black)' : 'var(--grey)',
                      fontWeight: isActive ? 600 : 400,
                      borderRight: isActive ? '2px solid var(--black)' : '2px solid transparent',
                      textDecoration: 'none',
                      transition: 'color 0.12s',
                    }}>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </>
          ) : (
            <div style={{ padding: '0 20px' }}>
              <p className="section-label">Geen gebruiker</p>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '40px 48px', minWidth: 0 }}>
          {(title || subtitle) && (
            <div className="page-header">
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Anchor watermark */}
      <div aria-hidden style={{
        position: 'fixed',
        bottom: 24,
        right: 28,
        fontSize: 24,
        color: '#E4E4E4',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        lineHeight: 1,
      }}>
        ⚓
      </div>
    </div>
  )
}
