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
      console.log(`Auto-afgewezen reservering ${r.id}`)
    }
  }
}

// Elk uur controleren
setInterval(autoRejectExpiredReservations, 60 * 60 * 1000)
// Ook direct bij opstarten uitvoeren
autoRejectExpiredReservations()
