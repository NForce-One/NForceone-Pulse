import User from "../models/user.model.js";
import Timesheet from "../models/timesheet.model.js";
import { sendEmail } from "../services/email.service.js";
import { missingTimesheetReminderTemplate } from "../templates/missingTimesheetReminder.template.js";
import { toDateOnlyString } from "../utils/dateUtils.js";

const getWeekRange = () => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    weekStartStr: toDateOnlyString(weekStart),
    weekEndStr: toDateOnlyString(weekEnd),
  };
};

export const runMissingTimesheetReminder = async () => {
  console.log("[TIMESHEET-REMINDER] ===== Cron Started =====");

  try {
    const { weekStartStr, weekEndStr } = getWeekRange();
    console.log(`[TIMESHEET-REMINDER] Current week: ${weekStartStr} to ${weekEndStr}`);

    const employees = await User.findAll({
      where: { role: "EMPLOYEE", isActive: true },
      include: [
        {
          model: Timesheet,
          where: { weekStartDate: weekStartStr },
          required: false,
          attributes: ["id", "status"],
        },
      ],
      attributes: ["id", "name", "email"],
    });

    console.log(`[TIMESHEET-REMINDER] Found ${employees.length} active employee(s) to check`);

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const emp of employees) {
      const timesheet = emp.Timesheets?.[0];
      const status = timesheet?.status;

      console.log(`[TIMESHEET-REMINDER] Checking Employee: ${emp.name} (${emp.email})`);

      if (!timesheet) {
        console.log(`[TIMESHEET-REMINDER] No timesheet found for ${emp.name} - will send reminder`);
      } else {
        console.log(`[TIMESHEET-REMINDER] Timesheet Found - Status: ${status} for ${emp.name}`);

        if (status === "SUBMITTED" || status === "APPROVED") {
          console.log(`[TIMESHEET-REMINDER] Reminder Skipped for ${emp.name} (status: ${status})`);
          skippedCount++;
          continue;
        }
      }

      try {
        const html = missingTimesheetReminderTemplate({
          employeeName: emp.name,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
        });

        await sendEmail({
          to: emp.email,
          subject: "Reminder: Submit Your Weekly Timesheet",
          html,
        });

        console.log(`[TIMESHEET-REMINDER] Reminder Sent to ${emp.name} (${emp.email})`);
        sentCount++;
      } catch (err) {
        console.error(`[TIMESHEET-REMINDER] Failed to send reminder to ${emp.name} (${emp.email}): ${err.message}`);
        errorCount++;
      }
    }

    console.log(`[TIMESHEET-REMINDER] ===== Cron Completed =====`);
    console.log(`[TIMESHEET-REMINDER] Summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
  } catch (err) {
    console.error(`[TIMESHEET-REMINDER] ===== Cron Failed =====`);
    console.error(`[TIMESHEET-REMINDER] Error: ${err.message}`);
  }
};
