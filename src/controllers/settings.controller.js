import * as settingsService from "../services/settings.service.js";

export const getSettings = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const settings = await settingsService.getSettingsByDeviceId(deviceId);
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const dataToUpdate = req.body;
    const updatedSettings = await settingsService.updateSettingsByDeviceId(
      deviceId,
      dataToUpdate
    );
    res.status(200).json({
      message: "Settings updated successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
};
