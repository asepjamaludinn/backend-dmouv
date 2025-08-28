import { prisma } from "../config/database.js";
import { io } from "./socket.service.js";
import { createNotification } from "./notification.service.js";
import { publish } from "./mqtt.service.js";

/**
 * @param {string} ipAddress Alamat IP perangkat.
 * @param {string} status Status baru ('online' atau 'offline').
 */
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

/**
 * @param {string} deviceId ID perangkat.
 * @param {string} action Aksi yang dilaporkan ('turn_on' atau 'turn_off').
 * @param {string} triggerType Pemicu aksi ('motion_detected' atau 'scheduled').
 */
export const recordAutonomousAction = async (deviceId, action, triggerType) => {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    console.error(`[RecordAction] Device with ID ${deviceId} not found.`);
    return;
  }

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

  const actionText = action === "turn_on" ? "dinyalakan" : "dimatikan";
  let notificationDetails = {};

  if (triggerType === "motion_detected") {
    notificationDetails = {
      type: "motion_detected",
      title: "Gerakan Terdeteksi!",
      message: `Sistem mendeteksi gerakan, ${device.deviceName} telah ${actionText}.`,
    };
  }

  if (notificationDetails.title) {
    try {
      await createNotification(
        deviceId,
        notificationDetails.type,
        notificationDetails.title,
        notificationDetails.message
      );
    } catch (error) {
      console.error(
        `Failed to create notification for device ${deviceId}. Error: ${error.message}`
      );
    }
  }

  io?.emit("device_operational_status_updated", {
    deviceId: device.id,
    operationalStatus: status,
  });

  console.log(
    `✅ RECORDED: Action '${action}' for device '${device.deviceName}' triggered by '${triggerType}'`
  );
};

/**
 * @param {string} ipAddress Alamat IP perangkat yang melaporkan.
 */
export const handleMotionDetection = async (ipAddress) => {
  const devices = await prisma.device.findMany({
    where: { ipAddress, setting: { autoModeEnabled: true } },
  });

  for (const device of devices) {
    await recordAutonomousAction(device.id, "turn_on", "motion_detected");
  }
};

/**
 * @param {string} ipAddress Alamat IP perangkat yang melaporkan.
 */
export const handleMotionCleared = async (ipAddress) => {
  const devices = await prisma.device.findMany({
    where: { ipAddress, setting: { autoModeEnabled: true } },
  });

  for (const device of devices) {
    await recordAutonomousAction(device.id, "turn_off", "motion_detected");
  }
};

/**
 * @param {string} deviceId ID perangkat yang akan dikontrol.
 * @param {string} action Aksi yang akan dilakukan ('turn_on' atau 'turn_off').
 * @param {string} triggerType Pemicu aksi ('manual', 'scheduled').
 * @returns {Promise<object>} State perangkat setelah aksi.
 */
export const executeDeviceAction = async (deviceId, action, triggerType) => {
  const finalDeviceState = await prisma.$transaction(async (tx) => {
    const device = await tx.device.findUnique({
      where: { id: deviceId },
      include: { setting: true },
    });
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found.`);
    }

    const isLamp = device.deviceTypes.includes("lamp");
    const isFan = device.deviceTypes.includes("fan");
    const status = action === "turn_on" ? "on" : "off";
    const statusAction = action === "turn_on" ? "turned_on" : "turned_off";

    await tx.sensorHistory.create({
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

    if (triggerType === "manual") {
      const updatedSettings = await tx.setting.update({
        where: { deviceId: deviceId },
        data: {
          autoModeEnabled: false,
          scheduleEnabled: false,
        },
        include: { device: true },
      });
      io?.emit("settings_updated", updatedSettings);
    }

    const actionTopic = `iot/${device.ipAddress}/action`;
    const actionPayload = JSON.stringify({
      device: device.deviceTypes[0],
      action: action,
    });

    publish(actionTopic, actionPayload);
    console.log(
      `📡 PUBLISH: Mengirim aksi '${action}' ke topik ${actionTopic}`
    );

    io?.emit("device_operational_status_updated", {
      deviceId: device.id,
      operationalStatus: status,
    });

    console.log(
      `Action '${action}' executed for device '${device.deviceName}' triggered by '${triggerType}'`
    );

    return tx.device.findUnique({
      where: { id: deviceId },
      include: { setting: true },
    });
  });

  const actionText = action === "turn_on" ? "dinyalakan" : "dimatikan";
  let notificationDetails = {};

  switch (triggerType) {
    case "scheduled":
      notificationDetails = {
        type: "scheduled_reminder",
        title: "Jadwal Dijalankan",
        message: `${finalDeviceState.deviceName} telah ${actionText} secara otomatis sesuai jadwal.`,
      };
      break;
    case "manual":
      notificationDetails = {
        type: "device_status_change",
        title: "Aksi Manual Pengguna",
        message: `Perangkat ${finalDeviceState.deviceName} telah ${actionText} oleh pengguna. Mode otomatis dan jadwal kini dinonaktifkan.`,
      };
      break;
  }

  if (notificationDetails.title) {
    try {
      await createNotification(
        deviceId,
        notificationDetails.type,
        notificationDetails.title,
        notificationDetails.message
      );
    } catch (error) {
      console.error(
        `Failed to create notification for device ${deviceId}. Error: ${error.message}`
      );
    }
  }

  return finalDeviceState;
};
