import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import TimeEntry from "../models/timeEntry.model.js";
import { Op } from "sequelize";
import { toDateOnlyString } from "../utils/dateUtils.js";

export const getNotificationsByUser = async (userId) => {
  return await Notification.findAll({
    where: { userId },
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
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
  const { label, prefix } = getDateLabel(record);
  const datePart = label || "unknown date";
  return `Your ${prefix} ${datePart} has been ${verb}.`;
};

// ================= EVENT-TRIGGERED NOTIFICATIONS =================

export const notifyTimesheetSubmitted = async (record) => {
  const { label, prefix } = getDateLabel(record);
  const datePart = label || "unknown date";

  // Notify manager about new submission
  if (record.managerId || record.User?.managerId) {
    const managerId = record.managerId || record.User?.managerId;
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

  // Notify employee
  await Notification.create({
    userId: record.userId,
    type: "SUBMITTED",
    title: "Timesheet Submitted",
    message: buildMessage(record, "submitted for approval"),
    relatedId: record.id,
    isRead: false,
  });
};

export const notifyTimesheetApproved = async (record) => {
  await Notification.create({
    userId: record.userId,
    type: "APPROVED",
    title: "Timesheet Approved",
    message: buildMessage(record, "approved"),
    relatedId: record.id,
    isRead: false,
  });
};

export const notifyTimesheetRejected = async (record) => {
  const { label, prefix } = getDateLabel(record);
  const datePart = label || "unknown date";
  await Notification.create({
    userId: record.userId,
    type: "REJECTED",
    title: "Timesheet Rejected",
    message: `Your ${prefix} ${datePart} has been rejected. Please review and resubmit.`,
    relatedId: record.id,
    isRead: false,
  });
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
