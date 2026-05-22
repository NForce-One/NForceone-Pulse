import express from "express";
import {
  getActiveTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  stopTimerAndCreateEntry,
  saveTimerState,
} from "../controllers/timer.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET ACTIVE TIMER
router.get("/active", protect, authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), getActiveTimer);

// START TIMER
router.post("/start", protect, authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), startTimer);

// PAUSE TIMER
router.put("/:id/pause", protect, authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), pauseTimer);

// RESUME TIMER
router.put("/:id/resume", protect, authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), resumeTimer);

// STOP TIMER (without creating entry)
router.put("/:id/stop", protect, authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), stopTimer);

// STOP TIMER AND CREATE TIME ENTRY
router.post("/:id/convert", protect, authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), stopTimerAndCreateEntry);

// AUTO-SAVE TIMER STATE
router.put("/:id/save", protect, authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), saveTimerState);

export default router;
