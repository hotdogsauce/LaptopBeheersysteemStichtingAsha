import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const API    = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

async function fetchAdminEmails(): Promise<{ name: string; email: string }[]> {
  const res  = await fetch(API, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query: '{ users { name email role } }' }),
  })
  const data = await res.json()
  const users: { name: string; email: string | null; role: string }[] = data.data?.users || []
  return users
    .filter(u => (u.role === 'ADMIN' || u.role === 'HELPDESK') && u.email)
    .map(u => ({ name: u.name, email: u.email! }))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { laptopName, laptopId, reportedBy } = req.body
  if (!laptopName) return res.status(400).json({ error: 'laptopName required' })

  const recipients = await fetchAdminEmails()
  if (recipients.length === 0) return res.status(200).json({ sent: 0 })

  const now = new Date().toLocaleString('nl-NL', {
    timeZone:    'Europe/Amsterdam',
    day:         '2-digit',
    month:       'long',
    year:        'numeric',
    hour:        '2-digit',
    minute:      '2-digit',
  })

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8f8f8;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5">
      <div style="background:#8b0000;padding:24px 32px">
        <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7)">Stichting Asha · Laptopbeheer</p>
        <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">⚠ Laptop vermist</h1>
      </div>
      <div style="padding:28px 32px">
        <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.6">
          Een laptop is als <strong>vermist</strong> gemarkeerd in het systeem.
          Onderneem zo snel mogelijk actie.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;width:140px">Laptop</td>
            <td style="padding:10px 0;font-weight:600;color:#111">${laptopName}</td>
          </tr>
          ${laptopId ? `<tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">ID</td>
            <td style="padding:10px 0;color:#555;font-family:monospace">${laptopId}</td>
          </tr>` : ''}
          ${reportedBy ? `<tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">Gemeld door</td>
            <td style="padding:10px 0;color:#555">${reportedBy}</td>
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
        subject: `⚠ Laptop vermist: ${laptopName}`,
        html,
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  res.status(200).json({ sent, total: recipients.length })
}
