import express from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ======================
   CREATE PROJECT (ADMIN)
====================== */
router.post("/", protect, authorizeRoles("ADMIN"), createProject);

/* ======================
   GET ALL PROJECTS (ALL ROLES)
====================== */
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getProjects
);

/* ======================
   GET SINGLE PROJECT (ALL ROLES)
====================== */
router.get(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getProject
);

/* ======================
   UPDATE PROJECT (ADMIN + MANAGER)
====================== */
router.put(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  updateProject
);

/* ======================
   DELETE PROJECT (ADMIN ONLY)
====================== */
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteProject);

export default router;