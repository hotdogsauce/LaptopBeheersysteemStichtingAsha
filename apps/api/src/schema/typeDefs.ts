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

  enum SoftwareRequestStatus {
    REQUESTED
    APPROVED
    REJECTED
  }

  type User {
    id: ID!
    name: String!
    username: String!
    role: UserRole!
    email: String
    avatar: String
  }

  type Drive {
    id: ID!
    letter: String!
    type: String!
    size_gb: Int!
    free_gb: Int!
  }

  input DriveInput {
    letter: String!
    type: String!
    size_gb: Int!
    free_gb: Int!
  }

  type Laptop {
    id: ID!
    status: LaptopStatus!
    merk_type: String!
    specificaties: String
    heeft_vga: Boolean!
    heeft_hdmi: Boolean!
    ram_gb: Int
    heeft_wifi: Boolean!
    wifi_verbonden: Boolean!
    alle_toetsen_werken: Boolean!
    camera_werkt: Boolean!
    microfoon_werkt: Boolean!
    missingAt: String
    drives: [Drive!]!
  }

  type LaptopDetail {
    id: ID!
    merk_type: String!
    status: LaptopStatus!
    specificaties: String
    heeft_vga: Boolean!
    heeft_hdmi: Boolean!
    ram_gb: Int
    heeft_wifi: Boolean!
    wifi_verbonden: Boolean!
    alle_toetsen_werken: Boolean!
    camera_werkt: Boolean!
    microfoon_werkt: Boolean!
    missingAt: String
    drives: [Drive!]!
    issues: [Issue!]!
    checklists: [ChecklistReport!]!
    reservations: [Reservation!]!
    decommission: DecommissionLog
  }

  type Activity {
    id: ID!
    title: String!
    omschrijving: String
    locatie: String
    software_benodigdheden: String
  }

  type Reservation {
    id: ID!
    startDate: String!
    endDate: String!
    status: ReservationStatus!
    aantalLaptops: Int!
    doel: String!
    contact_info: String!
    extra_info: String
    locatie: String
    activity: Activity!
    requester: User!
    approver: User
    laptops: [Laptop]
    rejectionReason: String
  }

  type Issue {
    id: ID!
    laptop: Laptop!
    reportedBy: User!
    description: String!
    resolvedBy: User
    solution: String
    resolved: Boolean!
    createdAt: String!
    resolvedAt: String
  }

  type ChecklistReport {
    id: ID!
    laptop: Laptop!
    submittedBy: User!
    geenSchade: Boolean!
    geenBestanden: Boolean!
    schoongemaakt: Boolean!
    accuOk: Boolean!
    updatesOk: Boolean!
    schijf_type: String
    schijf_grootte: String
    schijf_sneller: String
    ram_totaal: String
    ram_gebruikt: String
    opslag_vrij: String
    opstartprogrammas: String
    energie_ingesteld: Boolean
    wifi_signaal: Int
    ping_ms: Int
    toetsenbord_ok: Boolean
    camera_ok: Boolean
    microfoon_ok: Boolean
    passed: Boolean!
    createdAt: String!
  }

  type DecommissionLog {
    id: ID!
    laptop: Laptop!
    reden: String!
    doneBy: User!
    datum: String!
  }

  type SoftwareRequest {
    id: ID!
    title: String!
    beschrijving: String
    status: SoftwareRequestStatus!
    requester: User!
    approver: User
    activity: Activity!
    rejectionReason: String
    createdAt: String!
  }

  type AuthPayload {
    userId: ID!
    name: String!
    role: UserRole!
    username: String!
    email: String
  }

  type Notification {
    id: ID!
    message: String!
    type: String!
    read: Boolean!
    createdAt: String!
  }

  type AuditLog {
    id: ID!
    event: String!
    userId: String
    details: String!
    createdAt: String!
  }

  type DashboardStats {
    totalLaptops: Int!
    available: Int!
    inUse: Int!
    defect: Int!
    missing: Int!
    oos: Int!
    pendingReservations: Int!
    openIssues: Int!
    totalReservations: Int!
  }

  type Query {
    # Sprint 4
    laptops: [Laptop!]!
    laptop(id: ID!): Laptop
    laptopsByStatus(status: LaptopStatus!): [Laptop!]!
    laptopDetail(id: ID!): LaptopDetail
    myReservations(userId: ID!): [Reservation!]!
    reservationById(id: ID!): Reservation
    pendingReservations: [Reservation!]!
    users: [User!]!
    activities: [Activity!]!

    # Sprint 5 – UC-02 Storing
    openIssues: [Issue!]!
    issuesByLaptop(laptopId: ID!): [Issue!]!
    issuesByUser(userId: ID!): [Issue!]!
    checklistsByUser(userId: ID!): [ChecklistReport!]!

    # Sprint 5 – UC-04 Checklist
    checklistsByLaptop(laptopId: ID!): [ChecklistReport!]!

    # Sprint 5 – UC-03 Uit beheer
    decommissionedLaptops: [Laptop!]!
    decommissionLog(laptopId: ID!): DecommissionLog

    # Sprint 5 – UC-05 Software aanvraag
    pendingSoftwareRequests: [SoftwareRequest!]!
    mySoftwareRequests(userId: ID!): [SoftwareRequest!]!

    approvedReservations: [Reservation!]!
    activeReservations: [Reservation!]!
    availableLaptopCount: Int!

    # Notificaties / audit / dashboard
    notifications: [Notification!]!
    auditLogs(limit: Int): [AuditLog!]!
    dashboardStats: DashboardStats!
  }

  type Mutation {
    login(login: String!, password: String!): AuthPayload

    # Sprint 4
    createLaptop(
      merk_type: String!
      specificaties: String
      heeft_vga: Boolean!
      heeft_hdmi: Boolean!
      ram_gb: Int
      heeft_wifi: Boolean!
      wifi_verbonden: Boolean!
      alle_toetsen_werken: Boolean!
      camera_werkt: Boolean!
      microfoon_werkt: Boolean!
      drives: [DriveInput!]
    ): Laptop!
    requestReservation(userId: ID!, activityId: ID!, startDate: String!, endDate: String!, aantalLaptops: Int!, doel: String!, contact_info: String!, extra_info: String, locatie: String): Reservation
    reviewReservation(reservationId: ID!, adminId: ID!, approve: Boolean!, reason: String): Reservation
    assignLaptopsToReservation(reservationId: ID!, laptopIds: [ID!]!): Reservation
    cancelReservation(reservationId: ID!, userId: ID!): Reservation
    processReturn(laptopId: ID!, status: LaptopStatus!, maintenanceLog: String): Laptop
    bulkStatusChange(laptopIds: [ID!]!, status: LaptopStatus!): [Laptop!]!

    # Sprint 5 – UC-02 Storing melden en oplossen
    reportIssue(laptopId: ID!, description: String!): Issue!
    resolveIssue(issueId: ID!, solution: String!): Issue!

    # Sprint 5 – UC-04 Controle na gebruik (checklist)
    submitChecklist(
      laptopId: ID!
      schijf_type: String
      schijf_grootte: String
      schijf_sneller: String
      ram_totaal: String
      ram_gebruikt: String
      opslag_vrij: String
      opstartprogrammas: String
      energie_ingesteld: Boolean
      wifi_signaal: Int
      ping_ms: Int
      toetsenbord_ok: Boolean!
      camera_ok: Boolean!
      microfoon_ok: Boolean!
    ): ChecklistReport!

    # Sprint 5 – UC-03 Laptop uit beheer nemen
    decommissionLaptop(laptopId: ID!, reden: String!): Laptop!

    # Sprint 5 – UC-05 Software aanvraag
    requestSoftware(userId: ID!, activityId: ID!, title: String!, beschrijving: String): SoftwareRequest!
    reviewSoftwareRequest(requestId: ID!, adminId: ID!, approve: Boolean!, reason: String): SoftwareRequest!

    # Sprint 6 – UC-06 AI ondersteuning
    askAI(question: String!): String!

    changePassword(login: String!, currentPassword: String!, newPassword: String!): Boolean!

    # Uitbreidingen
    createActivity(title: String!, omschrijving: String, locatie: String, software_benodigdheden: String): Activity!
    createUser(name: String!, username: String!, email: String, password: String!, role: UserRole!, adminPassword: String): User!
    updateUser(userId: ID!, name: String, username: String, email: String): User!
    uploadAvatar(userId: ID!, avatar: String!): User!
    deleteAvatar(userId: ID!): User!
    adminResetPassword(userId: ID!, newPassword: String!): Boolean!
    deleteUser(userId: ID!): Boolean!

    markNotificationRead(id: ID!): Boolean!
    markAllNotificationsRead: Boolean!
  }
`
