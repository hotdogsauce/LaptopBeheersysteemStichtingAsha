import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
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
  inUse:     '#3b82f6',
  defect:    '#f97316',
  missing:   '#ef4444',
  oos:       '#6b7280',
}

// ─── Custom countup hook ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900, delay = 0) {
  const [value, setValue] = useState(0)
  const raf   = useRef<number | null>(null)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const timeout = setTimeout(() => {
      function tick(ts: number) {
        if (!start.current) start.current = ts
        const elapsed  = ts - start.current
        const progress = Math.min(elapsed / duration, 1)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(target * eased))
        if (progress < 1) raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    }, delay)

    return () => {
      clearTimeout(timeout)
      if (raf.current) cancelAnimationFrame(raf.current)
      start.current = null
    }
  }, [target, duration, delay])

  return value
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, index = 0 }: {
  label: string; value: number; sub?: string; color?: string; index?: number
}) {
  const displayed = useCountUp(value, 800, index * 60)

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26, delay: index * 0.055 }}
      style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <p style={{ fontSize: 11, color: 'var(--grey)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: color || 'var(--black)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {displayed}
      </p>
      {sub && <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>{sub}</p>}
    </motion.div>
  )
}

// ─── Donut chart ─────────────────────────────────────────────────────────────
const DONUT_LABELS: Record<string, string> = {
  available: 'Beschikbaar',
  inUse:     'In gebruik',
  defect:    'Defect',
  missing:   'Vermist',
  oos:       'Buiten gebruik',
}

function DonutChart({ stats }: { stats: DashboardStats }) {
  const data = [
    { name: 'available', value: stats.available, color: statusColor.available },
    { name: 'inUse',     value: stats.inUse,     color: statusColor.inUse },
    { name: 'defect',    value: stats.defect,     color: statusColor.defect },
    { name: 'missing',   value: stats.missing,    color: statusColor.missing },
    { name: 'oos',       value: stats.oos,        color: statusColor.oos },
  ].filter(d => d.value > 0)

  if (data.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={62}
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            animationBegin={200}
            animationDuration={900}
            animationEasing="ease-out"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: any, name: any) => [v, DONUT_LABELS[name] || name]}
            contentStyle={{
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--grey)' }}>{DONUT_LABELS[d.name]}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', marginLeft: 'auto', paddingLeft: 12 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({ stats }: { stats: DashboardStats }) {
  const { t } = useT()
  const [ready, setReady] = useState(false)

  // Trigger bar animation after mount
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(id)
  }, [])

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {bars.map((bar, i) => (
        <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--grey)', width: 110, flexShrink: 0, textAlign: 'right' }}>
            {bar.label}
          </span>
          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: ready ? `${(bar.value / max) * 100}%` : '0%',
              background: bar.color,
              borderRadius: 99,
              transition: `width ${0.55 + i * 0.08}s cubic-bezier(0.34, 1.2, 0.64, 1)`,
              transitionDelay: `${i * 40}ms`,
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', width: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {bar.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { selectedUserId, selectedUser } = useUser()
  const { t } = useT()
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
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
          {/* Laptop status cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 40 }}>
            <StatCard index={0} label={t('dash_total')}     value={stats.totalLaptops} />
            <StatCard index={1} label={t('dash_available')} value={stats.available} color={statusColor.available} />
            <StatCard index={2} label={t('dash_in_use')}    value={stats.inUse}     color={statusColor.inUse} />
            <StatCard index={3} label={t('dash_defect')}    value={stats.defect}    color={stats.defect  > 0 ? statusColor.defect  : undefined} />
            <StatCard index={4} label={t('dash_missing')}   value={stats.missing}   color={stats.missing > 0 ? statusColor.missing : undefined} />
            <StatCard index={5} label={t('dash_oos')}       value={stats.oos}       color={stats.oos     > 0 ? statusColor.oos     : undefined} />
          </div>

          {/* Operational cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 48 }}>
            <StatCard index={6} label={t('dash_reservations')} value={stats.totalReservations} />
            <StatCard index={7} label={t('dash_pending')}      value={stats.pendingReservations} color={stats.pendingReservations > 0 ? statusColor.defect   : undefined} />
            <StatCard index={8} label={t('dash_issues')}       value={stats.openIssues}          color={stats.openIssues          > 0 ? statusColor.missing : undefined} />
          </div>

          {/* Bar chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {/* Donut */}
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.4 }}
              style={{ padding: '24px 28px' }}
            >
              <p className="section-label" style={{ marginBottom: 20 }}>Verdeling</p>
              <DonutChart stats={stats} />
            </motion.div>

            {/* Bar chart */}
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.54, duration: 0.4 }}
              style={{ padding: '24px 28px' }}
            >
              <p className="section-label" style={{ marginBottom: 20 }}>{t('dash_chart')}</p>
              <BarChart stats={stats} />
              {stats.totalLaptops > 0 && (
                <p style={{ fontSize: 12, color: 'var(--grey)', marginTop: 20, marginBottom: 0 }}>
                  {Math.round((stats.available / stats.totalLaptops) * 100)}% {t('dash_chart_sub')} · {stats.available} {t('dash_available').toLowerCase()}
                </p>
              )}
            </motion.div>
          </div>
        </>
      )}
    </Layout>
  )
}
