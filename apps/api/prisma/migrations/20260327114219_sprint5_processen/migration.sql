-- CreateEnum
CREATE TYPE "SoftwareRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "laptopId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolvedById" TEXT,
    "solution" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistReport" (
    "id" TEXT NOT NULL,
    "laptopId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "geenSchade" BOOLEAN NOT NULL,
    "geenBestanden" BOOLEAN NOT NULL,
    "schoongemaakt" BOOLEAN NOT NULL,
    "accuOk" BOOLEAN NOT NULL,
    "updatesOk" BOOLEAN NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecommissionLog" (
    "id" TEXT NOT NULL,
    "laptopId" TEXT NOT NULL,
    "doneById" TEXT NOT NULL,
    "reden" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecommissionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "beschrijving" TEXT,
    "status" "SoftwareRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "requesterId" TEXT NOT NULL,
    "approverId" TEXT,
    "activityId" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoftwareRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DecommissionLog_laptopId_key" ON "DecommissionLog"("laptopId");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistReport" ADD CONSTRAINT "ChecklistReport_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistReport" ADD CONSTRAINT "ChecklistReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecommissionLog" ADD CONSTRAINT "DecommissionLog_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecommissionLog" ADD CONSTRAINT "DecommissionLog_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareRequest" ADD CONSTRAINT "SoftwareRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareRequest" ADD CONSTRAINT "SoftwareRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareRequest" ADD CONSTRAINT "SoftwareRequest_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
