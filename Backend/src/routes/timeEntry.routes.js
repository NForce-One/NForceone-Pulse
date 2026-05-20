import express from "express";
import {
  createTimeEntry,
  getTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  submitTimeEntry,
  approveTimeEntry,
  rejectTimeEntry,
  commentTimeEntry,
} from "../controllers/timeEntry.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// ================= CREATE =================
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  createTimeEntry
);

// ================= GET ALL =================
// ✅ FIX: allow employee but backend should filter their own entries
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getTimeEntries
);

// ================= UPDATE =================
router.put(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  updateTimeEntry
);

// ================= DELETE =================
router.delete(
  "/:id",
  protect,
  //authorizeRoles("ADMIN", "EMPLOYEE"),
  authorizeRoles("ADMIN", "EMPLOYEE", "MANAGER"),
  deleteTimeEntry
);

// ================= SUBMIT =================
router.put(
  "/:id/submit",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  submitTimeEntry
);

// ================= APPROVE =================
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  approveTimeEntry
);

// ================= COMMENT =================
router.put(
  "/:id/comment",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  commentTimeEntry
);

// ================= REJECT =================
router.put(
  "/:id/reject",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  rejectTimeEntry
);

export default router;