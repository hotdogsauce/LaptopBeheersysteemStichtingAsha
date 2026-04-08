import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from './schema/typeDefs.js'
import { resolvers } from './schema/resolvers.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const schema = makeExecutableSchema({ typeDefs, resolvers })

const yoga = createYoga({
  schema,
  maskedErrors: false,
  context: async ({ request }) => {
    const userId = request.headers.get('x-user-id')
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null
    return { user }
  }
})

const server = createServer(async (req, res) => {
  // ── Cron endpoint ──────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/cron') {
    const secret = req.headers['x-cron-secret']
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      res.writeHead(401).end('Unauthorized')
      return
    }
    try {
      await runCronJobs()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }))
    } catch (e) {
      console.error('[cron] error:', e)
      res.writeHead(500).end('Error')
    }
    return
  }

  // ── GraphQL (all other requests) ───────────────────────────────────────
  yoga.handle(req as any, res as any)
})

const PORT = Number(process.env.PORT) || 4000
server.listen(PORT, () => {
  console.log(`🚀 GraphQL server draait op poort ${PORT}`)
})

// ── Werkdagen teller ───────────────────────────────────────────────────────
function countWorkdays(from: Date, to: Date): number {
  let count = 0
  const cur = new Date(from)
  while (cur < to) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// ── Auto-afwijzing reserveringen (3 werkdagen) ────────────────────────────
async function autoRejectExpiredReservations() {
  const pending = await prisma.reservation.findMany({
    where: { status: 'REQUESTED' },
    include: { activity: true },
  })
  const now = new Date()
  for (const r of pending) {
    if (countWorkdays(r.aanvraag_datum, now) >= 3) {
      await prisma.reservation.update({
        where: { id: r.id },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Automatisch afgekeurd: beheerder heeft niet binnen 3 werkdagen gereageerd.',
        },
      })
      await prisma.notification.create({
        data: {
          userId:  r.requesterId,
          message: `Je reservering voor "${r.activity.title}" is automatisch afgekeurd omdat de beheerder niet binnen 3 werkdagen heeft gereageerd.`,
          type:    'WARNING',
        },
      }).catch(() => {})
      console.log(`[cron] Auto-afgewezen reservering ${r.id}`)
    }
  }
}

// ── Auto-afwijzing software-aanvragen (6 dagen) ───────────────────────────
async function autoRejectExpiredSoftwareRequests() {
  const pending = await prisma.softwareRequest.findMany({
    where: { status: 'REQUESTED' },
    include: { activity: true },
  })
  const now = new Date()
  for (const r of pending) {
    const days = (now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (days >= 6) {
      await prisma.softwareRequest.update({
        where: { id: r.id },
        data: {
          status:         'REJECTED',
          rejectionReason: 'Automatisch afgekeurd: beheerder heeft niet binnen 6 dagen gereageerd.',
        },
      })
      await prisma.notification.create({
        data: {
          userId:  r.requesterId,
          message: `Je softwareaanvraag "${r.title}" voor "${r.activity.title}" is automatisch afgekeurd omdat de beheerder niet binnen 6 dagen heeft gereageerd.`,
          type:    'WARNING',
        },
      }).catch(() => {})
      console.log(`[cron] Auto-afgewezen software-aanvraag ${r.id}`)
    }
  }
}

// ── Auto-buiten-gebruik na 7 werkdagen vermist ────────────────────────────
async function autoDecommissionMissingLaptops() {
  const missing = await prisma.laptop.findMany({
    where: { status: 'MISSING', missingAt: { not: null } },
  })
  const now = new Date()
  for (const l of missing) {
    if (l.missingAt && countWorkdays(l.missingAt, now) >= 7) {
      await prisma.laptop.update({
        where: { id: l.id },
        data: { status: 'OUT_OF_SERVICE', missingAt: null },
      })
      console.log(`[cron] Auto-buiten-gebruik: laptop ${l.id} (${l.merk_type}) — 7 werkdagen vermist`)
    }
  }
}

// ── Combineer alle cron jobs ───────────────────────────────────────────────
async function runCronJobs() {
  await Promise.all([
    autoRejectExpiredReservations(),
    autoRejectExpiredSoftwareRequests(),
    autoDecommissionMissingLaptops(),
  ])
}

// Elk uur + direct bij opstarten
setInterval(runCronJobs, 60 * 60 * 1000)
runCronJobs()
