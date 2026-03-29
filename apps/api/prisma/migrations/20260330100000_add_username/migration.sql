-- Add username column (derive from email prefix for existing rows)
ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = split_part(email, '@', 1) WHERE "username" IS NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");

-- Make email optional
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
