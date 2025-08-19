import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { prisma } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  registerValidation,
  loginValidation,
  validateRequest,
} from "../utils/validation.js";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

// @route   POST /api/auth/register
// @desc    Register new user with manual auth
// @access  Public
router.post(
  "/register",
  registerValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { username, email, password } = req.body;

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "User already exists",
          message:
            existingUser.email === email
              ? "Email already registered"
              : "Username already taken",
        });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      });

      const token = generateToken(user.id);

      res.status(201).json({
        message: "User registered successfully",
        user,
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Registration failed",
        message: "An error occurred during registration",
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user with manual auth
// @access  Public
router.post("/login", loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      });
    }

    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: "An error occurred during login",
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Direct password reset with email validation
// @access  Public
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Email and new password are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
        message: "Please enter a valid email address",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password too weak",
        message: "Password must be at least 8 characters long",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        error: "Email not found",
        message:
          "No account found with this email address. Please check your email or register a new account.",
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    res.json({
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      error: "Password reset failed",
      message: "An error occurred while resetting your password",
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        profilePict: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Failed to get profile",
      message: "An error occurred while fetching your profile",
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile (username & password )
// @access  Private
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    const updateData = {};

    if (username) {
      if (username.length < 3) {
        return res.status(400).json({
          error: "Username too short",
          message: "Username must be at least 3 characters long",
        });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: req.user.id },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "Username already taken",
          message: "This username is already in use by another user",
        });
      }

      updateData.username = username;
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          error: "Password too weak",
          message: "Password must be at least 8 characters long",
        });
      }

      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }
    if (!username && !password) {
      return res.status(400).json({
        error: "No data to update",
        message: "Username or password is required for profile update",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        profilePict: true,
        updatedAt: true,
      },
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      error: "Profile update failed",
      message: "An error occurred while updating your profile",
    });
  }
});

// @route   POST /api/auth/upload-profile-picture
// @desc    Upload user profile picture
// @access  Private
router.post(
  "/upload-profile-picture",
  authenticateToken,
  upload.single("profilePict"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          message: "Please select an image file to upload",
        });
      }

      const metadata = await sharp(req.file.buffer).metadata();
      const maxWidth = 2048;
      const maxHeight = 2048;

      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        return res.status(400).json({
          error: "Image too large",
          message: `Image dimensions must not exceed ${maxWidth}x${maxHeight} pixels. Current: ${metadata.width}x${metadata.height}`,
        });
      }

      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = fileName;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { profilePict: true },
      });

      if (user?.profilePict) {
        const oldFileName = user.profilePict.split("/").pop();
        const oldFilePath = `profile-pictures/${oldFileName}`;

        await supabase.storage.from("profile-pictures").remove([oldFilePath]);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({
          error: "Upload failed",
          message: "Failed to upload image to storage",
        });
      }

      const { data: urlData } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { profilePict: fileUrl },
        select: {
          id: true,
          username: true,
          email: true,
          profilePict: true,
          updatedAt: true,
        },
      });

      res.json({
        message: "Profile picture uploaded successfully",
        user: updatedUser,
        imageUrl: fileUrl,
      });
    } catch (error) {
      console.error("Upload profile picture error:", error);

      if (error.message.includes("Only image files")) {
        return res.status(400).json({
          error: "Invalid file type",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Upload failed",
        message: "An error occurred while uploading your profile picture",
      });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    res.json({
      message:
        "Logout successful. Please remove the token from client storage.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: "Logout failed",
      message: "An error occurred during logout",
    });
  }
});

export default router;
