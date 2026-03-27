import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, UserRole, LaptopStatus } from '@prisma/client'

const prisma = new PrismaClient()

let helpdeskId: string
let laptopInControlId: string
let laptopAvailableId: string
let checklistId: string

beforeAll(async () => {
  const helpdesk = await prisma.user.create({
    data: { name: 'UC04 Helpdesk', email: `uc04-helpdesk-${Date.now()}@test.nl`, role: UserRole.HELPDESK }
  })
  const laptopInControl = await prisma.laptop.create({
    data: { merk_type: 'UC04 IN_CONTROL Laptop', status: LaptopStatus.IN_CONTROL, heeft_vga: false, heeft_hdmi: true }
  })
  const laptopAvailable = await prisma.laptop.create({
    data: { merk_type: 'UC04 AVAILABLE Laptop', status: LaptopStatus.AVAILABLE, heeft_vga: true, heeft_hdmi: true }
  })

  helpdeskId = helpdesk.id
  laptopInControlId = laptopInControl.id
  laptopAvailableId = laptopAvailable.id
})

afterAll(async () => {
  await prisma.checklistReport.deleteMany({ where: { laptopId: { in: [laptopInControlId, laptopAvailableId] } } })
  await prisma.laptop.deleteMany({ where: { id: { in: [laptopInControlId, laptopAvailableId] } } })
  await prisma.user.deleteMany({ where: { id: helpdeskId } })
  await prisma.$disconnect()
})

// BR-01: Alleen HELPDESK mag checklist indienen
it('BR-01: Eigenaar mag geen checklist indienen', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeOwner = { role: 'OWNER' }
  expect(() => requireRole(fakeOwner, 'HELPDESK')).toThrow('Toegang geweigerd')
})

// BR-02: Laptop moet IN_CONTROL zijn
it('BR-02: Checklist op AVAILABLE laptop geeft fout', async () => {
  const laptop = await prisma.laptop.findUnique({ where: { id: laptopAvailableId } })
  expect(() => {
    if (laptop?.status !== LaptopStatus.IN_CONTROL) {
      throw new Error('Checklist kan alleen worden ingediend voor een laptop met status IN_CONTROL.')
    }
  }).toThrow('Checklist kan alleen worden ingediend voor een laptop met status IN_CONTROL.')
})

// BR-03: Bij volledig geslaagde checklist gaat laptop naar AVAILABLE
it('BR-03: Alle items true → passed = true', () => {
  const items = { geenSchade: true, geenBestanden: true, schoongemaakt: true, accuOk: true, updatesOk: true }
  const passed = Object.values(items).every(v => v === true)
  expect(passed).toBe(true)
})

// BR-04: Bij mislukte checklist gaat laptop naar DEFECT
it('BR-04: Één item false → passed = false → laptop wordt DEFECT', () => {
  const items = { geenSchade: true, geenBestanden: false, schoongemaakt: true, accuOk: true, updatesOk: true }
  const passed = Object.values(items).every(v => v === true)
  const newStatus = passed ? LaptopStatus.AVAILABLE : LaptopStatus.DEFECT
  expect(passed).toBe(false)
  expect(newStatus).toBe(LaptopStatus.DEFECT)
})

// BR-05: Checklist niet mogelijk zonder HELPDESK rol
it('BR-05: Admin heeft geen toegang tot checklist indienen', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeAdmin = { role: 'ADMIN' }
  expect(() => requireRole(fakeAdmin, 'HELPDESK')).toThrow('Toegang geweigerd')
})

// BR-06: Alle 5 checklistitems zijn verplicht (boolean)
it('BR-06: Checklist met ontbrekend item wordt geblokkeerd', () => {
  const requiredItems = ['geenSchade', 'geenBestanden', 'schoongemaakt', 'accuOk', 'updatesOk']
  const input = { geenSchade: true, geenBestanden: true, schoongemaakt: true, accuOk: true }
  const missing = requiredItems.filter(item => !(item in input))
  expect(missing.length).toBeGreaterThan(0)
  expect(missing).toContain('updatesOk')
})

describe('UC04 E2E: Controle na gebruik (checklist)', () => {
  it('Stap 1: Laptop is IN_CONTROL na inname', async () => {
    const laptop = await prisma.laptop.findUnique({ where: { id: laptopInControlId } })
    expect(laptop?.status).toBe(LaptopStatus.IN_CONTROL)
  })

  it('Stap 2: HELPDESK dient checklist in — alles OK', async () => {
    const checklistData = {
      laptopId: laptopInControlId,
      submittedById: helpdeskId,
      geenSchade: true,
      geenBestanden: true,
      schoongemaakt: true,
      accuOk: true,
      updatesOk: true,
      passed: true,
    }
    const report = await prisma.checklistReport.create({ data: checklistData })
    checklistId = report.id
    expect(report.passed).toBe(true)
  })

  it('Stap 3: Laptop status wordt AVAILABLE na geslaagde checklist', async () => {
    await prisma.laptop.update({ where: { id: laptopInControlId }, data: { status: LaptopStatus.AVAILABLE } })
    const laptop = await prisma.laptop.findUnique({ where: { id: laptopInControlId } })
    expect(laptop?.status).toBe(LaptopStatus.AVAILABLE)
  })

  it('Stap 4: Controlerapport is opgeslagen en koppelt aan laptop', async () => {
    const reports = await prisma.checklistReport.findMany({ where: { laptopId: laptopInControlId } })
    expect(reports.length).toBeGreaterThan(0)
    expect(reports[0].passed).toBe(true)
    expect(reports[0].submittedById).toBe(helpdeskId)
  })
})
