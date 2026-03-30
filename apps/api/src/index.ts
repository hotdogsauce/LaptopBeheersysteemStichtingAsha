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

const server = createServer(yoga)

const PORT = Number(process.env.PORT) || 4000
server.listen(PORT, () => {
  console.log(`🚀 GraphQL server draait op poort ${PORT}`)
})

// Automatische afwijzing na 3 werkdagen zonder reactie
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
      // Notify the requester
      await prisma.notification.create({
        data: {
          userId: r.requesterId,
          message: `Je reservering voor "${r.activity.title}" is automatisch afgekeurd omdat de beheerder niet binnen 3 werkdagen heeft gereageerd.`,
          type: 'WARNING',
        },
      }).catch(() => {})
      console.log(`Auto-afgewezen reservering ${r.id}`)
    }
  }
}

// Automatisch buiten gebruik na 7 werkdagen vermist
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
      console.log(`Auto-buiten-gebruik: laptop ${l.id} (${l.merk_type}) — 7 werkdagen vermist`)
    }
  }
}

// Elk uur controleren
setInterval(() => {
  autoRejectExpiredReservations()
  autoDecommissionMissingLaptops()
}, 60 * 60 * 1000)
// Ook direct bij opstarten uitvoeren
autoRejectExpiredReservations()
autoDecommissionMissingLaptops()
