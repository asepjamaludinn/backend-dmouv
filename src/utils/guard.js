import crypto from "crypto";

export const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hashedToken };
};

export const hashResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const validateProfilePictUrl = (url) => {
  if (!url) return true;
  const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
  if (url.length > 500) return false;
  return urlPattern.test(url);
};
