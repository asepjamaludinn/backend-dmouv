import { body, validationResult, query, param } from "express-validator";

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

export const registerValidation = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_ ]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match password");
    }
    return true;
  }),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
];

export const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
];

export const deviceOnboardingValidation = [
  body("ip_address").isIP().withMessage("Please provide a valid IP address"),
  body("wifi_ssid")
    .isLength({ min: 1, max: 100 })
    .withMessage("WiFi SSID must be between 1 and 100 characters"),
  body("wifi_password")
    .isLength({ min: 8, max: 255 })
    .withMessage("WiFi password must be between 8 and 255 characters"),
];

export const getHistoryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("deviceId").optional().isUUID().withMessage("Invalid deviceId format"),
  query("triggerType")
    .optional()
    .isString()
    .withMessage("triggerType must be a string"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be 'asc' or 'desc'"),
];

const timeFormatValidation = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
    throw new Error("Invalid time format. Must be HH:mm (e.g., 08:00)");
  }
  return true;
};

const daysValidation = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  const validDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (!Array.isArray(value)) {
    throw new Error("scheduledDays must be an array");
  }
  const invalidDays = value.filter((day) => !validDays.includes(day));
  if (invalidDays.length > 0) {
    throw new Error(`Invalid days found: ${invalidDays.join(", ")}`);
  }
  return true;
};

export const deviceIdValidation = [
  param("deviceId").isUUID().withMessage("Invalid deviceId format"),
];

export const updateSettingValidation = [
  body("scheduleEnabled")
    .optional()
    .isBoolean()
    .withMessage("scheduleEnabled must be a boolean"),
  body("autoModeEnabled")
    .optional()
    .isBoolean()
    .withMessage("autoModeEnabled must be a boolean"),
  body("scheduleOnTime").optional().custom(timeFormatValidation),
  body("scheduleOffTime").optional().custom(timeFormatValidation),
  body("scheduledDays").optional().custom(daysValidation),
];
