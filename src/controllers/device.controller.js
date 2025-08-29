import * as deviceService from "../services/device.service.js";
import * as deviceControlService from "../services/device.control.service.js";

export const onboardDevice = async (req, res, next) => {
  try {
    const { devices_id } = req.body;

    const result = await deviceService.onboardNewDevices({
      deviceId:devices_id,
      brokerUrl:process.env.MQTT_HOST,
      port:process.env.MQTT_PORT
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
