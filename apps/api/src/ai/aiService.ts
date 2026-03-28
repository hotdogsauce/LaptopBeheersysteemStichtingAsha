import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Je bent een hulpassistent voor het laptopbeheersysteem van Stichting Asha.

Strikte regels:
- Je baseert je antwoorden UITSLUITEND op de contextdata die je ontvangt. Verzin geen informatie.
- Je kunt GEEN beslissingen nemen zoals goedkeuren, afwijzen of toewijzen. Verwijs de gebruiker altijd door naar de juiste persoon in het systeem.
- Je kunt GEEN data aanpassen of acties uitvoeren in het systeem.
- Je beantwoordt vragen kort, feitelijk en in het Nederlands.
- Als de gevraagde informatie niet in de context staat, zeg dat dan eerlijk.
- Deel nooit data mee die niet relevant is voor de vraag of de rol van de gebruiker.`

async function fetchContext(userId: string, role: string): Promise<string> {
  if (role === 'OWNER') {
    const reservations = await prisma.reservation.findMany({
      where: { requesterId: userId },
      include: { activity: true, laptops: true },
      orderBy: { startDate: 'desc' },
      take: 10,
    })
    const activities = await prisma.activity.findMany({ take: 20 })
    return (
      `Jouw reserveringen (laatste 10):\n${JSON.stringify(reservations, null, 2)}\n\n` +
      `Beschikbare activiteiten:\n${JSON.stringify(activities, null, 2)}`
    )
  }

  if (role === 'HELPDESK') {
    const [openIssues, inControlLaptops] = await Promise.all([
      prisma.issue.findMany({
        where: { resolved: false },
        include: { laptop: true, reportedBy: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.laptop.findMany({ where: { status: 'IN_CONTROL' } }),
    ])
    return (
      `Open storingen:\n${JSON.stringify(openIssues, null, 2)}\n\n` +
      `Laptops met status IN_CONTROL:\n${JSON.stringify(inControlLaptops, null, 2)}`
    )
  }

  if (role === 'ADMIN') {
    const [pendingReservations, laptops, openIssues, pendingSoftware] = await Promise.all([
      prisma.reservation.findMany({
        where: { status: 'REQUESTED' },
        include: { activity: true, requester: true },
      }),
      prisma.laptop.findMany(),
      prisma.issue.findMany({
        where: { resolved: false },
        include: { laptop: true },
      }),
      prisma.softwareRequest.findMany({
        where: { status: 'REQUESTED' },
        include: { requester: true, activity: true },
      }),
    ])
    return (
      `Openstaande reserveringsaanvragen:\n${JSON.stringify(pendingReservations, null, 2)}\n\n` +
      `Alle laptops:\n${JSON.stringify(laptops, null, 2)}\n\n` +
      `Open storingen:\n${JSON.stringify(openIssues, null, 2)}\n\n` +
      `Openstaande softwareaanvragen:\n${JSON.stringify(pendingSoftware, null, 2)}`
    )
  }

  return ''
}

export async function askAI(userId: string, role: string, question: string): Promise<string> {
  const context = await fetchContext(userId, role)

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Contextdata (actuele systeemdata voor jouw rol):\n${context}\n\nVraag: ${question}`,
      },
    ],
  })

  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Onverwacht antwoordtype van AI.')
  return block.text
}
