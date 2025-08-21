import * as historyService from "../services/history.service.js";

export const getHistory = async (req, res, next) => {
  try {
    const result = await historyService.getSensorHistory(req.query);

    res.status(200).json({
      message: "Sensor history fetched successfully",
      total: result.totalCount,
      page: result.page,
      limit: result.limit,
      data: result.history,
    });
  } catch (error) {
    next(error);
  }
};
