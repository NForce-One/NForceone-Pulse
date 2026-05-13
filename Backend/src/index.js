import dotenv from "dotenv";
import cron from "node-cron";
import * as notificationService from "./services/notification.service.js";
import { app, sequelize } from "./app.js";
import User from "./models/user.model.js";
import TimeEntry from "./models/timeEntry.model.js";

dotenv.config();

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