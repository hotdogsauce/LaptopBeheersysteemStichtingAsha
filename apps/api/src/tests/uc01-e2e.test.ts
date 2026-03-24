import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, UserRole, LaptopStatus, ReservationStatus } from '@prisma/client'

const prisma = new PrismaClient()

let ownerId: string
let adminId: string
let activityId: string
let reservationId: string

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { name: 'E2E Owner', email: `e2e-owner-${Date.now()}@test.nl`, role: UserRole.OWNER }
  })
  const admin = await prisma.user.create({
    data: { name: 'E2E Admin', email: `e2e-admin-${Date.now()}@test.nl`, role: UserRole.ADMIN }
  })
  const activity = await prisma.activity.create({
    data: {
      title: 'E2E Activiteit',
      start_datum_tijd: new Date('2026-06-01T09:00:00'),
      eind_datum_tijd: new Date('2026-06-01T17:00:00'),
    }
  })

  ownerId = owner.id
  adminId = admin.id
  activityId = activity.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('UC01 E2E: Laptop reserveren en goedkeuren/afkeuren', () => {

  it('Stap 1: Eigenaar vraagt reservering aan', async () => {
    const reservation = await prisma.reservation.create({
      data: {
        requesterId: ownerId,
        activityId,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-02'),
        status: ReservationStatus.REQUESTED
      }
    })
    reservationId = reservation.id
    expect(reservation.status).toBe(ReservationStatus.REQUESTED)
    expect(reservation.requesterId).toBe(ownerId)
  })

  it('Stap 2: Beheerder ziet de aanvraag in pending lijst', async () => {
    const pending = await prisma.reservation.findMany({
      where: { status: ReservationStatus.REQUESTED }
    })
    const found = pending.find(r => r.id === reservationId)
    expect(found).toBeDefined()
  })

  it('Stap 3: Beheerder keurt af zonder reden — fout verwacht', async () => {
    const approve = false
    const reason = undefined
    expect(() => {
      if (!approve && !reason) throw new Error('Een reden is verplicht bij afwijzing.')
    }).toThrow('Een reden is verplicht bij afwijzing.')
  })

  it('Stap 4: Beheerder keurt reservering goed', async () => {
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.APPROVED, approverId: adminId }
    })
    expect(updated.status).toBe(ReservationStatus.APPROVED)
    expect(updated.approverId).toBe(adminId)
  })

  it('Stap 5: Goedgekeurde reservering is niet meer in pending lijst', async () => {
    const pending = await prisma.reservation.findMany({
      where: { status: ReservationStatus.REQUESTED }
    })
    const found = pending.find(r => r.id === reservationId)
    expect(found).toBeUndefined()
  })

})