-- Add Drive table
CREATE TABLE "Drive" (
  "id" TEXT NOT NULL,
  "laptopId" TEXT NOT NULL,
  "letter" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "size_gb" INTEGER NOT NULL,
  "free_gb" INTEGER NOT NULL,
  CONSTRAINT "Drive_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Drive_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add new Laptop columns
ALTER TABLE "Laptop" ADD COLUMN "ram_gb" INTEGER;
ALTER TABLE "Laptop" ADD COLUMN "heeft_wifi" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Laptop" ADD COLUMN "wifi_verbonden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Laptop" ADD COLUMN "alle_toetsen_werken" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Laptop" ADD COLUMN "camera_werkt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Laptop" ADD COLUMN "microfoon_werkt" BOOLEAN NOT NULL DEFAULT false;

-- Add defaults to existing ChecklistReport columns (they were NOT NULL without default)
ALTER TABLE "ChecklistReport" ALTER COLUMN "geenSchade" SET DEFAULT false;
ALTER TABLE "ChecklistReport" ALTER COLUMN "geenBestanden" SET DEFAULT false;
ALTER TABLE "ChecklistReport" ALTER COLUMN "schoongemaakt" SET DEFAULT false;
ALTER TABLE "ChecklistReport" ALTER COLUMN "accuOk" SET DEFAULT false;
ALTER TABLE "ChecklistReport" ALTER COLUMN "updatesOk" SET DEFAULT false;

-- Add new ChecklistReport columns
ALTER TABLE "ChecklistReport" ADD COLUMN "schijf_type" TEXT;
ALTER TABLE "ChecklistReport" ADD COLUMN "schijf_grootte" TEXT;
ALTER TABLE "ChecklistReport" ADD COLUMN "schijf_sneller" TEXT;
ALTER TABLE "ChecklistReport" ADD COLUMN "ram_totaal" TEXT;
ALTER TABLE "ChecklistReport" ADD COLUMN "ram_gebruikt" TEXT;
ALTER TABLE "ChecklistReport" ADD COLUMN "opslag_vrij" TEXT;
ALTER TABLE "ChecklistReport" ADD COLUMN "opstartprogrammas" TEXT;
ALTER TABLE "ChecklistReport" ADD COLUMN "energie_ingesteld" BOOLEAN;
ALTER TABLE "ChecklistReport" ADD COLUMN "wifi_signaal" INTEGER;
ALTER TABLE "ChecklistReport" ADD COLUMN "ping_ms" INTEGER;
ALTER TABLE "ChecklistReport" ADD COLUMN "toetsenbord_ok" BOOLEAN;
ALTER TABLE "ChecklistReport" ADD COLUMN "camera_ok" BOOLEAN;
ALTER TABLE "ChecklistReport" ADD COLUMN "microfoon_ok" BOOLEAN;
