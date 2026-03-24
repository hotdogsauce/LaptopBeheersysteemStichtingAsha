bm-- CreateEnum
CREATE TYPE "LaptopStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_USE', 'IN_CONTROL', 'DEFECT', 'OUT_OF_SERVICE', 'MISSING');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'HELPDESK');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laptop" (
    "id" TEXT NOT NULL,
    "status" "LaptopStatus" NOT NULL DEFAULT 'AVAILABLE',
    "merk_type" TEXT NOT NULL,
    "specificaties" TEXT,
    "heeft_vga" BOOLEAN NOT NULL DEFAULT false,
    "heeft_hdmi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Laptop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_datum_tijd" TIMESTAMP(3) NOT NULL,
    "eind_datum_tijd" TIMESTAMP(3) NOT NULL,
    "omschrijving" TEXT,
    "locatie" TEXT,
    "software_benodigdheden" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'REQUESTED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rejectionReason" TEXT,
    "aanvraag_datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterId" TEXT NOT NULL,
    "approverId" TEXT,
    "activityId" TEXT NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ReservationLaptops" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_ReservationLaptops_AB_unique" ON "_ReservationLaptops"("A", "B");

-- CreateIndex
CREATE INDEX "_ReservationLaptops_B_index" ON "_ReservationLaptops"("B");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReservationLaptops" ADD CONSTRAINT "_ReservationLaptops_A_fkey" FOREIGN KEY ("A") REFERENCES "Laptop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReservationLaptops" ADD CONSTRAINT "_ReservationLaptops_B_fkey" FOREIGN KEY ("B") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
