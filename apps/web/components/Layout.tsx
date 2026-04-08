import { ReactNode, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser, gql } from '../context/UserContext'
import { useT, LANG_OPTIONS } from '../context/LanguageContext'
import Avatar from './Avatar'
import CompassBg from './CompassBg'
import UseAnimations from 'react-useanimations'
import notification2 from 'react-useanimations/lib/notification2'
import menu4 from 'react-useanimations/lib/menu4'

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
  const { selectedUser, theme, toggleTheme, loggedInUser, logout, users } = useUser()
  const loggedInUserData = users.find(u => u.id === loggedInUser?.userId)
  const { t, lang, setLang } = useT()
  const router = useRouter()

  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([])
  const [sidebarTitle, setSidebarTitle] = useState('')
  const [widgetLoading, setWidgetLoading] = useState(false)
  const [navBadge, setNavBadge] = useState<{ href: string; count: number } | null>(null)

  // Notifications bell
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: string; read: boolean; createdAt: string }[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => !n.read).length

  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allLaptops, setAllLaptops] = useState<LaptopResult[]>([])
  const [laptopsLoaded, setLaptopsLoaded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const roleLabel: Record<string, string> = {
    ADMIN: t('role_admin'), OWNER: t('role_owner'), HELPDESK: t('role_helpdesk'),
  }
  const navByRole: Record<string, { href: string; label: string }[]> = {
    ADMIN: [
      { href: '/', label: t('nav_overview') },
      { href: '/dashboard', label: t('nav_dashboard') },
      { href: '/reserveringen', label: t('nav_reservations') },
      { href: '/beheer', label: t('nav_beheer') },
      { href: '/activiteiten', label: t('nav_activities') },
      { href: '/software', label: t('nav_software') },
      { href: '/ai', label: t('nav_ai') },
    ],
    OWNER: [
      { href: '/aanvragen', label: t('nav_requests') },
      { href: '/activiteiten', label: t('nav_activities') },
      { href: '/software', label: t('nav_software') },
      { href: '/ai', label: t('nav_ai') },
    ],
    HELPDESK: [
      { href: '/', label: t('nav_overview') },
      { href: '/dashboard', label: t('nav_dashboard') },
      { href: '/toewijzen', label: t('nav_assign') },
      { href: '/storingen', label: t('nav_issues') },
      { href: '/controle', label: t('nav_control') },
      { href: '/ai', label: t('nav_ai') },
    ],
  }
  const statusLabel: Record<string, string> = {
    AVAILABLE: t('status_available'), RESERVED: t('status_reserved'),
    IN_USE: t('status_in_use'), IN_CONTROL: t('status_in_control'),
    DEFECT: t('status_defect'), OUT_OF_SERVICE: t('status_out_of_service'),
    MISSING: t('status_missing'),
  }

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

  // Fetch notifications for logged-in user
  useEffect(() => {
    if (!loggedInUser) { setNotifications([]); return }
    function fetchNotifs() {
      gql('{ notifications { id message type read createdAt } }', undefined, loggedInUser!.userId)
        .then(d => setNotifications(d.data?.notifications || []))
        .catch(() => {})
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [loggedInUser?.userId])

  // Close bell dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    if (bellOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [bellOpen])

  // Close lang dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    if (langOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [langOpen])

  async function markAllRead() {
    if (!loggedInUser) return
    await gql('mutation { markAllNotificationsRead }', undefined, loggedInUser.userId).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id: string, message: string) {
    if (!loggedInUser) return
    await gql(`mutation { markNotificationRead(id: "${id}") }`, undefined, loggedInUser.userId).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setBellOpen(false)
    const link = notifLink(message, loggedInUser.role)
    if (link) router.push(link)
  }

  function notifLink(message: string, role: string): string | null {
    if (message.includes('reserveringsaanvraag')) return '/reserveringen'
    if (message.includes('Je reservering')) return '/aanvragen'
    if (message.includes('softwareaanvraag') && role === 'OWNER') return '/software'
    if (message.includes('softwareaanvraag')) return '/reserveringen'
    return null
  }

  // Fetch sidebar widget + nav badge counts
  useEffect(() => {
    if (!selectedUser) { setSidebarItems([]); setSidebarTitle(''); setNavBadge(null); return }
    setWidgetLoading(true)

    if (selectedUser.role === 'ADMIN') {
      setSidebarTitle(t('widget_pending'))
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
      setSidebarTitle(t('widget_issues'))
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
      setSidebarTitle(t('widget_upcoming'))
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
            sublabel: formatDate(r.startDate) + ' · ' + (r.status === 'APPROVED' ? t('sidebar_approved') : t('sidebar_awaiting')),
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
          <div style={{ marginBottom: 36, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={selectedUser.name} avatar={selectedUser.avatar} size={36} />
            <div>
              <p className="section-label" style={{ margin: 0 }}>{roleLabel[selectedUser.role] || selectedUser.role}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)', margin: 0, letterSpacing: '-0.01em' }}>
                {selectedUser.name}
              </p>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {selectedUser.role === 'OWNER' && (
              <Link id="tour-nav-overzicht" href="/" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', fontSize: 13,
                color: router.pathname === '/' ? 'var(--black)' : 'var(--grey)',
                fontWeight: router.pathname === '/' ? 600 : 400,
                textDecoration: 'none',
                transition: 'color 0.15s, letter-spacing 0.15s',
                letterSpacing: router.pathname === '/' ? '-0.02em' : '0',
              }}>
                {t('nav_overview')}
              </Link>
            )}
            {navItems.map(item => {
              const isActive = router.pathname === item.href
              const badge = navBadge?.href === item.href ? navBadge.count : 0
              const tourId = 'tour-nav-' + (item.href === '/' ? 'overzicht' : item.href.replace('/', ''))
              return (
                <Link key={item.href} id={tourId} href={item.href} style={{
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
              <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>{t('widget_nothing')}</p>
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
          <div style={{ position: 'relative' }}>
            <UseAnimations
              animation={menu4}
              size={34}
              strokeColor={isDark ? '#EDEDED' : '#000000'}
              onClick={() => setMenuOpen(o => !o)}
              wrapperStyle={{
                cursor: 'pointer',
                display: 'none', // shown by CSS .hamburger display:flex at ≤768px
              }}
              className="hamburger"
            />
            {navBadge && !menuOpen && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 6, height: 6, borderRadius: '50%', background: 'var(--red)',
                pointerEvents: 'none',
              }} />
            )}
          </div>

          <img
            src="/icons/asha-logo.png"
            alt="Stichting Asha"
            style={{ height: 51, width: 'auto', display: 'block', filter: isDark ? 'invert(1)' : 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Search bubble */}
          <div ref={searchContainerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'row-reverse', alignItems: 'center' }}>
            {/* Magnifying glass button */}
            <button
              className="btn btn-ghost"
              onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery('') }}
              title="Zoek laptop (druk / om te openen)"
              style={{
                width: 26, height: 26, minHeight: 26, borderRadius: '50%',
                border: `1px solid ${searchOpen ? 'var(--black)' : 'var(--border)'}`,
                cursor: 'pointer',
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
                placeholder={t('search_placeholder')}
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
                    {t('search_hint')}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey)' }}>
                    {t('search_empty')}
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

          {/* Notification bell */}
          {loggedInUser && (
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setBellOpen(o => !o); if (!bellOpen && unreadCount > 0) {} }}
                title={t('notifs')}
                style={{
                  width: 26, height: 26, minHeight: 26, borderRadius: '50%',
                  border: `1px solid ${bellOpen ? 'var(--black)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, padding: 0, position: 'relative', transition: 'border-color 0.15s',
                }}
              >
                <UseAnimations
                  animation={notification2}
                  size={20}
                  strokeColor={isDark ? '#888888' : '#7d7d7d'}
                  loop={unreadCount > 0}
                  autoplay={unreadCount > 0}
                  wrapperStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    minWidth: 14, height: 14, borderRadius: 99,
                    background: 'var(--red)', color: '#fff',
                    fontSize: 9, fontWeight: 700, lineHeight: '14px',
                    textAlign: 'center', padding: '0 3px',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div style={{
                  position: 'absolute', top: 36, right: 0,
                  width: 280, background: 'var(--white)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  zIndex: 50, overflow: 'hidden',
                }} className="section-enter">
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)' }}>{t('notifs')}</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--grey)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {t('notif_all_read')}
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ padding: '16px 14px', fontSize: 12, color: 'var(--grey)', margin: 0 }}>{t('notif_empty')}</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => markRead(n.id, n.message)}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: notifLink(n.message, loggedInUser?.role || '') ? 'pointer' : 'default',
                            background: n.read ? 'transparent' : 'var(--bg-soft)',
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                          }}
                        >
                          <span style={{
                            width: 6, height: 6, borderRadius: '50', marginTop: 4, flexShrink: 0,
                            background: n.read ? 'transparent' : (n.type === 'SUCCESS' ? '#22c55e' : n.type === 'WARNING' ? 'var(--red)' : 'var(--grey)'),
                          }} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, color: 'var(--black)', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                            <p style={{ fontSize: 11, color: 'var(--grey)', margin: '2px 0 0' }}>
                              {new Date(n.createdAt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Language switcher */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(o => !o)}
              title="Language / Taal"
              style={{
                width: 26, height: 26, borderRadius: '50%',
                border: `1px solid ${langOpen ? 'var(--black)' : 'var(--border)'}`,
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, padding: 0, fontSize: 13, transition: 'border-color 0.15s',
              }}
            >
              {LANG_OPTIONS.find(o => o.code === lang)?.flag ?? '🌐'}
            </button>
            {langOpen && (
              <div style={{
                position: 'absolute', top: 36, right: 0,
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflow: 'hidden', zIndex: 50, minWidth: 160,
              }} className="section-enter">
                {LANG_OPTIONS.map(o => (
                  <button
                    key={o.code}
                    onClick={() => { setLang(o.code); setLangOpen(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', border: 'none', cursor: 'pointer',
                      background: lang === o.code ? 'var(--bg-soft)' : 'transparent',
                      fontFamily: 'var(--font)', fontSize: 13, color: 'var(--black)',
                      fontWeight: lang === o.code ? 600 : 400, textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{o.flag}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            className="btn btn-ghost"
            onClick={toggleTheme}
            title={isDark ? t('theme_to_light') : t('theme_to_dark')}
            style={{
              width: 26, height: 26, minHeight: 26, borderRadius: '50%',
              border: '1px solid var(--border)', cursor: 'pointer',
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
              <div
                id="tour-nav-account"
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => router.push('/account')}
                title={t('nav_account')}
              >
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--black)', lineHeight: 1.2 }}>
                    {loggedInUser.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--grey)', lineHeight: 1.2 }}>
                    {roleLabel[loggedInUser.role] || loggedInUser.role}
                  </p>
                </div>
                <Avatar name={loggedInUser.name} avatar={loggedInUserData?.avatar} size={30} />
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => { logout(); router.push('/login') }}
                title={t('nav_logout')}
                style={{
                  width: 28, height: 28, minHeight: 28, borderRadius: '50%',
                  border: '1px solid var(--border)', cursor: 'pointer',
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

      <CompassBg position="right" size={520} dark={isDark} />
    </div>
  )
}
