import { prisma } from "../config/database.js";
import { io } from "./socket.service.js";

export const updateStatusByIp = async (ipAddress, status) => {
  const updatedDevices = await prisma.device.updateMany({
    where: { ipAddress },
    data: { status, lastSeen: new Date() },
  });

  if (updatedDevices.count > 0) {
    const devices = await prisma.device.findMany({ where: { ipAddress } });
    io?.emit("devices_updated", devices);
    console.log(
      `Status updated for ${devices.length} devices at IP ${ipAddress} to ${status}`
    );
  }
};

export const handleMotionDetection = async (ipAddress) => {
  const devices = await prisma.device.findMany({
    where: { ipAddress, setting: { autoModeEnabled: true } },
  });

  for (const device of devices) {
    await executeDeviceAction(device.id, "turn_on", "motion_detected");
  }
};

export const handleMotionCleared = async (ipAddress) => {
  const devices = await prisma.device.findMany({
    where: { ipAddress, setting: { autoModeEnabled: true } },
  });

  for (const device of devices) {
    await executeDeviceAction(device.id, "turn_off", "motion_detected");
  }
};

export const executeDeviceAction = async (deviceId, action, triggerType) => {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error(`Device with ID ${deviceId} not found.`);

  const isLamp = device.deviceTypes.includes("lamp");
  const isFan = device.deviceTypes.includes("fan");
  const status = action === "turn_on" ? "on" : "off";
  const statusAction = action === "turn_on" ? "turned_on" : "turned_off";

  await prisma.sensorHistory.create({
    data: {
      deviceId: device.id,
      triggerType,
      lightStatus: isLamp ? status : "off",
      lightAction: isLamp ? statusAction : "turned_off",
      fanStatus: isFan ? status : "off",
      fanAction: isFan ? statusAction : "turned_off",
      detectedAt: new Date(),
    },
  });

  // TODO: Buat Notifikasi (jika model Notification sudah siap)

  await prisma.device.update({
    where: { id: deviceId },
    data: { status: triggerType === "manual" ? status : device.status },
  });

  const updatedDevice = await prisma.device.findUnique({
    where: { id: deviceId },
  });
  io?.emit("device_status_updated", updatedDevice);

  console.log(
    `Action '${action}' executed for device '${device.deviceName}' triggered by '${triggerType}'`
  );
  return updatedDevice;
};
