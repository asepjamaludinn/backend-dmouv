import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export async function getNotifications(req, res) {
  const nofs = await prisma.notification.findMany();
  res.json(nofs);
}
export async function createNotification(req, res) {
  const { deviceId, type, title, message } = req.body;
  const newNof = await prisma.notification.create({
    data: { deviceId, type, title, message }
  });
  res.json(newNof);
}
