/*
  Warnings:

  - The values [system] on the enum `TriggerType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `device_type` on the `devices` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."TriggerType_new" AS ENUM ('motion_detected', 'manual', 'scheduled');
ALTER TABLE "public"."sensor_history" ALTER COLUMN "trigger_type" TYPE "public"."TriggerType_new" USING ("trigger_type"::text::"public"."TriggerType_new");
ALTER TYPE "public"."TriggerType" RENAME TO "TriggerType_old";
ALTER TYPE "public"."TriggerType_new" RENAME TO "TriggerType";
DROP TYPE "public"."TriggerType_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."devices" DROP COLUMN "device_type";

-- DropEnum
DROP TYPE "public"."DeviceType";
