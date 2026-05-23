import express from "express";
import {
  getTimesheets,
  getTimesheet,
  generateTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  commentTimesheet,
  withdrawTimesheet,
  getApprovalHistory,
  getTeamTimesheets,
  getFilteredTimeEntries,
} from "../controllers/timesheet.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// ================= GET TEAM TIMESHEETS (MANAGER) =================
router.get(
  "/team",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  getTeamTimesheets
);

// ================= GET FILTERED TIME ENTRIES (ADMIN) =================
router.get(
  "/filtered-entries",
  protect,
  authorizeRoles("ADMIN"),
  getFilteredTimeEntries
);

// ================= GET ALL TIMESHEETS =================
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getTimesheets
);

// ================= GENERATE TIMESHEET =================
router.post(
  "/generate",
  protect,
  authorizeRoles("EMPLOYEE"),
  generateTimesheet
);

// ================= GET SINGLE TIMESHEET =================
router.get(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getTimesheet
);

// ================= SUBMIT TIMESHEET =================
router.put(
  "/:id/submit",
  protect,
  authorizeRoles("EMPLOYEE"),
  submitTimesheet
);

// ================= APPROVE TIMESHEET =================
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  approveTimesheet
);

// ================= REJECT TIMESHEET =================
router.put(
  "/:id/reject",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  rejectTimesheet
);

// ================= COMMENT TIMESHEET =================
router.put(
  "/:id/comment",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  commentTimesheet
);

// ================= WITHDRAW TIMESHEET =================
router.put(
  "/:id/withdraw",
  protect,
  authorizeRoles("EMPLOYEE"),
  withdrawTimesheet
);

// ================= GET APPROVAL HISTORY =================
router.get(
  "/:id/history",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getApprovalHistory
);

export default router;
