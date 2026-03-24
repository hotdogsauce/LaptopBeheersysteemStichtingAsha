export const typeDefs = `
  enum LaptopStatus {
    AVAILABLE
    RESERVED
    IN_USE
    IN_CONTROL
    DEFECT
    OUT_OF_SERVICE
    MISSING
  }

  enum UserRole {
    OWNER
    ADMIN
    HELPDESK
  }

  enum ReservationStatus {
    REQUESTED
    APPROVED
    REJECTED
    CANCELLED
    COMPLETED
  }

  type User {
    id: ID!
    name: String!
    role: UserRole!
    email: String
  }

  type Laptop {
    id: ID!
    status: LaptopStatus!
    merk_type: String!
    specificaties: String
    heeft_vga: Boolean!
    heeft_hdmi: Boolean!
  }

  type Activity {
    id: ID!
    title: String!
    software_benodigdheden: String
  }

  type Reservation {
    id: ID!
    startDate: String!
    endDate: String!
    status: ReservationStatus!
    activity: Activity!
    requester: User!
    approver: User
    laptops: [Laptop]
    rejectionReason: String
  }

  type Query {
    laptops: [Laptop!]!
    laptop(id: ID!): Laptop
    laptopsByStatus(status: LaptopStatus!): [Laptop!]!
    myReservations(userId: ID!): [Reservation!]!
    reservationById(id: ID!): Reservation
    pendingReservations: [Reservation!]!
  }

  type Mutation {
    createLaptop(merk_type: String!, specificaties: String, heeft_vga: Boolean!, heeft_hdmi: Boolean!): Laptop!
    requestReservation(userId: ID!, activityId: ID!, startDate: String!, endDate: String!): Reservation
    reviewReservation(reservationId: ID!, adminId: ID!, approve: Boolean!, reason: String): Reservation
    assignLaptopsToReservation(reservationId: ID!, laptopIds: [ID!]!): Reservation
    cancelReservation(reservationId: ID!, userId: ID!): Reservation
    processReturn(laptopId: ID!, status: LaptopStatus!, maintenanceLog: String): Laptop
  }
`