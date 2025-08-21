import * as deviceService from "../services/device.service.js";

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
