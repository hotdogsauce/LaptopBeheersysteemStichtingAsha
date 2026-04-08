import { PrismaClient } from '@prisma/client'

const _prisma = new PrismaClient()

// ─── In-memory rate limiter voor AI endpoint ──────────────────────────────
const aiRateMap = new Map<string, { count: number; resetAt: number }>()
const AI_RATE_LIMIT = 10 // verzoeken per minuut per gebruiker

export function checkAiRateLimit(userId: string) {
  const now = Date.now()
  const entry = aiRateMap.get(userId)
  if (!entry || now > entry.resetAt) {
    aiRateMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return
  }
  if (entry.count >= AI_RATE_LIMIT) {
    throw new Error('Te veel AI-verzoeken. Probeer het over een minuut opnieuw.')
  }
  entry.count++
}

// ─── Audit logging naar stdout + database ────────────────────────────────
export function logAudit(event: string, details: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...details }))
  const userId = (details.userId ?? details.adminId ?? null) as string | null
  _prisma.auditLog.create({
    data: { event, userId, details: JSON.stringify(details) }
  }).catch(() => {})
}

// ─── Notificatie helper ───────────────────────────────────────────────────
export function createNotification(userId: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' = 'INFO') {
  _prisma.notification.create({
    data: { userId, message, type }
  }).catch(() => {})
}

// ─── Admin user IDs helper ────────────────────────────────────────────────
export async function getAdminIds(): Promise<string[]> {
  const admins = await _prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
  return admins.map(a => a.id)
}

// ─── Notify all admins (in-app only) ─────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  MISSING:        'Vermist',
  OUT_OF_SERVICE: 'Buiten gebruik',
  DEFECT:         'Defect',
  IN_CONTROL:     'In controle',
  AVAILABLE:      'Beschikbaar',
}

export async function notifyAdminsStatusChange(opts: {
  laptopName: string
  laptopId:   string
  newStatus:  string
  reportedBy: string
  reden:      string
}) {
  const { laptopName, newStatus, reportedBy, reden } = opts
  const label  = STATUS_LABELS[newStatus] || newStatus
  const admins = await _prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
  for (const admin of admins) {
    _prisma.notification.create({
      data: { userId: admin.id, message: `${laptopName} → ${label} door ${reportedBy}. Reden: ${reden}`, type: 'WARNING' }
    }).catch(() => {})
  }
}
