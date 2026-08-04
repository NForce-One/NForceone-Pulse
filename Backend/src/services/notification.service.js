import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import TimeEntry from "../models/timeEntry.model.js";
import Timesheet from "../models/timesheet.model.js";
import { Op } from "sequelize";
import { toDateOnlyString } from "../utils/dateUtils.js";

export const getNotificationsByUser = async (userId) => {
  const notifications = await Notification.findAll({
    where: { userId },
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Timesheet-related notifications carry the timesheet id in `relatedId`.
  // Attach the exact week (weekStartDate / weekEndDate) from that Timesheet
  // so the frontend can navigate straight to the correct week from a
  // notification. Notifications without a related timesheet (e.g. reminders)
  // are left unchanged.
  const timesheetIds = [
    ...new Set(
      notifications
        .map((n) => n.relatedId)
        .filter((id) => id !== null && id !== undefined)
    ),
  ];

  if (timesheetIds.length > 0) {
    const timesheets = await Timesheet.findAll({
      where: { id: { [Op.in]: timesheetIds } },
      attributes: ["id", "weekStartDate", "weekEndDate"],
    });
    const timesheetMap = new Map(timesheets.map((ts) => [ts.id, ts]));
    notifications.forEach((n) => {
      const timesheet = timesheetMap.get(n.relatedId);
      if (timesheet) {
        n.setDataValue("weekStartDate", timesheet.weekStartDate);
        n.setDataValue("weekEndDate", timesheet.weekEndDate);
      }
    });
  }

  return notifications;
};

export const getUnreadCount = async (userId) => {
  return await Notification.count({
    where: { userId, isRead: false },
  });
};

export const markAsRead = async (id, userId) => {
  const notification = await Notification.findOne({
    where: { id, userId },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId) => {
  await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );
  return { message: "All notifications marked as read" };
};

export const createNotification = async (data) => {
  return await Notification.create(data);
};

export const deleteNotification = async (id, userId) => {
  const notification = await Notification.findOne({
    where: { id, userId },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  await notification.destroy();
  return { message: "Notification deleted" };
};

// ================= SAFE DATE FORMATTING HELPERS =================

const formatDateSafe = (dateValue) => {
  if (!dateValue) return null;
  let date;
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateValue);
  }
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getDateLabel = (record) => {
  if (record.weekStartDate) {
    return { label: formatDateSafe(record.weekStartDate), prefix: "timesheet for the week of" };
  }
  if (record.entryDate) {
    return { label: formatDateSafe(record.entryDate), prefix: "time entry for" };
  }
  return { label: null, prefix: "timesheet for the week of" };
};

const buildMessage = (record, verb) => {
  if (record.weekStartDate && record.weekEndDate) {
    const start = formatDateSafe(record.weekStartDate);
    const end = formatDateSafe(record.weekEndDate);
    return `Your timesheet for the week ${start} – ${end} has been ${verb}.`;
  }
  const { label, prefix } = getDateLabel(record);
  const datePart = label || "unknown date";
  return `Your ${prefix} ${datePart} has been ${verb}.`;
};

// ================= EVENT-TRIGGERED NOTIFICATIONS =================

export const notifyTimesheetSubmitted = async (record) => {
  try {
    const { label, prefix } = getDateLabel(record);
    const datePart = label || "unknown date";
    const weekRange =
      record.weekStartDate && record.weekEndDate
        ? `${formatDateSafe(record.weekStartDate)} – ${formatDateSafe(record.weekEndDate)}`
        : datePart;

    const managerId = record.managerId || record.User?.managerId;

    // Notify manager about new submission
    if (managerId) {
      const manager = await User.findByPk(managerId);
      if (manager) {
        await Notification.create({
          userId: managerId,
          type: "SUBMITTED",
          title: "New Timesheet Submission",
          message: `${record.User?.name || "An employee"} submitted a ${prefix} ${datePart}.`,
          relatedId: record.id,
          isRead: false,
        });
      }
    }

    // Notify employee (confirmation)
    let managerName = "your manager";
    if (managerId) {
      const mgr = await User.findByPk(managerId, { attributes: ["id", "name"] });
      if (mgr) managerName = mgr.name;
    }

    await Notification.create({
      userId: record.userId,
      type: "SUBMITTED",
      title: "Weekly Timesheet Submitted",
      message: `Your weekly timesheet has been submitted successfully.\n\nWeek:\n${weekRange}\n\nSubmitted To:\n${managerName}`,
      relatedId: record.id,
      isRead: false,
    });
  } catch (err) {
    console.error("Failed to create submission notifications:", err.message);
  }
};

export const notifyTimesheetResubmitted = async (record) => {
  try {
    const weekRange =
      record.weekStartDate && record.weekEndDate
        ? `${formatDateSafe(record.weekStartDate)} – ${formatDateSafe(record.weekEndDate)}`
        : "unknown date";

    // Notify manager about re-submission
    const managerId = record.managerId || record.User?.managerId;
    if (managerId) {
      const manager = await User.findByPk(managerId);
      if (manager) {
        await Notification.create({
          userId: managerId,
          type: "RESUBMITTED",
          title: "Timesheet Re-Submitted",
          message: `${record.User?.name || "An employee"} re-submitted a timesheet for the week of ${formatDateSafe(record.weekStartDate) || "unknown date"}.`,
          relatedId: record.id,
          isRead: false,
        });
      }
    }

    // Notify employee (re-submission confirmation)
    let managerName = "your manager";
    if (managerId) {
      const mgr = await User.findByPk(managerId, { attributes: ["id", "name"] });
      if (mgr) managerName = mgr.name;
    }

    await Notification.create({
      userId: record.userId,
      type: "RESUBMITTED",
      title: "Weekly Timesheet Re-Submitted",
      message: `Your weekly timesheet has been re-submitted successfully.\n\nWeek:\n${weekRange}\n\nSubmitted To:\n${managerName}`,
      relatedId: record.id,
      isRead: false,
    });
  } catch (err) {
    console.error("Failed to create re-submission notification:", err.message);
  }
};

export const notifyTimesheetApproved = async (record) => {
  try {
    const weekRange =
      record.weekStartDate && record.weekEndDate
        ? `${formatDateSafe(record.weekStartDate)} – ${formatDateSafe(record.weekEndDate)}`
        : "unknown date";

    let actorName = "your manager";
    if (record.actorId) {
      const actor = await User.findByPk(record.actorId, { attributes: ["id", "name"] });
      if (actor) actorName = actor.name;
    }

    await Notification.create({
      userId: record.userId,
      type: "APPROVED",
      title: "Weekly Timesheet Approved",
      message: `Your weekly timesheet has been approved by your manager.\n\nWeek:\n${weekRange}\n\nApproved By:\n${actorName}`,
      relatedId: record.id || record.relatedId,
      isRead: false,
    });
  } catch (err) {
    console.error("Failed to create approval notification:", err.message);
  }
};

export const notifyTimesheetRejected = async (record) => {
  try {
    const weekRange =
      record.weekStartDate && record.weekEndDate
        ? `${formatDateSafe(record.weekStartDate)} – ${formatDateSafe(record.weekEndDate)}`
        : "unknown date";

    let actorName = "your manager";
    if (record.actorId) {
      const actor = await User.findByPk(record.actorId, { attributes: ["id", "name"] });
      if (actor) actorName = actor.name;
    }

    await Notification.create({
      userId: record.userId,
      type: "REJECTED",
      title: "Weekly Timesheet Rejected",
      message: `Your weekly timesheet has been rejected by your manager.\n\nWeek:\n${weekRange}\n\nRejected By:\n${actorName}`,
      relatedId: record.id || record.relatedId,
      isRead: false,
    });
  } catch (err) {
    console.error("Failed to create rejection notification:", err.message);
  }
};

export const notifyPendingApprovals = async (managerId, count) => {
  await Notification.create({
    userId: managerId,
    type: "MANAGER_REMINDER",
    title: "Pending Approvals Reminder",
    message: `You have ${count} pending timesheet approval(s) waiting for your review.`,
    isRead: false,
  });
};

// ================= SCHEDULED REMINDER JOBS =================

export const checkMissingDailyEntries = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  const employees = await User.findAll({
    where: { role: "EMPLOYEE", isActive: true },
  });

  for (const emp of employees) {
    const entryCount = await TimeEntry.count({
      where: { userId: emp.id, entryDate: dateStr },
    });

    if (entryCount === 0) {
      const alreadyNotified = await Notification.count({
        where: {
          userId: emp.id,
          type: "MISSING_ENTRY",
          createdAt: { [Op.gte]: new Date(dateStr) },
        },
      });

      if (alreadyNotified === 0) {
        await Notification.create({
          userId: emp.id,
          type: "MISSING_ENTRY",
          title: "Missing Time Entry",
          message: `You did not log any time entries for ${dateStr}. Please add your time entry.`,
          isRead: false,
        });
      }
    }
  }
};

export const checkWeeklyPendingSubmissions = async () => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = toDateOnlyString(weekStart);

  const employees = await User.findAll({
    where: { role: "EMPLOYEE", isActive: true },
  });

  for (const emp of employees) {
    const draftCount = await TimeEntry.count({
      where: {
        userId: emp.id,
        status: "DRAFT",
        entryDate: { [Op.gte]: weekStartStr },
      },
    });

    if (draftCount > 0) {
      const alreadyNotified = await Notification.count({
        where: {
          userId: emp.id,
          type: "PENDING_SUBMISSION",
          createdAt: { [Op.gte]: weekStart },
        },
      });

      if (alreadyNotified === 0) {
        await Notification.create({
          userId: emp.id,
          type: "PENDING_SUBMISSION",
          title: "Weekly Timesheet Pending",
          message: `You have ${draftCount} draft time entry(ies) this week. Please submit them for approval.`,
          isRead: false,
        });
      }
    }
  }
};
