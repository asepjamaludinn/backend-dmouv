-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPERUSER', 'USER');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'USER';
