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
server.listen(4000, () => {
  console.log('🚀 GraphQL server draait op http://localhost:4000/graphql')
})
