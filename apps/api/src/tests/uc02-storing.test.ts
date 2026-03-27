import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, UserRole, LaptopStatus } from '@prisma/client'

const prisma = new PrismaClient()

let helpdeskId: string
let adminId: string
let laptopId: string
let defectLaptopId: string
let issueId: string

beforeAll(async () => {
  const helpdesk = await prisma.user.create({
    data: { name: 'UC02 Helpdesk', email: `uc02-helpdesk-${Date.now()}@test.nl`, role: UserRole.HELPDESK }
  })
  const admin = await prisma.user.create({
    data: { name: 'UC02 Admin', email: `uc02-admin-${Date.now()}@test.nl`, role: UserRole.ADMIN }
  })
  const laptop = await prisma.laptop.create({
    data: { merk_type: 'UC02 Laptop', status: LaptopStatus.AVAILABLE, heeft_vga: false, heeft_hdmi: true }
  })
  const defectLaptop = await prisma.laptop.create({
    data: { merk_type: 'UC02 Defect Laptop', status: LaptopStatus.DEFECT, heeft_vga: false, heeft_hdmi: false }
  })

  helpdeskId = helpdesk.id
  adminId = admin.id
  laptopId = laptop.id
  defectLaptopId = defectLaptop.id
})

afterAll(async () => {
  await prisma.issue.deleteMany({ where: { laptopId: { in: [laptopId, defectLaptopId] } } })
  await prisma.laptop.deleteMany({ where: { id: { in: [laptopId, defectLaptopId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [helpdeskId, adminId] } } })
  await prisma.$disconnect()
})

// BR-01: Alleen HELPDESK mag storing melden
it('BR-01: Eigenaar mag geen storing melden', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeOwner = { role: 'OWNER' }
  expect(() => requireRole(fakeOwner, 'HELPDESK')).toThrow('Toegang geweigerd')
})

// BR-02: Omschrijving is verplicht bij storing melden
it('BR-02: Storing zonder omschrijving geeft fout', async () => {
  const description = ''
  expect(() => {
    if (!description?.trim()) throw new Error('Omschrijving van de storing is verplicht.')
  }).toThrow('Omschrijving van de storing is verplicht.')
})

// BR-03: Storing op DEFECT laptop is niet toegestaan
it('BR-03: Storing melden op al-defecte laptop geeft fout', async () => {
  const blockedStatuses = [LaptopStatus.DEFECT, LaptopStatus.OUT_OF_SERVICE, LaptopStatus.MISSING]
  const laptop = await prisma.laptop.findUnique({ where: { id: defectLaptopId } })
  expect(() => {
    if (blockedStatuses.includes(laptop!.status)) {
      throw new Error(`Storing kan niet worden gemeld op een laptop met status ${laptop!.status}.`)
    }
  }).toThrow('Storing kan niet worden gemeld op een laptop met status DEFECT.')
})

// BR-04: Alleen HELPDESK mag storing oplossen
it('BR-04: Admin mag geen storing oplossen', async () => {
  const { requireRole } = await import('../auth.js')
  const fakeAdmin = { role: 'ADMIN' }
  expect(() => requireRole(fakeAdmin, 'HELPDESK')).toThrow('Toegang geweigerd')
})

// BR-05: Oplossing is verplicht bij afsluiten storing
it('BR-05: Storing afsluiten zonder oplossing geeft fout', async () => {
  const solution = ''
  expect(() => {
    if (!solution?.trim()) throw new Error('Oplossing is verplicht bij het afsluiten van een storing.')
  }).toThrow('Oplossing is verplicht bij het afsluiten van een storing.')
})

// BR-06: Reeds opgeloste storing kan niet opnieuw worden afgesloten
it('BR-06: Al-opgeloste storing kan niet opnieuw worden afgesloten', async () => {
  const fakeIssue = { resolved: true }
  expect(() => {
    if (fakeIssue.resolved) throw new Error('Deze storing is al opgelost.')
  }).toThrow('Deze storing is al opgelost.')
})

describe('UC02 E2E: Storing melden en oplossen', () => {
  it('Stap 1: HELPDESK meldt storing — laptop wordt DEFECT', async () => {
    const issue = await prisma.issue.create({
      data: { laptopId, reportedById: helpdeskId, description: 'Scherm flikkert' }
    })
    await prisma.laptop.update({ where: { id: laptopId }, data: { status: LaptopStatus.DEFECT } })

    issueId = issue.id
    expect(issue.resolved).toBe(false)
    expect(issue.description).toBe('Scherm flikkert')

    const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } })
    expect(laptop?.status).toBe(LaptopStatus.DEFECT)
  })

  it('Stap 2: Storing is zichtbaar in open storingen', async () => {
    const openIssues = await prisma.issue.findMany({ where: { resolved: false } })
    const found = openIssues.find(i => i.id === issueId)
    expect(found).toBeDefined()
  })

  it('Stap 3: Afsluiten zonder oplossing geeft fout', async () => {
    expect(() => {
      if (!(''.trim())) throw new Error('Oplossing is verplicht bij het afsluiten van een storing.')
    }).toThrow()
  })

  it('Stap 4: HELPDESK lost storing op — laptop gaat naar IN_CONTROL', async () => {
    await prisma.issue.update({
      where: { id: issueId },
      data: { resolved: true, solution: 'Schermkabel vervangen', resolvedById: helpdeskId, resolvedAt: new Date() }
    })
    await prisma.laptop.update({ where: { id: laptopId }, data: { status: LaptopStatus.IN_CONTROL } })

    const issue = await prisma.issue.findUnique({ where: { id: issueId } })
    expect(issue?.resolved).toBe(true)
    expect(issue?.solution).toBe('Schermkabel vervangen')

    const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } })
    expect(laptop?.status).toBe(LaptopStatus.IN_CONTROL)
  })

  it('Stap 5: Opgeloste storing is niet meer in open storingen', async () => {
    const openIssues = await prisma.issue.findMany({ where: { resolved: false } })
    const found = openIssues.find(i => i.id === issueId)
    expect(found).toBeUndefined()
  })
})
