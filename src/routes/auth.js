import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  registerValidation,
  loginValidation,
  validateRequest,
} from "../utils/validation.js";
import { validateProfilePictUrl, hashResetToken } from "../utils/guard.js";

const router = express.Router();

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

        resetToken: null,
        tokenExpires: null,
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

// @route   POST /api/auth/reset-password
// @desc    Reset password with token (legacy endpoint)
// @access  Public
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password too weak",
        message: "Password must be at least 8 characters long",
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        error: "Invalid token",
        message: "Reset token is invalid or expired",
      });
    }

    const hashedToken = hashResetToken(token);

    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        resetToken: hashedToken,
        tokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid token",
        message: "Reset token is invalid or expired",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        tokenExpires: null,
      },
    });

    res.json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
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
// @desc    Update user profile
// @access  Private
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { profilePict, password } = req.body;
    const updateData = {};

    if (profilePict !== undefined) {
      if (!validateProfilePictUrl(profilePict)) {
        return res.status(400).json({
          error: "Invalid profile picture URL",
          message:
            "Profile picture must be a valid image URL (jpg, jpeg, png, gif, webp) and under 500 characters",
        });
      }
      updateData.profilePict = profilePict;
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          error: "Password too weak",
          message: "Password must be at least 8 characters long",
        });
      }

      // Hash new password
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
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
