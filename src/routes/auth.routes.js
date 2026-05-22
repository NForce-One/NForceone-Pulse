import express from "express";
import { 
  register, 
  login, 
  forgotPasswordHandler, 
  resetPasswordHandler,
  getManagers
} from "../controllers/auth.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// ================= REGISTER (Admin Only) =================
router.post("/register", protect, authorizeRoles("ADMIN"), register);

// ================= LOGIN =================
router.post("/login", login);

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", forgotPasswordHandler);

// ================= RESET PASSWORD =================
router.post("/reset-password", resetPasswordHandler);

// ================= GET MANAGERS (🔥 NEW) =================
router.get("/managers", protect, getManagers);

export default router;