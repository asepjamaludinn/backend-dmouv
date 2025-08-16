-- CreateEnum
CREATE TYPE "public"."DeviceType" AS ENUM ('light', 'camera');

-- CreateEnum
CREATE TYPE "public"."DeviceStatus" AS ENUM ('online', 'offline', 'connecting', 'error');

-- CreateEnum
CREATE TYPE "public"."TriggerType" AS ENUM ('motion_detected', 'manual', 'scheduled', 'system');

-- CreateEnum
CREATE TYPE "public"."LightStatus" AS ENUM ('on', 'off');

-- CreateEnum
CREATE TYPE "public"."LightAction" AS ENUM ('turned_on', 'turned_off');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('motion_detected', 'light_status', 'scheduled_reminder', 'device_offline', 'device_online');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "profile_pict" VARCHAR(500),
    "reset_token" VARCHAR(255),
    "token_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devices" (
    "id" UUID NOT NULL,
    "device_name" VARCHAR(100) NOT NULL,
    "device_type" "public"."DeviceType" NOT NULL DEFAULT 'camera',
    "status" "public"."DeviceStatus" NOT NULL DEFAULT 'offline',
    "ip_address" VARCHAR(50) NOT NULL,
    "wifi_ssid" VARCHAR(100) NOT NULL,
    "wifi_password" VARCHAR(255) NOT NULL,
    "last_seen" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_mode_enabled" BOOLEAN NOT NULL DEFAULT true,
    "schedule_on_time" TIME,
    "schedule_off_time" TIME,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sensor_history" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "trigger_type" "public"."TriggerType" NOT NULL,
    "light_status" "public"."LightStatus" NOT NULL,
    "light_action" "public"."LightAction" NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensor_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_reads" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "settings_device_id_key" ON "public"."settings"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_reads_notification_id_user_id_key" ON "public"."notification_reads"("notification_id", "user_id");

-- AddForeignKey
ALTER TABLE "public"."settings" ADD CONSTRAINT "settings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sensor_history" ADD CONSTRAINT "sensor_history_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_reads" ADD CONSTRAINT "notification_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
