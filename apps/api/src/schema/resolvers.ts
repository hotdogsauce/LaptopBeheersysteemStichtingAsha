import { requireRole } from '../auth.js'
import { checkAiRateLimit, logAudit } from '../utils.js'
import { PrismaClient, LaptopStatus, ReservationStatus, SoftwareRequestStatus } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// Toegestane statusovergangen
const allowedTransitions: Record<string, LaptopStatus[]> = {
  AVAILABLE:      ['RESERVED'],
  RESERVED:       ['IN_USE', 'AVAILABLE'],
  IN_USE:         ['IN_CONTROL'],
  IN_CONTROL:     ['AVAILABLE', 'DEFECT', 'MISSING'],
  DEFECT:         ['OUT_OF_SERVICE'],
  OUT_OF_SERVICE: [],
  MISSING:        ['OUT_OF_SERVICE'],
}

// Statussen waarbij een storing NIET gemeld kan worden
const issueBlockedStatuses: LaptopStatus[] = [
  LaptopStatus.DEFECT,
  LaptopStatus.OUT_OF_SERVICE,
  LaptopStatus.MISSING,
]

// Statussen waarbij een laptop NIET uit beheer genomen mag worden
const decommissionBlockedStatuses: LaptopStatus[] = [
  LaptopStatus.RESERVED,
  LaptopStatus.IN_USE,
]

function checkTransition(current: LaptopStatus, next: LaptopStatus) {
  if (!allowedTransitions[current].includes(next)) {
    throw new Error(`Statusovergang van ${current} naar ${next} is niet toegestaan.`)
  }
}

export const resolvers = {
  Query: {
    laptops: () => prisma.laptop.findMany(),
    laptop: (_: any, { id }: { id: string }) => prisma.laptop.findUnique({ where: { id } }),
    laptopsByStatus: (_: any, { status }: { status: LaptopStatus }) =>
      prisma.laptop.findMany({ where: { status } }),
    laptopDetail: (_: any, { id }: { id: string }) =>
      prisma.laptop.findUnique({
        where: { id },
        include: {
          issues: { include: { reportedBy: true, resolvedBy: true }, orderBy: { createdAt: 'desc' } },
          checklists: { include: { submittedBy: true }, orderBy: { createdAt: 'desc' } },
          reservations: { include: { requester: true, activity: true }, orderBy: { startDate: 'desc' } },
          decommission: { include: { doneBy: true } },
        }
      }),
    myReservations: (_: any, { userId }: { userId: string }) =>
      prisma.reservation.findMany({
        where: { requesterId: userId },
        include: { activity: true, requester: true, approver: true, laptops: true }
      }),
    reservationById: (_: any, { id }: { id: string }) =>
      prisma.reservation.findUnique({
        where: { id },
        include: { activity: true, requester: true, approver: true, laptops: true }
      }),
    pendingReservations: () =>
      prisma.reservation.findMany({
        where: { status: ReservationStatus.REQUESTED },
        include: { activity: true, requester: true, approver: true, laptops: true }
      }),
    users: () => prisma.user.findMany(),
    activities: () => prisma.activity.findMany(),

    // UC-02 Storing
    openIssues: () =>
      prisma.issue.findMany({
        where: { resolved: false },
        include: { laptop: true, reportedBy: true, resolvedBy: true },
        orderBy: { createdAt: 'desc' }
      }),
    issuesByLaptop: (_: any, { laptopId }: { laptopId: string }) =>
      prisma.issue.findMany({
        where: { laptopId },
        include: { laptop: true, reportedBy: true, resolvedBy: true },
        orderBy: { createdAt: 'desc' }
      }),

    // UC-04 Checklist
    checklistsByLaptop: (_: any, { laptopId }: { laptopId: string }) =>
      prisma.checklistReport.findMany({
        where: { laptopId },
        include: { laptop: true, submittedBy: true },
        orderBy: { createdAt: 'desc' }
      }),

    // UC-03 Uit beheer
    decommissionedLaptops: () =>
      prisma.laptop.findMany({
        where: { decommission: { isNot: null } },
        include: { decommission: { include: { doneBy: true } } }
      }),
    decommissionLog: (_: any, { laptopId }: { laptopId: string }) =>
      prisma.decommissionLog.findUnique({
        where: { laptopId },
        include: { laptop: true, doneBy: true }
      }),

    // UC-05 Software aanvraag
    pendingSoftwareRequests: () =>
      prisma.softwareRequest.findMany({
        where: { status: SoftwareRequestStatus.REQUESTED },
        include: { requester: true, approver: true, activity: true },
        orderBy: { createdAt: 'desc' }
      }),
    mySoftwareRequests: (_: any, { userId }: { userId: string }) =>
      prisma.softwareRequest.findMany({
        where: { requesterId: userId },
        include: { requester: true, approver: true, activity: true },
        orderBy: { createdAt: 'desc' }
      }),
  },

  Mutation: {
    login: async (_: any, { email, password }: { email: string; password: string }) => {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user || user.password !== password) throw new Error('E-mailadres of wachtwoord onjuist.')
      return { userId: user.id, name: user.name, role: user.role, email: user.email }
    },

    // Sprint 4
    createLaptop: (_: any, args: any, { user }: any) => {
      requireRole(user, 'ADMIN', 'HELPDESK')
      return prisma.laptop.create({ data: args })
    },

    requestReservation: async (_: any, { userId, activityId, startDate, endDate }: any, { user }: any) => {
      requireRole(user, 'OWNER', 'ADMIN')
      const start = new Date(startDate)
      const now = new Date()
      const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays < 2) throw new Error('Reservering moet minimaal 2 dagen van tevoren worden aangevraagd.')
      if (new Date(endDate) < start) throw new Error('Einddatum mag niet voor startdatum liggen.')
      return prisma.reservation.create({
        data: { requesterId: userId, activityId, startDate: start, endDate: new Date(endDate) },
        include: { activity: true, requester: true, approver: true, laptops: true }
      })
    },

    reviewReservation: async (_: any, { reservationId, adminId, approve, reason }: any, { user }: any) => {
      requireRole(user, 'ADMIN')
      const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } })
      if (!reservation) throw new Error('Reservering niet gevonden.')
      if (reservation.status !== ReservationStatus.REQUESTED) throw new Error('Alleen aanvragen met status REQUESTED kunnen worden gekeurd.')
      if (!approve && !reason) throw new Error('Een reden is verplicht bij afwijzing.')
      const result = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: approve ? ReservationStatus.APPROVED : ReservationStatus.REJECTED,
          approverId: adminId,
          rejectionReason: reason ?? null,
        },
        include: { activity: true, requester: true, approver: true, laptops: true }
      })
      logAudit('reservation_reviewed', { reservationId, adminId, approve, reason: reason ?? null })
      return result
    },

    assignLaptopsToReservation: async (_: any, { reservationId, laptopIds }: any, { user }: any) => {
      requireRole(user, 'HELPDESK')
      const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } })
      if (!reservation) throw new Error('Reservering niet gevonden.')
      if (reservation.status !== ReservationStatus.APPROVED) throw new Error('Reservering moet APPROVED zijn.')
      const laptops = await prisma.laptop.findMany({ where: { id: { in: laptopIds } } })
      if (laptops.some(l => l.status !== LaptopStatus.AVAILABLE)) throw new Error('Alle laptops moeten AVAILABLE zijn.')
      await prisma.laptop.updateMany({ where: { id: { in: laptopIds } }, data: { status: LaptopStatus.RESERVED } })
      return prisma.reservation.update({
        where: { id: reservationId },
        data: { laptops: { connect: laptopIds.map((id: string) => ({ id })) } },
        include: { activity: true, requester: true, approver: true, laptops: true }
      })
    },

    cancelReservation: async (_: any, { reservationId, userId }: any, { user }: any) => {
      requireRole(user, 'OWNER')
      const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } })
      if (!reservation) throw new Error('Reservering niet gevonden.')
      if (reservation.requesterId !== userId) throw new Error('Je kunt alleen je eigen reservering annuleren.')
      if (!['REQUESTED', 'APPROVED'].includes(reservation.status)) throw new Error('Alleen REQUESTED of APPROVED reserveringen kunnen worden geannuleerd.')
      return prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
        include: { activity: true, requester: true, approver: true, laptops: true }
      })
    },

    processReturn: async (_: any, { laptopId, status, maintenanceLog }: any, { user }: any) => {
      requireRole(user, 'HELPDESK')
      const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } })
      if (!laptop) throw new Error('Laptop niet gevonden.')
      if (status === 'DEFECT' && !maintenanceLog) throw new Error('maintenanceLog is verplicht bij status DEFECT.')
      checkTransition(laptop.status, status as LaptopStatus)
      const data: any = { status }
      if (status === 'MISSING') data.missingAt = new Date()
      if (status !== 'MISSING') data.missingAt = null
      const result = await prisma.laptop.update({ where: { id: laptopId }, data })
      logAudit('laptop_status_changed', { laptopId, from: laptop.status, to: status, userId: user.id })
      return result
    },

    // UC-02: Storing melden en oplossen
    reportIssue: async (_: any, { laptopId, description }: any, { user }: any) => {
      requireRole(user, 'HELPDESK')
      if (!description?.trim()) throw new Error('Omschrijving van de storing is verplicht.')
      const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } })
      if (!laptop) throw new Error('Laptop niet gevonden.')
      if (issueBlockedStatuses.includes(laptop.status)) {
        throw new Error(`Storing kan niet worden gemeld op een laptop met status ${laptop.status}.`)
      }
      await prisma.laptop.update({ where: { id: laptopId }, data: { status: LaptopStatus.DEFECT } })
      return prisma.issue.create({
        data: { laptopId, reportedById: user.id, description },
        include: { laptop: true, reportedBy: true, resolvedBy: true }
      })
    },

    resolveIssue: async (_: any, { issueId, solution }: any, { user }: any) => {
      requireRole(user, 'HELPDESK')
      if (!solution?.trim()) throw new Error('Oplossing is verplicht bij het afsluiten van een storing.')
      const issue = await prisma.issue.findUnique({ where: { id: issueId } })
      if (!issue) throw new Error('Storing niet gevonden.')
      if (issue.resolved) throw new Error('Deze storing is al opgelost.')
      await prisma.laptop.update({ where: { id: issue.laptopId }, data: { status: LaptopStatus.IN_CONTROL } })
      return prisma.issue.update({
        where: { id: issueId },
        data: { resolved: true, solution, resolvedById: user.id, resolvedAt: new Date() },
        include: { laptop: true, reportedBy: true, resolvedBy: true }
      })
    },

    // UC-04: Controle na gebruik (checklist)
    submitChecklist: async (_: any, args: any, { user }: any) => {
      requireRole(user, 'HELPDESK')
      const { laptopId, geenSchade, geenBestanden, schoongemaakt, accuOk, updatesOk } = args
      const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } })
      if (!laptop) throw new Error('Laptop niet gevonden.')
      if (laptop.status !== LaptopStatus.IN_CONTROL) {
        throw new Error('Checklist kan alleen worden ingediend voor een laptop met status IN_CONTROL.')
      }
      const passed = geenSchade && geenBestanden && schoongemaakt && accuOk && updatesOk
      const newStatus = passed ? LaptopStatus.AVAILABLE : LaptopStatus.DEFECT
      await prisma.laptop.update({ where: { id: laptopId }, data: { status: newStatus } })
      return prisma.checklistReport.create({
        data: { laptopId, submittedById: user.id, geenSchade, geenBestanden, schoongemaakt, accuOk, updatesOk, passed },
        include: { laptop: true, submittedBy: true }
      })
    },

    // UC-03: Laptop uit beheer nemen
    decommissionLaptop: async (_: any, { laptopId, reden }: any, { user }: any) => {
      requireRole(user, 'ADMIN')
      if (!reden?.trim()) throw new Error('Reden voor uit beheer nemen is verplicht.')
      const laptop = await prisma.laptop.findUnique({ where: { id: laptopId }, include: { decommission: true } })
      if (!laptop) throw new Error('Laptop niet gevonden.')
      if (laptop.decommission) throw new Error('Deze laptop is al uit beheer genomen.')
      if (decommissionBlockedStatuses.includes(laptop.status)) {
        throw new Error(`Laptop met status ${laptop.status} kan niet uit beheer worden genomen.`)
      }
      await prisma.decommissionLog.create({ data: { laptopId, doneById: user.id, reden } })
      return prisma.laptop.update({ where: { id: laptopId }, data: { status: LaptopStatus.OUT_OF_SERVICE } })
    },

    bulkStatusChange: async (_: any, { laptopIds, status }: any, { user }: any) => {
      requireRole(user, 'ADMIN')
      const laptops = await prisma.laptop.findMany({ where: { id: { in: laptopIds } } })
      for (const laptop of laptops) {
        checkTransition(laptop.status, status as LaptopStatus)
      }
      const data: any = { status }
      if (status === 'MISSING') data.missingAt = new Date()
      if (status !== 'MISSING') data.missingAt = null
      await prisma.laptop.updateMany({ where: { id: { in: laptopIds } }, data })
      return prisma.laptop.findMany({ where: { id: { in: laptopIds } } })
    },

    createActivity: async (_: any, args: any, { user }: any) => {
      requireRole(user, 'OWNER', 'ADMIN')
      const { title, start_datum_tijd, eind_datum_tijd, omschrijving, locatie, software_benodigdheden } = args
      if (!title?.trim()) throw new Error('Titel is verplicht.')
      const start = new Date(start_datum_tijd)
      const eind = new Date(eind_datum_tijd)
      if (isNaN(start.getTime())) throw new Error('Ongeldige startdatum.')
      if (eind < start) throw new Error('Einddatum mag niet voor startdatum liggen.')
      return prisma.activity.create({
        data: { title, start_datum_tijd: start, eind_datum_tijd: eind, omschrijving: omschrijving ?? null, locatie: locatie ?? null, software_benodigdheden: software_benodigdheden ?? null }
      })
    },

    createUser: async (_: any, { name, email, password, role, adminPassword }: any, { user }: any) => {
      requireRole(user, 'ADMIN')
      if (!name?.trim()) throw new Error('Naam is verplicht.')
      if (!email?.trim()) throw new Error('E-mailadres is verplicht.')
      if (!password?.trim()) throw new Error('Wachtwoord is verplicht.')
      if (role === 'ADMIN') {
        if (!adminPassword) throw new Error('Jouw wachtwoord is verplicht om een admin aan te maken.')
        const admin = await prisma.user.findUnique({ where: { id: user.id } })
        if (!admin || admin.password !== adminPassword) throw new Error('Wachtwoord onjuist.')
      }
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) throw new Error('Er bestaat al een account met dit e-mailadres.')
      return prisma.user.create({ data: { name, email, password, role } })
    },

    // UC-06: AI ondersteuning
    askAI: async (_: any, { question }: any, { user }: any) => {
      requireRole(user, 'ADMIN', 'OWNER', 'HELPDESK')
      if (!question?.trim()) throw new Error('Vraag mag niet leeg zijn.')
      if (question.length > 500) throw new Error('Vraag mag maximaal 500 tekens bevatten.')
      checkAiRateLimit(user.id)
      logAudit('ai_question', { userId: user.id, role: user.role, questionLength: question.length })
      const { askAI } = await import('../ai/aiService.js')
      return askAI(user.id, user.role, question)
    },

    // UC-05: Software aanvraag
    requestSoftware: async (_: any, { userId, activityId, title, beschrijving }: any, { user }: any) => {
      requireRole(user, 'OWNER')
      if (!title?.trim()) throw new Error('Titel van de softwareaanvraag is verplicht.')
      const activity = await prisma.activity.findUnique({ where: { id: activityId } })
      if (!activity) throw new Error('Activiteit niet gevonden.')
      const diffDays = (activity.start_datum_tijd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays < 2) throw new Error('Softwareaanvraag moet minimaal 2 dagen voor de activiteit worden ingediend.')
      return prisma.softwareRequest.create({
        data: { requesterId: userId, activityId, title, beschrijving: beschrijving ?? null },
        include: { requester: true, approver: true, activity: true }
      })
    },

    reviewSoftwareRequest: async (_: any, { requestId, adminId, approve, reason }: any, { user }: any) => {
      requireRole(user, 'ADMIN')
      const request = await prisma.softwareRequest.findUnique({ where: { id: requestId } })
      if (!request) throw new Error('Softwareaanvraag niet gevonden.')
      if (request.status !== SoftwareRequestStatus.REQUESTED) throw new Error('Alleen aanvragen met status REQUESTED kunnen worden beoordeeld.')
      if (!approve && !reason) throw new Error('Een reden is verplicht bij afwijzing van een softwareaanvraag.')
      const result = await prisma.softwareRequest.update({
        where: { id: requestId },
        data: {
          status: approve ? SoftwareRequestStatus.APPROVED : SoftwareRequestStatus.REJECTED,
          approverId: adminId,
          rejectionReason: reason ?? null,
        },
        include: { requester: true, approver: true, activity: true }
      })
      logAudit('software_request_reviewed', { requestId, adminId, approve, reason: reason ?? null })
      return result
    },
  },

  Reservation: {
    activity: (parent: any) => prisma.activity.findUnique({ where: { id: parent.activityId } }),
    requester: (parent: any) => prisma.user.findUnique({ where: { id: parent.requesterId } }),
    approver: (parent: any) => parent.approverId ? prisma.user.findUnique({ where: { id: parent.approverId } }) : null,
    laptops: (parent: any) => prisma.laptop.findMany({ where: { reservations: { some: { id: parent.id } } } }),
  },

  Issue: {
    laptop: (parent: any) => prisma.laptop.findUnique({ where: { id: parent.laptopId } }),
    reportedBy: (parent: any) => prisma.user.findUnique({ where: { id: parent.reportedById } }),
    resolvedBy: (parent: any) => parent.resolvedById ? prisma.user.findUnique({ where: { id: parent.resolvedById } }) : null,
  },

  ChecklistReport: {
    laptop: (parent: any) => prisma.laptop.findUnique({ where: { id: parent.laptopId } }),
    submittedBy: (parent: any) => prisma.user.findUnique({ where: { id: parent.submittedById } }),
  },

  DecommissionLog: {
    laptop: (parent: any) => prisma.laptop.findUnique({ where: { id: parent.laptopId } }),
    doneBy: (parent: any) => prisma.user.findUnique({ where: { id: parent.doneById } }),
  },

  SoftwareRequest: {
    requester: (parent: any) => prisma.user.findUnique({ where: { id: parent.requesterId } }),
    approver: (parent: any) => parent.approverId ? prisma.user.findUnique({ where: { id: parent.approverId } }) : null,
    activity: (parent: any) => prisma.activity.findUnique({ where: { id: parent.activityId } }),
  },
}
