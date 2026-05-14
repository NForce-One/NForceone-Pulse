import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/user.model.js";

// 🔐 Generate Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "secretkey",
    { expiresIn: "1d" }
  );
};

// ================= REGISTER =================
export const registerUser = async (data) => {
  const { name, email, password, role } = data;

  if (role === "ADMIN") {
    throw new Error("Admin cannot be registered from UI");
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;

  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must be at least 6 characters, include 1 uppercase and 1 special character"
    );
  }

  const existingUser = await User.findOne({
    where: { email },
    attributes: ["id"],
  });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "EMPLOYEE",
  });

  return {
    message: "User registered successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// ================= LOGIN =================
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email },
    attributes: ["id", "name", "email", "password", "role", "department", "managerId", "isActive", "defaultHours"],
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    throw new Error("Account is deactivated. Contact admin.");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// ================= FORGOT PASSWORD =================
export const forgotPassword = async (email) => {
  console.log("FORGOT PASSWORD EMAIL:", email);

  const user = await User.findOne({
    where: { email },
    attributes: ["id", "name", "email", "resetToken", "resetTokenExpiry"],
  });

  if (!user) {
    return {
      message: "Password reset link sent if email is registered",
    };
  }

  // Generate token
  const rawToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  user.resetToken = hashedToken;
  user.resetTokenExpiry = Date.now() + 3600000;

  await user.save();

  const resetLink = `http://localhost:5173/reset-password/${rawToken}`;

  console.log("RESET LINK:", resetLink);

  try {
    // MAILTRAP CONFIG
    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "37e4fe872234d2",
        pass: "d67805ef218d17",
      },
    });

    await transporter.sendMail({
      from: `"NForce Pulse" <no-reply@nforce.com>`,
      to: user.email,
      subject: "Reset Password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
      `,
    });

    console.log("EMAIL SENT SUCCESSFULLY");

  } catch (err) {
    console.log("EMAIL ERROR:", err.message);
  }

  return {
    message: "Password reset link sent if email is registered",
  };
};

// ================= RESET PASSWORD =================
export const resetPassword = async (token, password) => {

  console.log("RAW TOKEN:", token);

  const hashedToken = crypto
    .createHash("sha256")
    .update(token.trim())
    .digest("hex");

  console.log("HASHED TOKEN:", hashedToken);

  const user = await User.findOne({
    where: { resetToken: hashedToken },
    attributes: ["id", "password", "resetToken", "resetTokenExpiry"],
  });

  if (!user) {
    throw new Error("Invalid or expired token");
  }

  if (user.resetTokenExpiry < Date.now()) {
    throw new Error("Token expired");
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;

  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must be at least 6 characters, include 1 uppercase and 1 special character"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;
  user.resetToken = null;
  user.resetTokenExpiry = null;

  await user.save();

  return {
    message: "Password reset successful"
  };
};