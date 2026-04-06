import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useT } from '../context/LanguageContext'

interface DashboardStats {
  totalLaptops: number
  available: number
  inUse: number
  defect: number
  missing: number
  oos: number
  pendingReservations: number
  openIssues: number
  totalReservations: number
}

const statusColor: Record<string, string> = {
  available: '#22c55e',
  inUse: '#3b82f6',
  defect: '#f97316',
  missing: '#ef4444',
  oos: '#6b7280',
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ fontSize: 11, color: 'var(--grey)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: color || 'var(--black)', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function BarChart({ stats }: { stats: DashboardStats }) {
  const { t } = useT()
  const active = stats.totalLaptops - stats.oos
  if (active === 0) return null

  const bars = [
    { label: t('dash_available'), value: stats.available, color: statusColor.available },
    { label: t('dash_in_use'),   value: stats.inUse,      color: statusColor.inUse },
    { label: t('dash_defect'),   value: stats.defect,     color: statusColor.defect },
    { label: t('dash_missing'),  value: stats.missing,    color: statusColor.missing },
    { label: t('dash_oos'),      value: stats.oos,        color: statusColor.oos },
  ].filter(b => b.value > 0)

  const max = Math.max(...bars.map(b => b.value), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {bars.map(bar => (
        <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--grey)', width: 110, flexShrink: 0, textAlign: 'right' }}>{bar.label}</span>
          <div style={{ flex: 1, height: 20, background: 'var(--bg-soft)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(bar.value / max) * 100}%`,
              background: bar.color,
              borderRadius: 4,
              minWidth: bar.value > 0 ? 4 : 0,
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', width: 24, textAlign: 'right' }}>{bar.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { selectedUserId, selectedUser } = useUser()
  const { t } = useT()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedUserId || !['ADMIN', 'HELPDESK'].includes(selectedUser?.role || '')) return
    setLoading(true)
    gql(`{
      dashboardStats {
        totalLaptops available inUse defect missing oos
        pendingReservations openIssues totalReservations
      }
    }`, undefined, selectedUserId)
      .then(d => { setStats(d.data?.dashboardStats || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedUserId])

  const allowed = selectedUser?.role === 'ADMIN' || selectedUser?.role === 'HELPDESK'

  return (
    <Layout title={t('dash_title')} subtitle={t('dash_sub')}>

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">📊</div>
          <p className="empty-text">{t('select_user')}</p>
        </div>
      )}

      {selectedUserId && !allowed && (
        <div className="alert alert-error">{t('dash_no_access')}</div>
      )}

      {selectedUserId && allowed && loading && (
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 8 }} />
          ))}
        </div>
      )}

      {selectedUserId && allowed && !loading && stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 40 }}>
            <StatCard label={t('dash_total')}     value={stats.totalLaptops} />
            <StatCard label={t('dash_available')} value={stats.available} color={statusColor.available} />
            <StatCard label={t('dash_in_use')}    value={stats.inUse}     color={statusColor.inUse} />
            <StatCard label={t('dash_defect')}    value={stats.defect}    color={stats.defect  > 0 ? statusColor.defect   : undefined} />
            <StatCard label={t('dash_missing')}   value={stats.missing}   color={stats.missing > 0 ? statusColor.missing  : undefined} />
            <StatCard label={t('dash_oos')}       value={stats.oos}       color={stats.oos     > 0 ? statusColor.oos      : undefined} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 48 }}>
            <StatCard label={t('dash_reservations')} value={stats.totalReservations}  sub={t('dash_reservations').toLowerCase()} />
            <StatCard label={t('dash_pending')}      value={stats.pendingReservations} sub={t('dash_reservations').toLowerCase()} color={stats.pendingReservations > 0 ? statusColor.defect : undefined} />
            <StatCard label={t('dash_issues')}       value={stats.openIssues}          sub={t('dash_issues').toLowerCase()} color={stats.openIssues > 0 ? statusColor.missing : undefined} />
          </div>

          <div className="card" style={{ padding: '24px 28px' }}>
            <p className="section-label" style={{ marginBottom: 20 }}>{t('dash_chart')}</p>
            <BarChart stats={stats} />
            {stats.totalLaptops > 0 && (
              <p style={{ fontSize: 12, color: 'var(--grey)', marginTop: 20, marginBottom: 0 }}>
                {t('dash_chart')}: {Math.round((stats.available / stats.totalLaptops) * 100)}% · {stats.available} {t('dash_chart_sub')}
              </p>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
