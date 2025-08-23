import { prisma } from "../config/database.js";

export const getSensorHistory = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    deviceId,
    triggerType,
    lightStatus,
    lightAction,
    fanStatus,
    fanAction,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = queryParams;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {};
  if (deviceId) whereClause.deviceId = deviceId;
  if (triggerType) whereClause.triggerType = triggerType;
  if (lightStatus) whereClause.lightStatus = lightStatus;
  if (lightAction) whereClause.lightAction = lightAction;
  if (fanStatus) whereClause.fanStatus = fanStatus;
  if (fanAction) whereClause.fanAction = fanAction;

  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
    if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
  }

  const [totalCount, history] = await prisma.$transaction([
    prisma.sensorHistory.count({
      where: whereClause,
    }),
    prisma.sensorHistory.findMany({
      where: whereClause,
      skip,
      take: limitNum,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: { device: true },
    }),
  ]);

  return {
    totalCount,
    history,
    page: pageNum,
    limit: limitNum,
  };
};
