/*
  Warnings:

  - You are about to drop the column `fan_action ` on the `sensor_history` table. All the data in the column will be lost.
  - You are about to drop the column `schedule_off_time` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `schedule_on_time` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_days` on the `settings` table. All the data in the column will be lost.
  - Added the required column `fan_action` to the `sensor_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."sensor_history" DROP COLUMN "fan_action ",
ADD COLUMN     "fan_action" "public"."FanAction" NOT NULL;

-- AlterTable
ALTER TABLE "public"."settings" DROP COLUMN "schedule_off_time",
DROP COLUMN "schedule_on_time",
DROP COLUMN "scheduled_days";

-- CreateTable
CREATE TABLE "public"."schedules" (
    "id" UUID NOT NULL,
    "setting_id" UUID NOT NULL,
    "day" VARCHAR(3) NOT NULL,
    "on_time" VARCHAR(5) NOT NULL,
    "off_time" VARCHAR(5) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedules_setting_id_day_key" ON "public"."schedules"("setting_id", "day");

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "public"."settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
