import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser, gql } from '../context/UserContext'

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

interface SidebarItem {
  id: string
  label: string
  sublabel: string
  href: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

interface LayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const { users, selectedUserId, setSelectedUserId, selectedUser, theme, toggleTheme } = useUser()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([])
  const [sidebarTitle, setSidebarTitle] = useState('')

  const navItems = selectedUser ? (navByRole[selectedUser.role] || []) : []
  const isDark = theme === 'dark'

  // Close drawer on route change
  useEffect(() => { setMenuOpen(false) }, [router.pathname])

  // Fetch quick-info widget data per role
  useEffect(() => {
    if (!selectedUser) { setSidebarItems([]); setSidebarTitle(''); return }

    if (selectedUser.role === 'ADMIN') {
      setSidebarTitle('Wachten op keuring')
      gql('{ pendingReservations { id startDate activity { title } requester { name } } }', undefined, selectedUser.id)
        .then(d => {
          const items = (d.data?.pendingReservations || []).slice(0, 4).map((r: any) => ({
            id: r.id,
            label: r.activity?.title || 'Activiteit',
            sublabel: (r.requester?.name || '') + ' · ' + formatDate(r.startDate),
            href: '/reserveringen',
          }))
          setSidebarItems(items)
        })
        .catch(() => {})
    } else if (selectedUser.role === 'HELPDESK') {
      setSidebarTitle('Open storingen')
      gql('{ openIssues { id description laptop { merk_type } } }', undefined, selectedUser.id)
        .then(d => {
          const items = (d.data?.openIssues || []).slice(0, 4).map((issue: any) => ({
            id: issue.id,
            label: issue.laptop?.merk_type || 'Laptop',
            sublabel: (issue.description || '').slice(0, 38) + ((issue.description || '').length > 38 ? '…' : ''),
            href: '/storingen',
          }))
          setSidebarItems(items)
        })
        .catch(() => {})
    } else if (selectedUser.role === 'OWNER') {
      setSidebarTitle('Aankomend')
      gql(`{ myReservations(userId: "${selectedUser.id}") { id startDate status activity { title } } }`, undefined, selectedUser.id)
        .then(d => {
          const now = new Date()
          const items = (d.data?.myReservations || [])
            .filter((r: any) => ['APPROVED', 'REQUESTED'].includes(r.status) && new Date(r.startDate) > now)
            .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 4)
            .map((r: any) => ({
              id: r.id,
              label: r.activity?.title || 'Activiteit',
              sublabel: formatDate(r.startDate) + ' · ' + (r.status === 'APPROVED' ? 'Goedgekeurd' : 'In afwachting'),
              href: '/aanvragen',
            }))
          setSidebarItems(items)
        })
        .catch(() => {})
    }
  }, [selectedUser?.id, selectedUser?.role])

  const sidebarInner = (
    <>
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

          {/* Quick-info widget */}
          {sidebarItems.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <p className="section-label" style={{ marginBottom: 10 }}>{sidebarTitle}</p>
              {sidebarItems.map(item => (
                <Link key={item.id} href={item.href} style={{
                  display: 'block',
                  padding: '7px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--grey)', margin: '2px 0 0', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.sublabel}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {sidebarItems.length === 0 && sidebarTitle && (
            <div style={{ marginTop: 40 }}>
              <p className="section-label" style={{ marginBottom: 10 }}>{sidebarTitle}</p>
              <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>Niets op dit moment.</p>
            </div>
          )}
        </>
      ) : null}

      {/* Organic floral decoration */}
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
    </>
  )

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--white)',
      fontFamily: 'var(--font)',
      position: 'relative',
    }}>

      {/* Navbar */}
      <nav style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        background: 'var(--white)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.35)'
          : '0 1px 0 rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.04)',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Hamburger — shown on mobile via CSS */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Sluit menu' : 'Open menu'}
          >
            <span className={`ham-line${menuOpen ? ' open-top' : ''}`} />
            <span className={`ham-line${menuOpen ? ' open-mid' : ''}`} />
            <span className={`ham-line${menuOpen ? ' open-bot' : ''}`} />
            {sidebarItems.length > 0 && !menuOpen && (
              <span style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--red)',
              }} />
            )}
          </button>

          <span style={{
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.12em',
            color: 'var(--black)',
            textTransform: 'uppercase',
          }}>
            Asha
          </span>
        </div>

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
            className="input user-select"
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

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.25)',
            zIndex: 25,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Page body */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Sidebar */}
        <aside className={`layout-sidebar${menuOpen ? ' sidebar-open' : ''}`}>
          {sidebarInner}
        </aside>

        {/* Main content */}
        <main className="layout-main">
          {(title || subtitle) && (
            <div className="page-header">
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Watermark */}
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
