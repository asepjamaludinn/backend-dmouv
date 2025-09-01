import express from "express";
import multer from "multer";
import { authenticateToken, authorizeSuperuser } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import { registerValidation, loginValidation } from "../utils/validation.js";
import * as authController from "../controllers/auth.controller.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diizinkan!"), false);
    }
  },
});

// @desc    Create new user by a Super User
// @access  Private (SUPERUSER ONLY)

router.post(
  "/create-user",
  authenticateToken,
  authorizeSuperuser,
  registerValidation,
  validateRequest,
  authController.createUser
);

// @desc    Login user
router.post("/login", loginValidation, validateRequest, authController.login);

// @desc    Forgot password
router.post("/forgot-password", authController.forgotPassword);

// @desc    Get user profile
router.get("/profile", authenticateToken, authController.getProfile);

// @desc    Update user profile (username & password)
router.put("/profile", authenticateToken, authController.updateProfile);

// @desc    Upload user profile picture
router.post(
  "/upload-profile-picture",
  authenticateToken,
  upload.single("profilePict"),
  authController.uploadProfilePicture
);

export default router;
