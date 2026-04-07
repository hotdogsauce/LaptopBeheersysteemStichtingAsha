import { requireRole } from '../auth.js'
import { checkAiRateLimit, logAudit, createNotification, getAdminIds } from '../utils.js'
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
          drives: true,
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

    approvedReservations: (_: any, __: any, { user }: any) => {
      requireRole(user, 'HELPDESK', 'ADMIN')
      return prisma.reservation.findMany({
        where: { status: ReservationStatus.APPROVED },
        include: { activity: true, requester: true, approver: true, laptops: true },
        orderBy: { startDate: 'asc' },
      })
    },

    activeReservations: (_: any, __: any, { user }: any) => {
      requireRole(user, 'OWNER', 'ADMIN', 'HELPDESK')
      return prisma.reservation.findMany({
        where: { status: { in: [ReservationStatus.REQUESTED, ReservationStatus.APPROVED] } },
        include: { activity: true, requester: true, approver: true, laptops: true },
        orderBy: { startDate: 'asc' },
      })
    },

    availableLaptopCount: () => prisma.laptop.count({ where: { status: 'AVAILABLE' } }),

    notifications: (_: any, __: any, { user }: any) => {
      if (!user) return []
      return prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    },

    auditLogs: (_: any, { limit }: { limit?: number }, { user }: any) => {
      requireRole(user, 'ADMIN')
      return prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit ?? 100,
      })
    },

    dashboardStats: async (_: any, __: any, { user }: any) => {
      requireRole(user, 'ADMIN', 'HELPDESK')
      const [
        totalLaptops, available, inUse, defect, missing, oos,
        pendingReservations, openIssues, totalReservations,
      ] = await Promise.all([
        prisma.laptop.count(),
        prisma.laptop.count({ where: { status: 'AVAILABLE' } }),
        prisma.laptop.count({ where: { status: 'IN_USE' } }),
        prisma.laptop.count({ where: { status: 'DEFECT' } }),
        prisma.laptop.count({ where: { status: 'MISSING' } }),
        prisma.laptop.count({ where: { status: 'OUT_OF_SERVICE' } }),
        prisma.reservation.count({ where: { status: 'REQUESTED' } }),
        prisma.issue.count({ where: { resolved: false } }),
        prisma.reservation.count(),
      ])
      return { totalLaptops, available, inUse, defect, missing, oos, pendingReservations, openIssues, totalReservations }
    },

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
    login: async (_: any, { login, password }: { login: string; password: string }) => {
      // Match on username first, fall back to email
      const user = await prisma.user.findFirst({
        where: { OR: [{ username: login }, { email: login }] }
      })
      if (!user || user.password !== password) throw new Error('Gebruikersnaam/e-mail of wachtwoord onjuist.')
      return { userId: user.id, name: user.name, role: user.role, username: user.username, email: user.email }
    },

    // Sprint 4
    createLaptop: async (_: any, args: any, { user }: any) => {
      requireRole(user, 'ADMIN', 'HELPDESK')
      const { drives, ...laptopData } = args
      if (drives) {
        for (const d of drives) {
          if (d.size_gb <= 0) throw new Error(`Schijf ${d.letter}: grootte moet groter dan 0 GB zijn.`)
          if (d.free_gb < 0) throw new Error(`Schijf ${d.letter}: vrije ruimte kan niet negatief zijn.`)
          if (d.free_gb > d.size_gb) throw new Error(`Schijf ${d.letter}: vrije ruimte (${d.free_gb} GB) kan niet groter zijn dan de totale grootte (${d.size_gb} GB).`)
        }
      }
      const laptop = await prisma.laptop.create({ data: laptopData })
      if (drives && drives.length > 0) {
        await prisma.drive.createMany({
          data: drives.map((d: any) => ({ ...d, laptopId: laptop.id }))
        })
      }
      return prisma.laptop.findUnique({ where: { id: laptop.id }, include: { drives: true } })
    },

    requestReservation: async (_: any, { userId, activityId, startDate, endDate, aantalLaptops, doel, contact_info, extra_info, locatie }: any, { user }: any) => {
      requireRole(user, 'OWNER', 'ADMIN')
      const start = new Date(startDate)
      const now = new Date()
      const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      // Date rules only enforced for OWNER (admin can create on behalf without restriction)
      if (user.role === 'OWNER') {
        if (diffDays < 3) throw new Error('Startdatum moet minimaal 3 dagen in de toekomst liggen.')
        if (diffDays > 21) throw new Error('Reserveringen kunnen maximaal 3 weken (21 dagen) van tevoren worden aangevraagd.')
      }
      if (new Date(endDate) < start) throw new Error('Einddatum mag niet voor startdatum liggen.')
      if (!doel?.trim()) throw new Error('Doel van de aanvraag is verplicht.')
      const availableCount = await prisma.laptop.count({ where: { status: 'AVAILABLE' } })
      if (aantalLaptops > availableCount) {
        throw new Error(`Er zijn momenteel slechts ${availableCount} beschikbare laptop(s). Je vroeg om ${aantalLaptops}.`)
      }
      if (!contact_info?.trim()) throw new Error('Contactgegevens zijn verplicht.')
      if (!aantalLaptops || aantalLaptops < 1) throw new Error('Aantal laptops moet minimaal 1 zijn.')
      const res = await prisma.reservation.create({
        data: {
          requesterId: userId, activityId,
          startDate: start, endDate: new Date(endDate),
          aantalLaptops, doel, contact_info,
          extra_info: extra_info ?? null,
          locatie: locatie ?? null,
        },
        include: { activity: true, requester: true, approver: true, laptops: true }
      })
      // Notify all admins
      const adminIds = await getAdminIds()
      for (const aid of adminIds) {
        createNotification(
          aid,
          `Nieuwe reserveringsaanvraag van ${res.requester.name} voor "${res.activity.title}" — ${aantalLaptops} laptop(s), doel: ${doel}.`,
          'INFO'
        )
      }
      return res
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
      // Notify requester
      createNotification(
        result.requesterId,
        approve
          ? `Je reservering voor "${result.activity.title}" is goedgekeurd.`
          : `Je reservering voor "${result.activity.title}" is afgewezen${reason ? ': ' + reason : ''}.`,
        approve ? 'SUCCESS' : 'WARNING'
      )
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
      const {
        laptopId, toetsenbord_ok, camera_ok, microfoon_ok,
        schijf_type, schijf_grootte, schijf_sneller,
        ram_totaal, ram_gebruikt, opslag_vrij,
        opstartprogrammas, energie_ingesteld, wifi_signaal, ping_ms,
      } = args
      const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } })
      if (!laptop) throw new Error('Laptop niet gevonden.')
      if (laptop.status !== LaptopStatus.IN_CONTROL) {
        throw new Error('Checklist kan alleen worden ingediend voor een laptop met status IN_CONTROL.')
      }
      const passed = toetsenbord_ok && camera_ok && microfoon_ok
      const newStatus = passed ? LaptopStatus.AVAILABLE : LaptopStatus.DEFECT
      await prisma.laptop.update({ where: { id: laptopId }, data: { status: newStatus } })
      return prisma.checklistReport.create({
        data: {
          laptopId, submittedById: user.id,
          toetsenbord_ok, camera_ok, microfoon_ok, passed,
          schijf_type: schijf_type ?? null,
          schijf_grootte: schijf_grootte ?? null,
          schijf_sneller: schijf_sneller ?? null,
          ram_totaal: ram_totaal ?? null,
          ram_gebruikt: ram_gebruikt ?? null,
          opslag_vrij: opslag_vrij ?? null,
          opstartprogrammas: opstartprogrammas ?? null,
          energie_ingesteld: energie_ingesteld ?? null,
          wifi_signaal: wifi_signaal ?? null,
          ping_ms: ping_ms ?? null,
        },
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

    changePassword: async (_: any, { login, currentPassword, newPassword }: any) => {
      const user = await prisma.user.findFirst({ where: { OR: [{ username: login }, { email: login }] } })
      if (!user || (user as any).password !== currentPassword) throw new Error('Huidig wachtwoord is onjuist.')
      if (newPassword.length < 6) throw new Error('Nieuw wachtwoord moet minimaal 6 tekens zijn.')
      await prisma.user.update({ where: { id: user.id }, data: { password: newPassword } as any })
      return true
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

    createUser: async (_: any, { name, username, email, password, role, adminPassword }: any, { user }: any) => {
      requireRole(user, 'ADMIN')
      if (!name?.trim()) throw new Error('Naam is verplicht.')
      if (!username?.trim()) throw new Error('Gebruikersnaam is verplicht.')
      if (!password?.trim()) throw new Error('Wachtwoord is verplicht.')
      if (role === 'ADMIN') {
        if (!adminPassword) throw new Error('Jouw wachtwoord is verplicht om een admin aan te maken.')
        const admin = await prisma.user.findUnique({ where: { id: user.id } })
        if (!admin || (admin as any).password !== adminPassword) throw new Error('Wachtwoord onjuist.')
      }
      const existingUsername = await prisma.user.findUnique({ where: { username } })
      if (existingUsername) throw new Error('Er bestaat al een account met deze gebruikersnaam.')
      if (email?.trim()) {
        const existingEmail = await prisma.user.findUnique({ where: { email } })
        if (existingEmail) throw new Error('Er bestaat al een account met dit e-mailadres.')
      }
      return prisma.user.create({ data: { name, username, email: email?.trim() || null, password, role } })
    },

    markNotificationRead: async (_: any, { id }: any, { user }: any) => {
      if (!user) throw new Error('Niet ingelogd.')
      await prisma.notification.update({ where: { id }, data: { read: true } })
      return true
    },

    markAllNotificationsRead: async (_: any, __: any, { user }: any) => {
      if (!user) throw new Error('Niet ingelogd.')
      await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } })
      return true
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
      createNotification(
        result.requesterId,
        approve
          ? `Je softwareaanvraag "${result.title}" is goedgekeurd.`
          : `Je softwareaanvraag "${result.title}" is afgewezen${reason ? ': ' + reason : ''}.`,
        approve ? 'SUCCESS' : 'WARNING'
      )
      return result
    },
  },

  Activity: {
    start_datum_tijd: (parent: any) => parent.start_datum_tijd instanceof Date ? parent.start_datum_tijd.toISOString() : parent.start_datum_tijd,
    eind_datum_tijd:  (parent: any) => parent.eind_datum_tijd  instanceof Date ? parent.eind_datum_tijd.toISOString()  : parent.eind_datum_tijd,
  },

  Reservation: {
    startDate: (parent: any) => parent.startDate instanceof Date ? parent.startDate.toISOString() : parent.startDate,
    endDate:   (parent: any) => parent.endDate   instanceof Date ? parent.endDate.toISOString()   : parent.endDate,
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

  Laptop: {
    drives: (parent: any) => prisma.drive.findMany({ where: { laptopId: parent.id }, orderBy: { letter: 'asc' } }),
  },
}
