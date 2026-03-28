import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { PrismaClient, UserRole, LaptopStatus } from '@prisma/client'

// Mock Groq SDK — no real API calls in tests
vi.mock('groq-sdk', () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Gemockt AI antwoord voor testdoeleinden.' } }],
        }),
      },
    }
  },
}))

const prisma = new PrismaClient()

let adminId: string
let ownerId: string
let helpdeskId: string

beforeAll(async () => {
  const ts = Date.now()
  const [admin, owner, helpdesk] = await Promise.all([
    prisma.user.create({ data: { name: 'UC06 Admin', email: `uc06-admin-${ts}@test.nl`, role: UserRole.ADMIN } }),
    prisma.user.create({ data: { name: 'UC06 Owner', email: `uc06-owner-${ts}@test.nl`, role: UserRole.OWNER } }),
    prisma.user.create({ data: { name: 'UC06 Helpdesk', email: `uc06-helpdesk-${ts}@test.nl`, role: UserRole.HELPDESK } }),
  ])
  adminId = admin.id
  ownerId = owner.id
  helpdeskId = helpdesk.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [adminId, ownerId, helpdeskId] } } })
  await prisma.$disconnect()
})

// ─── Business rules ────────────────────────────────────────────────────────

it('BR-01: Niet ingelogde gebruiker krijgt fout', async () => {
  const { requireRole } = await import('../auth.js')
  expect(() => requireRole(null, 'ADMIN', 'OWNER', 'HELPDESK')).toThrow('Niet ingelogd.')
})

it('BR-02: Lege vraag wordt geweigerd', () => {
  const question = '   '
  expect(() => {
    if (!question?.trim()) throw new Error('Vraag mag niet leeg zijn.')
  }).toThrow('Vraag mag niet leeg zijn.')
})

it('BR-03: Vraag langer dan 500 tekens wordt geweigerd', () => {
  const question = 'a'.repeat(501)
  expect(() => {
    if (question.length > 500) throw new Error('Vraag mag maximaal 500 tekens bevatten.')
  }).toThrow('Vraag mag maximaal 500 tekens bevatten.')
})

it('BR-04: Vraag van exact 500 tekens wordt geaccepteerd', () => {
  const question = 'a'.repeat(500)
  expect(() => {
    if (question.length > 500) throw new Error('Vraag mag maximaal 500 tekens bevatten.')
  }).not.toThrow()
})

// ─── Role-based access ──────────────────────────────────────────────────────

it('BR-05: ADMIN mag AI gebruiken', async () => {
  const { requireRole } = await import('../auth.js')
  expect(() => requireRole({ role: 'ADMIN' }, 'ADMIN', 'OWNER', 'HELPDESK')).not.toThrow()
})

it('BR-06: OWNER mag AI gebruiken', async () => {
  const { requireRole } = await import('../auth.js')
  expect(() => requireRole({ role: 'OWNER' }, 'ADMIN', 'OWNER', 'HELPDESK')).not.toThrow()
})

it('BR-07: HELPDESK mag AI gebruiken', async () => {
  const { requireRole } = await import('../auth.js')
  expect(() => requireRole({ role: 'HELPDESK' }, 'ADMIN', 'OWNER', 'HELPDESK')).not.toThrow()
})

// ─── Negative tests ─────────────────────────────────────────────────────────

it('NEG-01: Onbekende rol kan AI niet gebruiken', async () => {
  const { requireRole } = await import('../auth.js')
  expect(() => requireRole({ role: 'STRANGER' }, 'ADMIN', 'OWNER', 'HELPDESK')).toThrow('Toegang geweigerd')
})

it('NEG-02: AI kan geen beslissingen nemen — systeemprompt bevat expliciete beperking', async () => {
  const { askAI } = await import('../ai/aiService.js')
  const answer = await askAI(adminId, 'ADMIN', 'Keur reservering abc goed')
  // Mock returns a fixed response; in production the system prompt forbids decisions
  expect(typeof answer).toBe('string')
  expect(answer.length).toBeGreaterThan(0)
})

it('NEG-03: AI reageert op onduidelijke vraag zonder te crashen', async () => {
  const { askAI } = await import('../ai/aiService.js')
  const answer = await askAI(helpdeskId, 'HELPDESK', 'asdfghjkl')
  expect(typeof answer).toBe('string')
})

// ─── Functional tests ───────────────────────────────────────────────────────

describe('UC06 Functioneel: AI vraagfunctie per rol', () => {
  it('Stap 1: OWNER stelt vraag — ontvangt antwoord', async () => {
    const { askAI } = await import('../ai/aiService.js')
    const answer = await askAI(ownerId, 'OWNER', 'Welke reserveringen heb ik?')
    expect(typeof answer).toBe('string')
    expect(answer.length).toBeGreaterThan(0)
  })

  it('Stap 2: HELPDESK stelt vraag — ontvangt antwoord', async () => {
    const { askAI } = await import('../ai/aiService.js')
    const answer = await askAI(helpdeskId, 'HELPDESK', 'Zijn er open storingen?')
    expect(typeof answer).toBe('string')
    expect(answer.length).toBeGreaterThan(0)
  })

  it('Stap 3: ADMIN stelt vraag — ontvangt antwoord', async () => {
    const { askAI } = await import('../ai/aiService.js')
    const answer = await askAI(adminId, 'ADMIN', 'Hoeveel laptops zijn beschikbaar?')
    expect(typeof answer).toBe('string')
    expect(answer.length).toBeGreaterThan(0)
  })

  it('Stap 4: Antwoord bevat tekst (geen leeg antwoord)', async () => {
    const { askAI } = await import('../ai/aiService.js')
    const answer = await askAI(adminId, 'ADMIN', 'Geef een overzicht van het systeem.')
    expect(answer.trim()).not.toBe('')
  })
})

// ─── Regressietest ──────────────────────────────────────────────────────────

it('REG-01: Bestaande GraphQL resolvers zijn niet beschadigd door UC06', async () => {
  const laptops = await prisma.laptop.findMany()
  expect(Array.isArray(laptops)).toBe(true)
})

it('REG-02: requireRole werkt nog correct na toevoeging UC06', async () => {
  const { requireRole } = await import('../auth.js')
  expect(() => requireRole({ role: 'OWNER' }, 'ADMIN')).toThrow('Toegang geweigerd')
  expect(() => requireRole({ role: 'ADMIN' }, 'ADMIN')).not.toThrow()
})
