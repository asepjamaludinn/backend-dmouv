/*
  Warnings:

  - You are about to drop the column `reset_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `token_expires` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "reset_token",
DROP COLUMN "token_expires";
