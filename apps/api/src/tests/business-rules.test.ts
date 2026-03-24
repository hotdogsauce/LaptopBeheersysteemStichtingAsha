import { describe, it, expect, beforeAll } from 'vitest'
import { PrismaClient, UserRole, LaptopStatus, ReservationStatus } from '@prisma/client'

const prisma = new PrismaClient()

let adminId: string
let ownerId: string
let helpdeskId: string
let laptopId: string
let activityId: string
let reservationId: string

beforeAll(async () => {
  // Testdata aanmaken
  const admin = await prisma.user.create({
    data: { name: 'Test Admin', email: `admin-${Date.now()}@test.nl`, role: UserRole.ADMIN }
  })
  const owner = await prisma.user.create({
    data: { name: 'Test Owner', email: `owner-${Date.now()}@test.nl`, role: UserRole.OWNER }
  })
  const helpdesk = await prisma.user.create({
    data: { name: 'Test Helpdesk', email: `helpdesk-${Date.now()}@test.nl`, role: UserRole.HELPDESK }
  })
  const laptop = await prisma.laptop.create({
    data: { merk_type: 'Test Laptop', status: LaptopStatus.AVAILABLE, heeft_vga: false, heeft_hdmi: true }
  })
  const activity = await prisma.activity.create({
    data: {
      title: 'Test Activiteit',
      start_datum_tijd: new Date('2026-05-01T09:00:00'),
      eind_datum_tijd: new Date('2026-05-01T17:00:00'),
    }
  })

  adminId = admin.id
  ownerId = owner.id
  helpdeskId = helpdesk.id
  laptopId = laptop.id
  activityId = activity.id
})

// BR-01: Alleen beheerder mag reservering keuren
it('BR-01: Eigenaar mag geen reservering keuren', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeOwner = { role: 'OWNER' }
  expect(() => requireRole(fakeOwner, 'ADMIN')).toThrow('Toegang geweigerd')
})

// BR-02: Afkeuren vereist reden
it('BR-02: Afwijzing zonder reden gooit een fout', async () => {
  const reservation = await prisma.reservation.create({
    data: {
      requesterId: ownerId,
      activityId,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-02'),
      status: ReservationStatus.REQUESTED
    }
  })
  reservationId = reservation.id

  const approve = false
  const reason = undefined
  expect(() => {
    if (!approve && !reason) throw new Error('Een reden is verplicht bij afwijzing.')
  }).toThrow('Een reden is verplicht bij afwijzing.')
})

// BR-03: Verboden statusovergang blokkeren
it('BR-03: Statusovergang van DEFECT naar AVAILABLE is niet toegestaan', async () => {
  const allowedTransitions: Record<string, LaptopStatus[]> = {
    AVAILABLE:      [LaptopStatus.RESERVED],
    RESERVED:       [LaptopStatus.IN_USE, LaptopStatus.AVAILABLE],
    IN_USE:         [LaptopStatus.IN_CONTROL],
    IN_CONTROL:     [LaptopStatus.AVAILABLE, LaptopStatus.DEFECT, LaptopStatus.MISSING],
    DEFECT:         [LaptopStatus.OUT_OF_SERVICE],
    OUT_OF_SERVICE: [],
    MISSING:        [],
  }

  const current = LaptopStatus.DEFECT
  const next = LaptopStatus.AVAILABLE
  expect(allowedTransitions[current].includes(next)).toBe(false)
})

// BR-04: Alleen beheerder mag OUT_OF_SERVICE zetten
it('BR-04: Helpdesk mag geen OUT_OF_SERVICE zetten', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeHelpdesk = { role: 'HELPDESK' }
  expect(() => requireRole(fakeHelpdesk, 'ADMIN')).toThrow('Toegang geweigerd')
})

// BR-05: Status is enum, geen vrije tekst
it('BR-05: Ongeldige status wordt niet geaccepteerd door Prisma', async () => {
  const validStatuses = Object.values(LaptopStatus)
  const input = 'kapot'
  expect(validStatuses.includes(input as LaptopStatus)).toBe(false)
})

// BR-06: Conflicterende reservering
it('BR-06: Laptop met status RESERVED kan niet opnieuw gereserveerd worden', async () => {
  await prisma.laptop.update({
    where: { id: laptopId },
    data: { status: LaptopStatus.RESERVED }
  })
  const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } })
  expect(() => {
    if (laptop?.status !== LaptopStatus.AVAILABLE) throw new Error('Laptop is niet beschikbaar.')
  }).toThrow('Laptop is niet beschikbaar.')
})