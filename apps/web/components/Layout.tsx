import { ReactNode, useState, useEffect, useRef } from 'react'
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

const statusLabel: Record<string, string> = {
  AVAILABLE: 'Beschikbaar', RESERVED: 'Gereserveerd', IN_USE: 'In gebruik',
  IN_CONTROL: 'In controle', DEFECT: 'Defect', OUT_OF_SERVICE: 'Buiten gebruik', MISSING: 'Vermist',
}

const statusBadge: Record<string, string> = {
  AVAILABLE: 'badge-available', RESERVED: 'badge-reserved', IN_USE: 'badge-in-use',
  IN_CONTROL: 'badge-in-control', DEFECT: 'badge-defect', OUT_OF_SERVICE: 'badge-oos', MISSING: 'badge-missing',
}

interface SidebarItem {
  id: string
  label: string
  sublabel: string
  href: string
}

interface LaptopResult {
  id: string
  merk_type: string
  status: string
  specificaties: string
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
  const { selectedUser, theme, toggleTheme, loggedInUser, logout } = useUser()
  const router = useRouter()

  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([])
  const [sidebarTitle, setSidebarTitle] = useState('')
  const [widgetLoading, setWidgetLoading] = useState(false)
  const [navBadge, setNavBadge] = useState<{ href: string; count: number } | null>(null)

  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allLaptops, setAllLaptops] = useState<LaptopResult[]>([])
  const [laptopsLoaded, setLaptopsLoaded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const navItems = selectedUser ? (navByRole[selectedUser.role] || []) : []
  const isDark = theme === 'dark'

  // Search results (client-side filter)
  const searchResults = searchQuery.trim().length >= 2
    ? allLaptops.filter(l =>
        l.merk_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.specificaties || '').toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : []

  // Close drawer on route change
  useEffect(() => { setMenuOpen(false) }, [router.pathname])

  // Reset laptop cache on user change
  useEffect(() => {
    setLaptopsLoaded(false)
    setAllLaptops([])
  }, [selectedUser?.id])

  // Fetch laptops when search opens
  useEffect(() => {
    if (searchOpen && selectedUser && !laptopsLoaded) {
      gql('{ laptops { id merk_type status specificaties } }', undefined, selectedUser.id)
        .then(d => {
          setAllLaptops(d.data?.laptops || [])
          setLaptopsLoaded(true)
        })
        .catch(() => {})
    }
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [searchOpen, selectedUser?.id])

  // Close search on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    if (searchOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [searchOpen])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Fetch sidebar widget + nav badge counts
  useEffect(() => {
    if (!selectedUser) { setSidebarItems([]); setSidebarTitle(''); setNavBadge(null); return }
    setWidgetLoading(true)

    if (selectedUser.role === 'ADMIN') {
      setSidebarTitle('Wachten op keuring')
      gql('{ pendingReservations { id startDate activity { title } requester { name } } }', undefined, selectedUser.id)
        .then(d => {
          const list = d.data?.pendingReservations || []
          const items = list.slice(0, 4).map((r: any) => ({
            id: r.id,
            label: r.activity?.title || 'Activiteit',
            sublabel: (r.requester?.name || '') + ' · ' + formatDate(r.startDate),
            href: '/reserveringen',
          }))
          setSidebarItems(items)
          setNavBadge(list.length > 0 ? { href: '/reserveringen', count: list.length } : null)
          setWidgetLoading(false)
        })
        .catch(() => { setWidgetLoading(false) })
    } else if (selectedUser.role === 'HELPDESK') {
      setSidebarTitle('Open storingen')
      gql('{ openIssues { id description laptop { merk_type } } }', undefined, selectedUser.id)
        .then(d => {
          const list = d.data?.openIssues || []
          const items = list.slice(0, 4).map((issue: any) => ({
            id: issue.id,
            label: issue.laptop?.merk_type || 'Laptop',
            sublabel: (issue.description || '').slice(0, 38) + ((issue.description || '').length > 38 ? '…' : ''),
            href: '/storingen',
          }))
          setSidebarItems(items)
          setNavBadge(list.length > 0 ? { href: '/storingen', count: list.length } : null)
          setWidgetLoading(false)
        })
        .catch(() => { setWidgetLoading(false) })
    } else if (selectedUser.role === 'OWNER') {
      setSidebarTitle('Aankomend')
      gql(`{ myReservations(userId: "${selectedUser.id}") { id startDate status activity { title } } }`, undefined, selectedUser.id)
        .then(d => {
          const now = new Date()
          const all: any[] = d.data?.myReservations || []
          const upcoming = all
            .filter((r: any) => ['APPROVED', 'REQUESTED'].includes(r.status) && new Date(r.startDate) > now)
            .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          const pending = all.filter((r: any) => r.status === 'REQUESTED').length
          const items = upcoming.slice(0, 4).map((r: any) => ({
            id: r.id,
            label: r.activity?.title || 'Activiteit',
            sublabel: formatDate(r.startDate) + ' · ' + (r.status === 'APPROVED' ? 'Goedgekeurd' : 'In afwachting'),
            href: '/aanvragen',
          }))
          setSidebarItems(items)
          setNavBadge(pending > 0 ? { href: '/aanvragen', count: pending } : null)
          setWidgetLoading(false)
        })
        .catch(() => { setWidgetLoading(false) })
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
              const badge = navBadge?.href === item.href ? navBadge.count : 0
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: 13,
                  color: isActive ? 'var(--black)' : 'var(--grey)',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  transition: 'color 0.15s, letter-spacing 0.15s',
                  letterSpacing: isActive ? '-0.02em' : '0',
                }}>
                  {item.label}
                  {badge > 0 && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: 'var(--red)',
                      color: '#fff',
                      borderRadius: 99,
                      padding: '1px 6px',
                      letterSpacing: 0,
                      lineHeight: 1.6,
                    }}>
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Quick-info widget */}
          <div style={{ marginTop: 40 }}>
            <p className="section-label" style={{ marginBottom: 10 }}>{sidebarTitle}</p>
            {widgetLoading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="skeleton" style={{ width: '80%', height: 11, marginBottom: 5 }} />
                    <div className="skeleton" style={{ width: '55%', height: 10 }} />
                  </div>
                ))}
              </>
            ) : sidebarItems.length > 0 ? (
              sidebarItems.map(item => (
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
              ))
            ) : (
              <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>Niets op dit moment.</p>
            )}
          </div>
        </>
      ) : null}

      <img aria-hidden src="/imgs/metro_60.png" alt="" style={{
        position: 'absolute', bottom: -20, left: -10, width: 140,
        opacity: isDark ? 0.04 : 0.07, filter: isDark ? 'invert(1)' : 'none',
        pointerEvents: 'none', userSelect: 'none', transform: 'rotate(-15deg)',
      }} />
    </>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--white)', fontFamily: 'var(--font)', position: 'relative',
    }}>

      {/* Navbar */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 32px',
        background: 'var(--white)', position: 'sticky', top: 0, zIndex: 30,
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.35)'
          : '0 1px 0 rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.04)',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            className="hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Sluit menu' : 'Open menu'}
          >
            <span className={`ham-line${menuOpen ? ' open-top' : ''}`} />
            <span className={`ham-line${menuOpen ? ' open-mid' : ''}`} />
            <span className={`ham-line${menuOpen ? ' open-bot' : ''}`} />
            {navBadge && !menuOpen && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 6, height: 6, borderRadius: '50%', background: 'var(--red)',
              }} />
            )}
          </button>

          <span style={{
            fontWeight: 700, fontSize: 13, letterSpacing: '0.12em',
            color: 'var(--black)', textTransform: 'uppercase',
          }}>
            Asha
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Search bubble */}
          <div ref={searchContainerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'row-reverse', alignItems: 'center' }}>
            {/* Magnifying glass button */}
            <button
              onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery('') }}
              title="Zoek laptop (druk / om te openen)"
              style={{
                width: 26, height: 26, borderRadius: '50%',
                border: `1px solid ${searchOpen ? 'var(--black)' : 'var(--border)'}`,
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, padding: 0, transition: 'border-color 0.15s',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <circle cx="5" cy="5" r="3.5" stroke="var(--grey)" strokeWidth="1.5" />
                <line x1="7.8" y1="7.8" x2="11" y2="11" stroke="var(--grey)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Expanding input */}
            <div style={{
              width: searchOpen ? '170px' : '0',
              overflow: 'hidden',
              transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
              marginRight: searchOpen ? 6 : 0,
            }}>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Zoek laptop…"
                style={{
                  width: '100%', height: 26, padding: '0 10px',
                  fontSize: 12, border: '1px solid var(--border)', borderRadius: 13,
                  background: 'var(--white)', color: 'var(--black)', outline: 'none',
                  fontFamily: 'var(--font)',
                }}
              />
            </div>

            {/* Results dropdown */}
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="search-dropdown">
                {!selectedUser ? (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey)' }}>
                    Selecteer eerst een gebruiker
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey)' }}>
                    Geen laptops gevonden
                  </div>
                ) : (
                  searchResults.map(l => (
                    <Link
                      key={l.id}
                      href="/"
                      className="search-result"
                      onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.merk_type}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--grey)', margin: '1px 0 0' }}>
                          {l.specificaties || '—'}
                        </p>
                      </div>
                      <span className={`badge ${statusBadge[l.status] || ''}`} style={{ flexShrink: 0, fontSize: 11 }}>
                        {statusLabel[l.status] || l.status}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Schakel naar licht' : 'Schakel naar donker'}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0, transition: 'border-color 0.2s',
            }}
          >
            <span style={{
              display: 'block', width: 9, height: 9, borderRadius: '50%',
              background: isDark ? 'var(--black)' : 'transparent',
              border: '1.5px solid var(--grey)', transition: 'all 0.2s',
            }} />
          </button>

          {/* Logged-in user + logout */}
          {loggedInUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--black)', lineHeight: 1.2 }}>
                  {loggedInUser.name}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--grey)', lineHeight: 1.2 }}>
                  {roleLabel[loggedInUser.role] || loggedInUser.role}
                </p>
              </div>
              <button
                onClick={() => { logout(); router.push('/login') }}
                title="Uitloggen"
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0, flexShrink: 0, color: 'var(--grey)', fontSize: 13,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--grey)' }}
              >
                ↩
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile overlay */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 25, backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* Page body */}
      <div style={{ display: 'flex', flex: 1 }}>
        <aside className={`layout-sidebar${menuOpen ? ' sidebar-open' : ''}`}>
          {sidebarInner}
        </aside>

        <main className="layout-main">
          <div key={router.pathname} className="page-enter">
            {(title || subtitle) && (
              <div className="page-header">
                {title && <h1>{title}</h1>}
                {subtitle && <p>{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Compass watermark — centred */}
      <svg
        aria-hidden
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 360,
          opacity: isDark ? 0.016 : 0.02,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
          color: isDark ? '#fff' : '#000',
        }}
      >
        {/* Outer ring */}
        <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="3" />
        {/* Inner ring */}
        <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        {/* Centre dot */}
        <circle cx="60" cy="60" r="3.5" fill="currentColor" />
        {/* N point (filled) */}
        <polygon points="60,8 54,60 66,60" fill="currentColor" />
        {/* S point (outline) */}
        <polygon points="60,112 54,60 66,60" stroke="currentColor" strokeWidth="2" fill="none" />
        {/* E point (outline) */}
        <polygon points="112,60 60,54 60,66" stroke="currentColor" strokeWidth="2" fill="none" />
        {/* W point (outline) */}
        <polygon points="8,60 60,54 60,66" stroke="currentColor" strokeWidth="2" fill="none" />
        {/* Diagonal tick marks */}
        <line x1="21.5" y1="21.5" x2="27.5" y2="27.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="98.5" y1="21.5" x2="92.5" y2="27.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="21.5" y1="98.5" x2="27.5" y2="92.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="98.5" y1="98.5" x2="92.5" y2="92.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
