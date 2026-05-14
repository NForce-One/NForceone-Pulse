import express from "express";
import {
  getEmployeeHoursReport,
  getProjectHoursReport,
  getUtilizationReport,
  getBillingSummary,
  getTimesheetStatusReport,
  getDashboardStats,
  getHourDetails,
  exportReport,
} from "../controllers/report.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/dashboard", protect, getDashboardStats);
router.get("/dashboard/hour-details", protect, getHourDetails);
router.get("/employee-hours", protect, getEmployeeHoursReport);
router.get("/project-hours", protect, getProjectHoursReport);
router.get("/utilization", protect, getUtilizationReport);
router.get("/billing-summary", protect, getBillingSummary);
router.get("/timesheet-status", protect, getTimesheetStatusReport);
router.get("/export", protect, exportReport);

export default router;
