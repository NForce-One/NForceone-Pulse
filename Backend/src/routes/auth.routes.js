import express from "express";
import { 
  register, 
  login, 
  forgotPasswordHandler, 
  resetPasswordHandler,
  getManagers // ✅ ADD THIS
} from "../controllers/auth.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// ================= EXISTING =================
router.post("/register", protect, authorizeRoles("ADMIN"), register);
router.post("/login", login);

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", forgotPasswordHandler);

// ================= RESET PASSWORD =================
router.post("/reset-password", resetPasswordHandler);

// ================= GET MANAGERS (🔥 NEW) =================
router.get("/managers", getManagers);

export default router;