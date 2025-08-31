import * as deviceService from "../services/device.service.js";
import * as deviceControlService from "../services/device.control.service.js";

export const getDevices = async (req, res, next) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.status(200).json({
      message: "Devices fetched successfully",
      devices: devices,
    });
  } catch (error) {
    next(error);
  }
};

export const onboardDevice = async (req, res, next) => {
  try {
    const { uniqueId } = req.body;

    const result = await deviceService.onboardNewDevices({
      uniqueId: uniqueId,
    });

    if (result.isNew) {
      res.status(201).json({
        message: "Devices onboarded successfully",
        devices: result.devices,
      });
    } else {
      res.status(200).json({
        message: "Devices already registered and are now accessible.",
        devices: result.devices,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const controlDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { action } = req.body;

    const updatedDevice = await deviceControlService.executeDeviceAction(
      deviceId,
      action,
      "manual"
    );

    res.status(200).json({
      message: `Device action '${action}' executed successfully.`,
      device: updatedDevice,
    });
  } catch (error) {
    next(error);
  }
};
