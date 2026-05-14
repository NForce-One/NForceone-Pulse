import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sequelize from "./config/db.js";
import cron from "node-cron";
import * as notificationService from "./services/notification.service.js";

// ✅ Load models (IMPORTANT for Sequelize - ORDER MATTERS!)
import "./models/user.model.js";
import "./models/client.model.js";
import "./models/project.model.js";
import "./models/task.model.js";
import "./models/timeEntry.model.js";
import "./models/timer.model.js";
import "./models/timesheet.model.js";
import "./models/approvalHistory.model.js";
import "./models/notification.model.js";
import "./models/auditLog.model.js";
import "./models/billingRate.model.js";
import "./models/projectUser.model.js";

// Import models for associations
import User from "./models/user.model.js";
import Client from "./models/client.model.js";
import Project from "./models/project.model.js";
import Task from "./models/task.model.js";
import TimeEntry from "./models/timeEntry.model.js";
import Timer from "./models/timer.model.js";
import Timesheet from "./models/timesheet.model.js";
import ApprovalHistory from "./models/approvalHistory.model.js";
import Notification from "./models/notification.model.js";
import AuditLog from "./models/auditLog.model.js";
import BillingRate from "./models/billingRate.model.js";
import ProjectUser from "./models/projectUser.model.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import clientRoutes from "./routes/client.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import timeEntryRoutes from "./routes/timeEntry.routes.js";
import timerRoutes from "./routes/timer.routes.js";
import timesheetRoutes from "./routes/timesheet.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import reportRoutes from "./routes/report.routes.js";

// Middleware
import { protect, authorizeRoles } from "./middleware/auth.middleware.js";

dotenv.config();

// 🔥 MODEL ASSOCIATIONS
Project.belongsTo(Client, { foreignKey: "clientId" });
Client.hasMany(Project, { foreignKey: "clientId" });

Project.belongsTo(User, { as: "Manager", foreignKey: "managerId" });
User.hasMany(Project, { as: "ManagedProjects", foreignKey: "managerId" });

Task.belongsTo(Project, { foreignKey: "projectId" });
Project.hasMany(Task, { foreignKey: "projectId" });

TimeEntry.belongsTo(Client, { foreignKey: "clientId" });
Client.hasMany(TimeEntry, { foreignKey: "clientId" });

TimeEntry.belongsTo(Project, { foreignKey: "projectId" });
Project.hasMany(TimeEntry, { foreignKey: "projectId" });

TimeEntry.belongsTo(Task, { foreignKey: "taskId" });
Task.hasMany(TimeEntry, { foreignKey: "taskId" });

TimeEntry.belongsTo(User, { foreignKey: "userId" });
User.hasMany(TimeEntry, { foreignKey: "userId", as: "TimeEntries" });

Timer.belongsTo(Client, { foreignKey: "clientId" });
Timer.belongsTo(Project, { foreignKey: "projectId" });
Timer.belongsTo(Task, { foreignKey: "taskId" });

Timesheet.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Timesheet, { foreignKey: "userId" });

ApprovalHistory.belongsTo(User, { as: "Actor", foreignKey: "actorId" });
User.hasMany(ApprovalHistory, { as: "ApprovalActions", foreignKey: "actorId" });

ApprovalHistory.belongsTo(TimeEntry, { foreignKey: "timeEntryId" });
TimeEntry.hasMany(ApprovalHistory, { foreignKey: "timeEntryId" });

Notification.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Notification, { foreignKey: "userId" });

AuditLog.belongsTo(User, { foreignKey: "userId" });
User.hasMany(AuditLog, { foreignKey: "userId" });

BillingRate.belongsTo(User, { foreignKey: "userId" });
BillingRate.belongsTo(Project, { foreignKey: "projectId" });

ProjectUser.belongsTo(Project, { foreignKey: "projectId" });
ProjectUser.belongsTo(User, { foreignKey: "userId" });
Project.belongsToMany(User, { through: ProjectUser, foreignKey: "projectId" });
User.belongsToMany(Project, { through: ProjectUser, foreignKey: "userId" });

const app = express();

/* ======================
   GLOBAL MIDDLEWARE
====================== */

// 🔥 VERY IMPORTANT FIX (CORS)
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"], // frontend URL
  credentials: true
}));

app.use(express.json());

/* ======================
   HEALTH CHECK ROUTE
====================== */
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

/* ======================
   AUTH ROUTES
====================== */
app.use("/api/auth", authRoutes);

/* ======================
   USER ROUTES (ADMIN)
====================== */
app.use("/api/users", userRoutes);

/* ======================
   CLIENT ROUTES
====================== */
app.use("/api/clients", clientRoutes);

/* ======================
   PROJECT ROUTES
====================== */
app.use("/api/projects", projectRoutes);

/* ======================
   TASK ROUTES
====================== */
app.use("/api/tasks", taskRoutes);

/* ======================
    TIME ENTRY ROUTES
====================== */
app.use("/api/time-entries", timeEntryRoutes);

/* ======================
    TIMER ROUTES
====================== */
app.use("/api/timers", timerRoutes);

/* ======================
    TIMESHEET ROUTES
====================== */
app.use("/api/timesheets", timesheetRoutes);

/* ======================
    NOTIFICATION ROUTES
====================== */
app.use("/api/notifications", notificationRoutes);

/* ======================
    REPORT ROUTES
====================== */
app.use("/api/reports", reportRoutes);

/* ======================
   PROTECTED TEST ROUTE
====================== */
app.get("/api/test", protect, (req, res) => {
  res.json({
    success: true,
    message: "Protected route accessed ✅",
    user: req.user,
  });
});

/* ======================
   ROLE-BASED TEST ROUTES
====================== */

// ADMIN ONLY
app.get(
  "/api/admin",
  protect,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin 👑",
      user: req.user,
    });
  }
);

// MANAGER + ADMIN
app.get(
  "/api/manager",
  protect,
  authorizeRoles("MANAGER", "ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Manager 👨‍💼",
      user: req.user,
    });
  }
);

/* ======================
   404 HANDLER
====================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found ❌",
  });
});

/* ======================
   GLOBAL ERROR HANDLER
====================== */
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong ❌",
  });
});

/* ======================
   SERVER START
====================== */
const startServer = async () => {
  try {
    await sequelize.authenticate();

    // Using sync without alter to avoid "too many keys" error
    // The notification model is already correctly defined
    await sequelize.sync();

    // ================= SCHEDULED NOTIFICATION JOBS =================

    // Check missing daily entries at 9:00 AM every day
    cron.schedule("0 9 * * *", async () => {
      await notificationService.checkMissingDailyEntries();
    });

    // Check weekly pending submissions on Friday at 5:00 PM
    cron.schedule("0 17 * * 5", async () => {
      await notificationService.checkWeeklyPendingSubmissions();
    });

    // Check pending approvals for managers every Monday at 10:00 AM
    cron.schedule("0 10 * * 1", async () => {
      const managers = await (async () => {
        const User = (await import("./models/user.model.js")).default;
        return await User.findAll({ where: { role: "MANAGER", isActive: true } });
      })();

      const TimeEntry = (await import("./models/timeEntry.model.js")).default;
      const { Op } = await import("sequelize");

      for (const mgr of managers) {
        const pendingCount = await TimeEntry.count({
          where: { managerId: mgr.id, status: "SUBMITTED" },
        });
        if (pendingCount > 0) {
          await notificationService.notifyPendingApprovals(mgr.id, pendingCount);
        }
      }
    });

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
       console.log(`Server running on port ${PORT} 🚀`);
     });

  } catch (error) {
    console.error("Startup error", error);
  }
};

startServer();