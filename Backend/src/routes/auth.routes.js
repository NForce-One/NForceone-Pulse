import express from "express";
import { 
  login, 
  forgotPasswordHandler, 
  resetPasswordHandler,
  getManagers
} from "../controllers/auth.controller.js";

const router = express.Router();

// ================= LOGIN =================
router.post("/login", login);

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", forgotPasswordHandler);

// ================= RESET PASSWORD =================
router.post("/reset-password", resetPasswordHandler);

// ================= GET MANAGERS (🔥 NEW) =================
router.get("/managers", getManagers);

export default router;