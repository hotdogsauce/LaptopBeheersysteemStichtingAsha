import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from './schema/typeDefs.js'
import { resolvers } from './schema/resolvers.js'
import { PrismaClient } from '@prisma/client'

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

// ─── HTTP server met /health route ───────────────────────────────────────
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'GET' && req.url === '/health') {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', db: 'ok', ts: new Date().toISOString() }))
    } catch {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'error', db: 'unreachable' }))
    }
    return
  }
  yoga(req, res)
})

const PORT = process.env.PORT ?? 4000
server.listen(PORT, () => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'server_start', port: PORT }))
})
