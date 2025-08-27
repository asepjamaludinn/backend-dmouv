import * as deviceService from "../services/device.service.js";
import * as deviceControlService from "../services/device.control.service.js";

export const onboardDevice = async (req, res, next) => {
  try {
    const { ip_address, wifi_ssid, wifi_password } = req.body;

    const result = await deviceService.onboardNewDevices({
      ipAddress: ip_address,
      wifiSsid: wifi_ssid,
      wifiPassword: wifi_password,
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
