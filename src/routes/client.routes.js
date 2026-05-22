import express from "express";
import {
  createClient,
  getClients,
  updateClient,
  deleteClient,
} from "../controllers/client.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ======================
   CREATE CLIENT (ADMIN ONLY)
====================== */
router.post("/", protect, authorizeRoles("ADMIN"), createClient);

/* ======================
   GET ALL CLIENTS (ADMIN, MANAGER, EMPLOYEE) ✅ UPDATED
====================== */
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getClients
);

/* ======================
   UPDATE CLIENT (ADMIN + MANAGER ONLY) ✅ FIXED
====================== */
router.put(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  updateClient
);

/* ======================
   DELETE CLIENT (ADMIN ONLY)
====================== */
router.delete(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  deleteClient
);

export default router;