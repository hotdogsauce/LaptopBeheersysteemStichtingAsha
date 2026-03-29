import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from './schema/typeDefs.js'
import { resolvers } from './schema/resolvers.js'
import { PrismaClient } from '@prisma/client'

console.log('INDEX: modules geladen')

process.on('uncaughtException', (err) => {
  console.error('CRASH uncaughtException:', err.message, err.stack)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('CRASH unhandledRejection:', reason)
  process.exit(1)
})

const prisma = new PrismaClient()
const schema = makeExecutableSchema({ typeDefs, resolvers })

const yoga = createYoga({
  schema,
  maskedErrors: true,
  context: async ({ request }) => {
    const userId = request.headers.get('x-user-id')
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null
    return { user }
  }
})

const server = createServer(yoga)

const PORT = Number(process.env.PORT) || 4000
console.log('INDEX: server aan het starten op port', PORT)
server.listen(PORT, () => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'server_start', port: PORT }))
})
server.on('error', (err) => {
  console.error('SERVER ERROR:', err.message)
  process.exit(1)
})
