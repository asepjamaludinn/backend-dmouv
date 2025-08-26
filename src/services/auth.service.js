import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { prisma } from "../config/database.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

export const createUserByUser = async (userData) => {
  const { username, email, password, role } = userData;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existingUser) {
    const error = new Error(
      existingUser.email === email
        ? "Email already registered"
        : "Username already taken"
    );
    error.status = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword, role: role },
    select: { id: true, username: true, email: true, createdAt: true },
  });

  return { user };
};

export const loginUser = async (credentials) => {
  const { email, password } = credentials;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error("Email or password is incorrect");
    error.status = 401;
    throw error;
  }

  const token = generateToken(user.id);
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const resetPassword = async (data) => {
  const { email, newPassword } = data;

  if (!email || !newPassword || newPassword.length < 8) {
    const error = new Error("Email and a valid new password are required");
    error.status = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error("No account found with this email address.");
    error.status = 404;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });
};

export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  return user;
};

export const updateUserProfile = async (userId, updateData) => {
  const dataToUpdate = {};
  if (updateData.username) {
    dataToUpdate.username = updateData.username;
  }
  if (updateData.password) {
    dataToUpdate.password = await bcrypt.hash(updateData.password, 12);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: {
      id: true,
      username: true,
      email: true,
      profilePict: true,
      updatedAt: true,
    },
  });
  return updatedUser;
};

export const uploadProfilePic = async (userId, file, token) => {
  try {
    const metadata = await sharp(file.buffer).metadata();
    const maxWidth = 2048;
    const maxHeight = 2048;

    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      const error = new Error(
        `Image dimensions must not exceed ${maxWidth}x${maxHeight} pixels.`
      );
      error.status = 400;
      throw error;
    }
  } catch (e) {
    const error = new Error(e.message || "Invalid image file provided.");
    error.status = 400;
    throw error;
  }

  const fileExtension = file.originalname.split(".").pop();
  const fileName = `${uuidv4()}.${fileExtension}`;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePict: true },
  });
  if (user?.profilePict) {
    const oldFileName = user.profilePict.split("/").pop();
    const oldFilePath = `${oldFileName}`;
    await supabase.storage.from("profile-pictures").remove([oldFilePath]);
  }

  const { error: uploadError } = await supabase.storage
    .from("profile-pictures")
    .upload(fileName, file.buffer, { contentType: file.mimetype });

  if (uploadError) {
    console.error("Supabase Upload Error:", uploadError.message);
    throw new Error("Failed to upload image to storage");
  }

  const { data: urlData } = supabase.storage
    .from("profile-pictures")
    .getPublicUrl(fileName);
  const fileUrl = urlData.publicUrl;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { profilePict: fileUrl },
    select: {
      id: true,
      username: true,
      email: true,
      profilePict: true,
      updatedAt: true,
    },
  });

  return { user: updatedUser, imageUrl: fileUrl };
};
