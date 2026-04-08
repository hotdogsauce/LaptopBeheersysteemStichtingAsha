import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'

const _resend = new Resend(process.env.RESEND_API_KEY)

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

// ─── Notify all admins (in-app + email) ──────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  MISSING:        'Vermist',
  OUT_OF_SERVICE: 'Buiten gebruik',
  DEFECT:         'Defect',
  IN_CONTROL:     'In controle',
  AVAILABLE:      'Beschikbaar',
}
const STATUS_COLOURS: Record<string, string> = {
  MISSING:        '#8b0000',
  OUT_OF_SERVICE: '#555',
  DEFECT:         '#c2410c',
}

export async function notifyAdminsStatusChange(opts: {
  laptopName: string
  laptopId:   string
  newStatus:  string
  reportedBy: string
  reden:      string
}) {
  const { laptopName, laptopId, newStatus, reportedBy, reden } = opts
  const label  = STATUS_LABELS[newStatus] || newStatus
  const colour = STATUS_COLOURS[newStatus] || '#000'
  const now    = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // In-app notifications
  const admins = await _prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true, name: true } })
  for (const admin of admins) {
    _prisma.notification.create({
      data: { userId: admin.id, message: `${laptopName} is ingesteld op ${label} door ${reportedBy}. Reden: ${reden}`, type: 'WARNING' }
    }).catch(() => {})
  }

  // Email
  const recipients = admins.filter(a => a.email)
  if (recipients.length === 0) return

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8f8f8;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5">
      <div style="background:${colour};padding:24px 32px">
        <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7)">Stichting Asha · Laptopbeheer</p>
        <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">Statuswijziging: ${label}</h1>
      </div>
      <div style="padding:28px 32px">
        <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.6">
          Laptop <strong>${laptopName}</strong> is door <strong>${reportedBy}</strong> ingesteld op <strong>${label}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;width:140px">Laptop</td>
            <td style="padding:10px 0;font-weight:600;color:#111">${laptopName}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">Nieuwe status</td>
            <td style="padding:10px 0;color:#555">${label}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">Gewijzigd door</td>
            <td style="padding:10px 0;color:#555">${reportedBy}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;vertical-align:top">Reden</td>
            <td style="padding:10px 0;color:#333;line-height:1.5">${reden}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">ID</td>
            <td style="padding:10px 0;color:#555;font-family:monospace">${laptopId}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">Tijdstip</td>
            <td style="padding:10px 0;color:#555">${now}</td>
          </tr>
        </table>
        <div style="margin-top:28px">
          <a href="https://laptopbeheersysteemstichtingasha-production.up.railway.app"
             style="display:inline-block;padding:10px 22px;background:#000;color:#fff;border-radius:99px;font-size:13px;font-weight:600;text-decoration:none">
            Bekijk in systeem →
          </a>
        </div>
      </div>
      <div style="padding:16px 32px;background:#f0f0f0;font-size:11px;color:#999">
        Dit is een automatisch bericht van Stichting Asha Laptopbeheer.
      </div>
    </div>
  `

  await Promise.allSettled(
    recipients.map(r =>
      _resend.emails.send({
        from:    'Laptopbeheer <onboarding@resend.dev>',
        to:      r.email!,
        subject: `ℹ ${laptopName} is ingesteld op ${label}`,
        html,
      })
    )
  )
}
