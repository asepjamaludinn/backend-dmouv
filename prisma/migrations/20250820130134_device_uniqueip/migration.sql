/*
  Warnings:

  - The `schedule_on_time` column on the `settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `schedule_off_time` column on the `settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `fan_action ` to the `sensor_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fan_status` to the `sensor_history` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."FanStatus" AS ENUM ('on', 'off');

-- CreateEnum
CREATE TYPE "public"."FanAction" AS ENUM ('turned_on', 'turned_off');

-- AlterTable
ALTER TABLE "public"."devices" ADD COLUMN     "device_types" TEXT[];

-- AlterTable
ALTER TABLE "public"."sensor_history" ADD COLUMN     "fan_action " "public"."FanAction" NOT NULL,
ADD COLUMN     "fan_status" "public"."FanStatus" NOT NULL;

-- AlterTable
ALTER TABLE "public"."settings" DROP COLUMN "schedule_on_time",
ADD COLUMN     "schedule_on_time" VARCHAR(5),
DROP COLUMN "schedule_off_time",
ADD COLUMN     "schedule_off_time" VARCHAR(5);
