import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const API    = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

const STATUS_LABELS: Record<string, string> = {
  MISSING:        'Vermist',
  OUT_OF_SERVICE: 'Buiten gebruik',
  DEFECT:         'Defect',
  IN_CONTROL:     'In controle',
  AVAILABLE:      'Beschikbaar',
}

const COLOURS: Record<string, string> = {
  MISSING:        '#8b0000',
  OUT_OF_SERVICE: '#555',
  DEFECT:         '#c2410c',
}

async function fetchAdminEmails(): Promise<{ name: string; email: string }[]> {
  const res  = await fetch(API, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query: '{ users { name email role } }' }),
  })
  const data = await res.json()
  const users: { name: string; email: string | null; role: string }[] = data.data?.users || []
  return users
    .filter(u => u.role === 'ADMIN' && u.email)
    .map(u => ({ name: u.name, email: u.email! }))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { laptopName, laptopId, newStatus, reportedBy, maintenanceLog, blocked } = req.body
  if (!laptopName || !newStatus) return res.status(400).json({ error: 'laptopName and newStatus required' })

  const recipients = await fetchAdminEmails()
  if (recipients.length === 0) return res.status(200).json({ sent: 0 })

  const label  = STATUS_LABELS[newStatus] || newStatus
  const colour = COLOURS[newStatus]       || '#000'
  const now    = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const subject = blocked
    ? `⚠ Goedkeuring vereist: ${laptopName} → ${label}`
    : `ℹ ${laptopName} is ingesteld op ${label}`

  const headline = blocked
    ? `Goedkeuring vereist`
    : `Statuswijziging: ${label}`

  const intro = blocked
    ? `<strong>${reportedBy || 'Een medewerker'}</strong> wil laptop <strong>${laptopName}</strong> de status <strong>${label}</strong> geven, maar heeft hiervoor geen toestemming. Log in om dit handmatig te verwerken.`
    : `Laptop <strong>${laptopName}</strong> is door <strong>${reportedBy || 'een medewerker'}</strong> ingesteld op <strong>${label}</strong>.`

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8f8f8;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5">
      <div style="background:${colour};padding:24px 32px">
        <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7)">Stichting Asha · Laptopbeheer</p>
        <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">${headline}</h1>
      </div>
      <div style="padding:28px 32px">
        <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.6">${intro}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;width:140px">Laptop</td>
            <td style="padding:10px 0;font-weight:600;color:#111">${laptopName}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">Nieuwe status</td>
            <td style="padding:10px 0;color:#555">${label}</td>
          </tr>
          ${reportedBy ? `<tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">${blocked ? 'Aangevraagd door' : 'Gewijzigd door'}</td>
            <td style="padding:10px 0;color:#555">${reportedBy}</td>
          </tr>` : ''}
          ${maintenanceLog ? `<tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;vertical-align:top">Reden</td>
            <td style="padding:10px 0;color:#333;line-height:1.5">${maintenanceLog}</td>
          </tr>` : ''}
          ${laptopId ? `<tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">ID</td>
            <td style="padding:10px 0;color:#555;font-family:monospace">${laptopId}</td>
          </tr>` : ''}
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

  const results = await Promise.allSettled(
    recipients.map(r =>
      resend.emails.send({
        from:    'Laptopbeheer <onboarding@resend.dev>',
        to:      r.email,
        subject,
        html,
      })
    )
  )

  res.status(200).json({ sent: results.filter(r => r.status === 'fulfilled').length })
}
