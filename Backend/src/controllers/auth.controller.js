import { 
  registerUser, 
  loginUser, 
  forgotPassword, 
  resetPassword 
} from "../services/auth.service.js";

import User from "../models/user.model.js"; // ✅ ADD THIS

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const data = await loginUser(req.body);

    res.status(200).json({
      message: "Login successful",
      ...data,
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ================= GET ALL MANAGERS (🔥 NEW FEATURE) =================
export const getManagers = async (req, res) => {
  try {
    const managers = await User.findAll({
      where: { role: "MANAGER", isActive: true },
      attributes: ["id", "name", "email"],
    });

    res.status(200).json({
      success: true,
      data: managers,
    });

  } catch (error) {
    console.error("GET MANAGERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= FORGOT PASSWORD =================
export const forgotPasswordHandler = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("FORGOT PASSWORD EMAIL:", email);

    const result = await forgotPassword(email);

    res.status(200).json(result);

  } catch (error) {
    console.error("FORGOT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= RESET PASSWORD =================
export const resetPasswordHandler = async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log("RESET REQUEST BODY:", req.body);

    if (!token || !password) {
      return res.status(400).json({
        message: "Token and password are required"
      });
    }

    const result = await resetPassword(token, password);

    res.status(200).json(result);

  } catch (error) {
    console.error("RESET ERROR:", error.message);

    res.status(400).json({
      message: error.message || "Reset failed"
    });
  }
};