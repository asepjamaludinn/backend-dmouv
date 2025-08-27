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

export const addOrUpdateSchedule = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { day, onTime, offTime } = req.body;

    const schedule = await settingsService.addOrUpdateScheduleByDevice(
      deviceId,
      {
        day,
        onTime,
        offTime,
      }
    );

    res.status(201).json({
      message: `Schedule for ${day} has been successfully saved.`,
      schedule,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSchedule = async (req, res, next) => {
  try {
    const { deviceId, day } = req.params;

    await settingsService.deleteScheduleByDay(deviceId, day);

    res.status(200).json({
      message: `Schedule for ${day} has been successfully deleted.`,
    });
  } catch (error) {
    next(error);
  }
};
