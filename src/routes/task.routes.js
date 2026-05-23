import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ======================
   CREATE TASK (ADMIN + MANAGER)
====================== */
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  createTask
);

/* ======================
   GET TASKS (ALL ROLES)
====================== */
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getTasks
);

/* ======================
   UPDATE TASK
   ADMIN + MANAGER → full update
   EMPLOYEE → only status
====================== */
router.put(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  updateTask
);

/* ======================
   DELETE TASK (ADMIN ONLY)
====================== */
router.delete(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  deleteTask
);

export default router;