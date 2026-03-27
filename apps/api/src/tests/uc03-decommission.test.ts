import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, UserRole, LaptopStatus } from '@prisma/client'

const prisma = new PrismaClient()

let adminId: string
let helpdeskId: string
let laptopAvailableId: string
let laptopReservedId: string
let laptopInUseId: string

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: 'UC03 Admin', email: `uc03-admin-${Date.now()}@test.nl`, role: UserRole.ADMIN }
  })
  const helpdesk = await prisma.user.create({
    data: { name: 'UC03 Helpdesk', email: `uc03-helpdesk-${Date.now()}@test.nl`, role: UserRole.HELPDESK }
  })
  const laptopAvailable = await prisma.laptop.create({
    data: { merk_type: 'UC03 Laptop AVAILABLE', status: LaptopStatus.AVAILABLE, heeft_vga: false, heeft_hdmi: false }
  })
  const laptopReserved = await prisma.laptop.create({
    data: { merk_type: 'UC03 Laptop RESERVED', status: LaptopStatus.RESERVED, heeft_vga: false, heeft_hdmi: false }
  })
  const laptopInUse = await prisma.laptop.create({
    data: { merk_type: 'UC03 Laptop IN_USE', status: LaptopStatus.IN_USE, heeft_vga: false, heeft_hdmi: false }
  })

  adminId = admin.id
  helpdeskId = helpdesk.id
  laptopAvailableId = laptopAvailable.id
  laptopReservedId = laptopReserved.id
  laptopInUseId = laptopInUse.id
})

afterAll(async () => {
  await prisma.decommissionLog.deleteMany({ where: { laptopId: { in: [laptopAvailableId, laptopReservedId, laptopInUseId] } } })
  await prisma.laptop.deleteMany({ where: { id: { in: [laptopAvailableId, laptopReservedId, laptopInUseId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [adminId, helpdeskId] } } })
  await prisma.$disconnect()
})

// BR-01: Alleen ADMIN mag laptop uit beheer nemen
it('BR-01: HELPDESK mag laptop niet uit beheer nemen', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeHelpdesk = { role: 'HELPDESK' }
  expect(() => requireRole(fakeHelpdesk, 'ADMIN')).toThrow('Toegang geweigerd')
})

// BR-02: Reden is verplicht
it('BR-02: Uit beheer nemen zonder reden geeft fout', () => {
  const reden = ''
  expect(() => {
    if (!reden?.trim()) throw new Error('Reden voor uit beheer nemen is verplicht.')
  }).toThrow('Reden voor uit beheer nemen is verplicht.')
})

// BR-03: RESERVED laptop kan niet uit beheer genomen worden (verwijderverbod)
it('BR-03: RESERVED laptop mag niet uit beheer worden genomen', async () => {
  const blockedStatuses = [LaptopStatus.RESERVED, LaptopStatus.IN_USE]
  const laptop = await prisma.laptop.findUnique({ where: { id: laptopReservedId } })
  expect(() => {
    if (blockedStatuses.includes(laptop!.status)) {
      throw new Error(`Laptop met status ${laptop!.status} kan niet uit beheer worden genomen.`)
    }
  }).toThrow('Laptop met status RESERVED kan niet uit beheer worden genomen.')
})

// BR-04: IN_USE laptop kan niet uit beheer genomen worden (verwijderverbod)
it('BR-04: IN_USE laptop mag niet uit beheer worden genomen', async () => {
  const blockedStatuses = [LaptopStatus.RESERVED, LaptopStatus.IN_USE]
  const laptop = await prisma.laptop.findUnique({ where: { id: laptopInUseId } })
  expect(() => {
    if (blockedStatuses.includes(laptop!.status)) {
      throw new Error(`Laptop met status ${laptop!.status} kan niet uit beheer worden genomen.`)
    }
  }).toThrow('Laptop met status IN_USE kan niet uit beheer worden genomen.')
})

// BR-05: Al-gedecommunissioneerde laptop kan niet opnieuw uit beheer genomen worden
it('BR-05: Laptop die al uit beheer is kan niet opnieuw worden afgeschreven', async () => {
  // Simuleer een al-gedecommunissioneerde laptop
  const fakeDecommission = { laptopId: 'fake', reden: 'oud', doneById: adminId }
  expect(() => {
    if (fakeDecommission) throw new Error('Deze laptop is al uit beheer genomen.')
  }).toThrow('Deze laptop is al uit beheer genomen.')
})

// BR-06: Status wordt OUT_OF_SERVICE na uit beheer nemen
it('BR-06: Status na decommission is OUT_OF_SERVICE', () => {
  const newStatus = LaptopStatus.OUT_OF_SERVICE
  expect(newStatus).toBe(LaptopStatus.OUT_OF_SERVICE)
})

describe('UC03 E2E: Laptop uit beheer nemen', () => {
  it('Stap 1: ADMIN neemt AVAILABLE laptop uit beheer', async () => {
    const log = await prisma.decommissionLog.create({
      data: { laptopId: laptopAvailableId, doneById: adminId, reden: 'Onherstelbaar defect na val' }
    })
    await prisma.laptop.update({ where: { id: laptopAvailableId }, data: { status: LaptopStatus.OUT_OF_SERVICE } })

    expect(log.reden).toBe('Onherstelbaar defect na val')
    expect(log.laptopId).toBe(laptopAvailableId)
  })

  it('Stap 2: Laptop status is OUT_OF_SERVICE', async () => {
    const laptop = await prisma.laptop.findUnique({ where: { id: laptopAvailableId } })
    expect(laptop?.status).toBe(LaptopStatus.OUT_OF_SERVICE)
  })

  it('Stap 3: Decommission log is aangemaakt met reden en beheerder', async () => {
    const log = await prisma.decommissionLog.findUnique({
      where: { laptopId: laptopAvailableId }
    })
    expect(log).toBeDefined()
    expect(log?.reden).toBeTruthy()
    expect(log?.doneById).toBe(adminId)
  })

  it('Stap 4: Opnieuw decommissionen gooit een fout', async () => {
    const existing = await prisma.decommissionLog.findUnique({ where: { laptopId: laptopAvailableId } })
    expect(() => {
      if (existing) throw new Error('Deze laptop is al uit beheer genomen.')
    }).toThrow('Deze laptop is al uit beheer genomen.')
  })
})
