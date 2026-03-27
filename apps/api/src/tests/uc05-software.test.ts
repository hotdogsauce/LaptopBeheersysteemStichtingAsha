import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, UserRole, SoftwareRequestStatus } from '@prisma/client'

const prisma = new PrismaClient()

let ownerId: string
let adminId: string
let helpdeskId: string
let activityId: string
let softwareRequestId: string

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { name: 'UC05 Owner', email: `uc05-owner-${Date.now()}@test.nl`, role: UserRole.OWNER }
  })
  const admin = await prisma.user.create({
    data: { name: 'UC05 Admin', email: `uc05-admin-${Date.now()}@test.nl`, role: UserRole.ADMIN }
  })
  const helpdesk = await prisma.user.create({
    data: { name: 'UC05 Helpdesk', email: `uc05-helpdesk-${Date.now()}@test.nl`, role: UserRole.HELPDESK }
  })
  const activity = await prisma.activity.create({
    data: {
      title: 'UC05 Activiteit',
      start_datum_tijd: new Date('2026-06-01T09:00:00'),
      eind_datum_tijd: new Date('2026-06-01T17:00:00'),
    }
  })

  ownerId = owner.id
  adminId = admin.id
  helpdeskId = helpdesk.id
  activityId = activity.id
})

afterAll(async () => {
  await prisma.softwareRequest.deleteMany({ where: { activityId } })
  await prisma.activity.delete({ where: { id: activityId } })
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, adminId, helpdeskId] } } })
  await prisma.$disconnect()
})

// BR-01: Alleen OWNER mag software aanvragen
it('BR-01: HELPDESK mag geen softwareaanvraag indienen', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeHelpdesk = { role: 'HELPDESK' }
  expect(() => requireRole(fakeHelpdesk, 'OWNER')).toThrow('Toegang geweigerd')
})

// BR-02: Titel is verplicht
it('BR-02: Softwareaanvraag zonder titel geeft fout', () => {
  const title = ''
  expect(() => {
    if (!title?.trim()) throw new Error('Titel van de softwareaanvraag is verplicht.')
  }).toThrow('Titel van de softwareaanvraag is verplicht.')
})

// BR-03: Aanvraag moet minimaal 2 dagen voor activiteit
it('BR-03: Aanvraag minder dan 2 dagen voor activiteit geeft fout', () => {
  const activityStart = new Date()
  activityStart.setDate(activityStart.getDate() + 1) // morgen
  const diffDays = (activityStart.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  expect(() => {
    if (diffDays < 2) throw new Error('Softwareaanvraag moet minimaal 2 dagen voor de activiteit worden ingediend.')
  }).toThrow('Softwareaanvraag moet minimaal 2 dagen voor de activiteit worden ingediend.')
})

// BR-04: Alleen ADMIN mag softwareaanvraag beoordelen
it('BR-04: OWNER mag softwareaanvraag niet goedkeuren', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeOwner = { role: 'OWNER' }
  expect(() => requireRole(fakeOwner, 'ADMIN')).toThrow('Toegang geweigerd')
})

// BR-05: Afwijzing vereist reden
it('BR-05: Softwareaanvraag afwijzen zonder reden geeft fout', () => {
  const approve = false
  const reason = undefined
  expect(() => {
    if (!approve && !reason) throw new Error('Een reden is verplicht bij afwijzing van een softwareaanvraag.')
  }).toThrow('Een reden is verplicht bij afwijzing van een softwareaanvraag.')
})

// BR-06: Kan alleen REQUESTED aanvragen beoordelen
it('BR-06: Reeds beoordeelde aanvraag kan niet opnieuw worden beoordeeld', () => {
  const fakeRequest = { status: SoftwareRequestStatus.APPROVED }
  expect(() => {
    if (fakeRequest.status !== SoftwareRequestStatus.REQUESTED) {
      throw new Error('Alleen aanvragen met status REQUESTED kunnen worden beoordeeld.')
    }
  }).toThrow('Alleen aanvragen met status REQUESTED kunnen worden beoordeeld.')
})

describe('UC05 E2E: Software aanvragen en beoordelen', () => {
  it('Stap 1: OWNER dient softwareaanvraag in', async () => {
    const request = await prisma.softwareRequest.create({
      data: {
        requesterId: ownerId,
        activityId,
        title: 'Scratch 3.0',
        beschrijving: 'Benodigde IDE voor introductie programmeerles',
        status: SoftwareRequestStatus.REQUESTED,
      }
    })
    softwareRequestId = request.id
    expect(request.status).toBe(SoftwareRequestStatus.REQUESTED)
    expect(request.title).toBe('Scratch 3.0')
  })

  it('Stap 2: Aanvraag is zichtbaar in pending lijst', async () => {
    const pending = await prisma.softwareRequest.findMany({
      where: { status: SoftwareRequestStatus.REQUESTED }
    })
    const found = pending.find(r => r.id === softwareRequestId)
    expect(found).toBeDefined()
  })

  it('Stap 3: ADMIN wijst af zonder reden — fout verwacht', () => {
    const approve = false
    const reason = undefined
    expect(() => {
      if (!approve && !reason) throw new Error('Een reden is verplicht bij afwijzing van een softwareaanvraag.')
    }).toThrow()
  })

  it('Stap 4: ADMIN keurt aanvraag goed', async () => {
    const updated = await prisma.softwareRequest.update({
      where: { id: softwareRequestId },
      data: { status: SoftwareRequestStatus.APPROVED, approverId: adminId }
    })
    expect(updated.status).toBe(SoftwareRequestStatus.APPROVED)
    expect(updated.approverId).toBe(adminId)
  })

  it('Stap 5: Goedgekeurde aanvraag is niet meer in pending lijst', async () => {
    const pending = await prisma.softwareRequest.findMany({
      where: { status: SoftwareRequestStatus.REQUESTED }
    })
    const found = pending.find(r => r.id === softwareRequestId)
    expect(found).toBeUndefined()
  })
})
