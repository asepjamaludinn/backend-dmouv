import * as authService from "../services/auth.service.js";

export const createUser = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    const result = await authService.createUserByUser({
      username,
      email,
      password,
      role,
    });

    res.status(201).json({
      message: "User created successfully by admin",
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    await authService.resetPassword({ email, newPassword });
    res.status(200).json({
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await authService.getUserProfile(userId);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    const updatedUser = await authService.updateUserProfile(userId, updateData);
    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Please select an image file to upload");
      error.status = 400;
      throw error;
    }
    const userId = req.user.id;
    const file = req.file;
    const token = req.token;
    const result = await authService.uploadProfilePic(userId, file, token);
    res.status(200).json({
      message: "Profile picture uploaded successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res, next) => {
  res.status(200).json({
    message: "Logout successful. Please remove the token from client storage.",
  });
};
