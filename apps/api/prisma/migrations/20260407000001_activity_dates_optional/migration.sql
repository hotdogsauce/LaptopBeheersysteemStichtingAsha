-- AlterTable: make activity dates optional
ALTER TABLE "Activity" ALTER COLUMN "start_datum_tijd" DROP NOT NULL;
ALTER TABLE "Activity" ALTER COLUMN "eind_datum_tijd" DROP NOT NULL;
