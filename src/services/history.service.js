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
    search,
  } = queryParams;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {};

  if (deviceId) whereClause.deviceId = deviceId;
  if (triggerType) whereClause.triggerType = triggerType;
  if (lightStatus) whereClause.lightStatus = lightStatus;
  if (fanStatus) whereClause.fanStatus = fanStatus;

  if (lightAction) {
    whereClause.lightAction = lightAction;
    whereClause.device = {
      ...whereClause.device,
      deviceTypes: { has: "lamp" },
    };
  }

  if (fanAction) {
    whereClause.fanAction = fanAction;
    whereClause.device = {
      ...whereClause.device,
      deviceTypes: { has: "fan" },
    };
  }

  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
    if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
  }

  if (search) {
    whereClause.device = {
      ...whereClause.device,
      deviceName: {
        contains: search,
        mode: "insensitive",
      },
    };
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
