import express from "express";
import {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleStatus,
  getMe,
  updateProfile,
  changePassword,
  getTeamMembers,
} from "../controllers/user.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.put("/me/profile", protect, updateProfile);
router.put("/me/change-password", protect, changePassword);

// ================= GET TEAM MEMBERS (MANAGER) =================
// MUST be defined BEFORE /:id or it gets caught as a parameter
router.get(
  "/team-members",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  getTeamMembers
);

router.get("/", protect, authorizeRoles("ADMIN"), getAllUsers);
router.get("/:id", protect, authorizeRoles("ADMIN"), getUser);
router.post("/", protect, authorizeRoles("ADMIN"), createUser);
router.put("/:id", protect, authorizeRoles("ADMIN"), updateUser);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteUser);
router.put("/:id/toggle-status", protect, authorizeRoles("ADMIN"), toggleStatus);

export default router;
