/*
  Warnings:

  - You are about to drop the column `wifi_password` on the `devices` table. All the data in the column will be lost.
  - You are about to drop the column `wifi_ssid` on the `devices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[unique_id]` on the table `devices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unique_id` to the `devices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."devices" DROP COLUMN "wifi_password",
DROP COLUMN "wifi_ssid",
ADD COLUMN     "unique_id" TEXT NOT NULL,
ALTER COLUMN "ip_address" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "devices_unique_id_key" ON "public"."devices"("unique_id");
