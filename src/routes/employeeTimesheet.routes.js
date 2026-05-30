import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getClients,
  getProjectsByClient,
  getManagerByProject,
  getWeeklyTimesheet,
  saveDraftTimesheet,
  submitTimesheet,
  updateTimesheet,
  deleteProjectEntries,
  getManagerAction,
} from "../controllers/employeeTimesheet.controller.js";

const router = express.Router();

router.get("/clients", protect, getClients);
router.get("/projects/:clientId", protect, getProjectsByClient);
router.get("/managers/:projectId", protect, getManagerByProject);
router.get("/weekly", protect, getWeeklyTimesheet);
router.post("/save", protect, saveDraftTimesheet);
router.post("/submit", protect, submitTimesheet);
router.put("/update", protect, updateTimesheet);
router.get("/manager-action/:timesheetId", protect, getManagerAction);
router.delete("/project/:projectId/week/:weekStartDate", protect, deleteProjectEntries);

export default router;
