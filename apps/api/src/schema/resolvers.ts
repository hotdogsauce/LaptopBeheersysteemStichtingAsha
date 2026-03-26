import { requireRole } from '../auth'
import { PrismaClient, LaptopStatus, ReservationStatus } from '@prisma/client'

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
  MISSING:        [],
}

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
  },

  
 Mutation: {
    createLaptop: (_: any, args: any, { user }: any) => {
      requireRole(user, 'ADMIN', 'HELPDESK')
      return prisma.laptop.create({ data: args })
    },

   requestReservation: async (_: any, { userId, activityId, startDate, endDate }: any, { user }: any) => {
      requireRole(user, 'OWNER')
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
      return prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: approve ? ReservationStatus.APPROVED : ReservationStatus.REJECTED,
          approverId: adminId,
          rejectionReason: reason ?? null,
        },
        include: { activity: true, requester: true, approver: true, laptops: true }
      })
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
      return prisma.laptop.update({ where: { id: laptopId }, data: { status } })
    },
  },

  Reservation: {
    activity: (parent: any) => prisma.activity.findUnique({ where: { id: parent.activityId } }),
    requester: (parent: any) => prisma.user.findUnique({ where: { id: parent.requesterId } }),
    approver: (parent: any) => parent.approverId ? prisma.user.findUnique({ where: { id: parent.approverId } }) : null,
    laptops: (parent: any) => prisma.laptop.findMany({ where: { reservations: { some: { id: parent.id } } } }),
  }
}