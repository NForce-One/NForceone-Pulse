import { Op } from "sequelize";
import Timesheet from "../models/timesheet.model.js";
import TimeEntry from "../models/timeEntry.model.js";
import User from "../models/user.model.js";
import Client from "../models/client.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import ApprovalHistory from "../models/approvalHistory.model.js";
import * as notificationService from "../services/notification.service.js";
import { toDateOnlyString } from "../utils/dateUtils.js";
import { classifyEntry, getDayName, getDisplayName, getExtraWorkType } from "../utils/holidayConfig.js";

// ================= GET ALL TIMESHEETS =================
export const getAllTimesheets = async (whereClause = {}) => {
  return await Timesheet.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

// ================= GET TIMESHEET BY ID =================
export const getTimesheetById = async (id) => {
  const timesheet = await Timesheet.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"],
      },
    ],
  });

  if (!timesheet) {
    return null;
  }

  // Fetch time entries for this timesheet's week
  const entries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: {
        gte: timesheet.weekStartDate,
        lte: timesheet.weekEndDate,
      },
    },
    order: [["entryDate", "ASC"]],
  });

  return {
    ...timesheet.toJSON(),
    TimeEntries: entries,
  };
};

// ================= GET TIMESHEETS BY USER =================
export const getTimesheetsByUser = async (userId) => {
  return await getAllTimesheets({ userId });
};

// ================= CREATE OR UPDATE TIMESHEET =================
export const generateTimesheet = async (userId, weekStartDate) => {
  const existing = await Timesheet.findOne({
    where: { userId, weekStartDate },
  });

  if (existing) {
    return existing;
  }

  // Calculate week end date (7 days later)
  const startDate = new Date(weekStartDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const endDateStr = toDateOnlyString(endDate);

  // Get all time entries for this week
  const entries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: {
        gte: weekStartDate,
        lte: endDateStr,
      },
    },
  });

  const totalHours = entries.reduce(
    (sum, e) => sum + Number(e.hours || 0),
    0
  );
  const billableHours = entries
    .filter((e) => e.isBillable)
    .reduce((sum, e) => sum + Number(e.hours || 0), 0);

  return await Timesheet.create({
    userId,
    weekStartDate,
    weekEndDate: endDateStr,
    totalHours,
    billableHours,
    status: "DRAFT",
  });
};

// ================= SUBMIT TIMESHEET =================
export const submitTimesheet = async (timesheetId, userId, comment) => {
  const timesheet = await Timesheet.findOne({
    where: { id: timesheetId, userId },
    include: [{ model: User, attributes: ["id", "name", "email", "managerId"] }],
  });

  if (!timesheet) {
    throw new Error("Timesheet not found");
  }

  if (timesheet.status !== "DRAFT") {
    throw new Error("Only draft timesheets can be submitted");
  }

  timesheet.status = "SUBMITTED";
  timesheet.comment = comment || null;
  await timesheet.save();

  // Update all entries in the timesheet to SUBMITTED
  await TimeEntry.update(
    { status: "SUBMITTED" },
    {
      where: {
        userId: timesheet.userId,
        entryDate: {
          gte: timesheet.weekStartDate,
          lte: timesheet.weekEndDate,
        },
      },
    }
  );

  // Log approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: userId,
    action: "SUBMITTED",
    comment,
  });

  // 🔔 NOTIFICATION: Notify manager about new submission
  if (timesheet.User?.managerId) {
    await notificationService.notifyTimesheetSubmitted({
      ...timesheet.toJSON(),
      userId: timesheet.userId,
      managerId: timesheet.User.managerId,
      User: timesheet.User,
    });
  }

  return timesheet;
};

// ================= APPROVE TIMESHEET =================
export const approveTimesheet = async (timesheetId, managerId, comment) => {
  const timesheet = await Timesheet.findByPk(timesheetId, {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!timesheet) {
    throw new Error("Timesheet not found");
  }

  if (timesheet.status !== "SUBMITTED") {
    throw new Error("Only submitted timesheets can be approved");
  }

  timesheet.status = "APPROVED";
  await timesheet.save();

  // Update all entries in the timesheet
  await TimeEntry.update(
    { status: "APPROVED" },
    {
      where: {
        userId: timesheet.userId,
        entryDate: {
          gte: timesheet.weekStartDate,
          lte: timesheet.weekEndDate,
        },
      },
    }
  );

  // Fetch entries to create per-entry approval history
  const entries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: {
        gte: timesheet.weekStartDate,
        lte: timesheet.weekEndDate,
      },
    },
    attributes: ["id"],
  });

  const approvalHistories = entries.map((entry) => ({
    timeEntryId: entry.id,
    actorId: managerId,
    action: "APPROVED",
    comment: comment || null,
  }));

  if (approvalHistories.length > 0) {
    await ApprovalHistory.bulkCreate(approvalHistories);
  }

  // Log timesheet-level approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: managerId,
    action: "APPROVED",
    comment: comment || null,
  });

  // 🔔 NOTIFICATION: Notify employee about approval
  await notificationService.notifyTimesheetApproved({
    ...timesheet.toJSON(),
    User: timesheet.User,
  });

  return timesheet;
};

// ================= REJECT TIMESHEET =================
export const rejectTimesheet = async (timesheetId, managerId, comment) => {
  const timesheet = await Timesheet.findByPk(timesheetId, {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!timesheet) {
    throw new Error("Timesheet not found");
  }

   if (timesheet.status !== "SUBMITTED") {
    throw new Error("Only submitted timesheets can be rejected");
  }

  timesheet.status = "REJECTED";
  await timesheet.save();

  // Update all entries in the timesheet
  await TimeEntry.update(
    { status: "REJECTED" },
    {
      where: {
        userId: timesheet.userId,
        entryDate: {
          gte: timesheet.weekStartDate,
          lte: timesheet.weekEndDate,
        },
      },
    }
  );

  // Fetch entries to create per-entry approval history
  const entries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: {
        gte: timesheet.weekStartDate,
        lte: timesheet.weekEndDate,
      },
    },
    attributes: ["id"],
  });

  const approvalHistories = entries.map((entry) => ({
    timeEntryId: entry.id,
    actorId: managerId,
    action: "REJECTED",
    comment: comment || null,
  }));

  if (approvalHistories.length > 0) {
    await ApprovalHistory.bulkCreate(approvalHistories);
  }

  // Log timesheet-level approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: managerId,
    action: "REJECTED",
    comment: comment || null,
  });

  // 🔔 NOTIFICATION: Notify employee about rejection
  await notificationService.notifyTimesheetRejected({
    ...timesheet.toJSON(),
    User: timesheet.User,
  });

  return timesheet;
};

// ================= COMMENT TIMESHEET (manager note, no status change) =================
export const commentTimesheet = async (timesheetId, managerId, comment) => {
  if (!comment) {
    throw new Error("Comment is required");
  }

  const timesheet = await Timesheet.findByPk(timesheetId, {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!timesheet) {
    throw new Error("Timesheet not found");
  }

  // Fetch entries to create per-entry approval history
  const entries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: {
        gte: timesheet.weekStartDate,
        lte: timesheet.weekEndDate,
      },
    },
    attributes: ["id"],
  });

  const approvalHistories = entries.map((entry) => ({
    timeEntryId: entry.id,
    actorId: managerId,
    action: "COMMENTED",
    comment: comment || null,
  }));

  if (approvalHistories.length > 0) {
    await ApprovalHistory.bulkCreate(approvalHistories);
  }

  // Log timesheet-level approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: managerId,
    action: "COMMENTED",
    comment: comment || null,
  });

  return timesheet;
};

// ================= WITHDRAW TIMESHEET =================
export const withdrawTimesheet = async (timesheetId, userId) => {
  const timesheet = await Timesheet.findOne({
    where: { id: timesheetId, userId },
  });

  if (!timesheet) {
    throw new Error("Timesheet not found");
  }

  if (timesheet.status !== "SUBMITTED") {
    throw new Error("Only submitted timesheets can be rejected");
  }

  timesheet.status = "DRAFT";
  await timesheet.save();

  // Log approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: userId,
    action: "WITHDRAWN",
  });

  return timesheet;
};

// ================= GET TEAM TIMESHEETS (MANAGER/ADMIN) =================
export const getTeamTimesheets = async (managerId, filters = {}) => {
  const whereClause = {};

  // Filter by manager's team members (skip if managerId is "all" for admin)
  if (managerId && managerId !== "all") {
    const teamMembers = await User.findAll({
      where: { managerId, isActive: true },
      attributes: ["id"],
    });
    const teamMemberIds = teamMembers.map((u) => u.id);
    if (teamMemberIds.length === 0) return [];
    whereClause.userId = { [Op.in]: teamMemberIds };
  }

  // Apply status filter
  if (filters.status && filters.status !== "ALL") {
    whereClause.status = filters.status;
  }

  // Apply date range filter
  if (filters.dateFrom || filters.dateTo) {
    whereClause.weekStartDate = {};
    if (filters.dateFrom) {
      whereClause.weekStartDate.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      whereClause.weekStartDate.lte = filters.dateTo;
    }
  }

  // Apply specific employee filter (overrides team filter if set)
  if (filters.employeeId) {
    whereClause.userId = filters.employeeId;
  }

  // Query timesheets
  const timesheets = await Timesheet.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        attributes: ["id", "name", "email", "defaultHours", "managerId"],
      },
    ],
    order: [["weekStartDate", "DESC"]],
  });

  return timesheets.map((ts) => {
    const totalMinutes = Math.round((ts.totalHours || 0) * 60);
    const billableMinutes = Math.round((ts.billableHours || 0) * 60);
    const nonBillableMinutes = totalMinutes - billableMinutes;
    const loggedHours = ts.totalHours || 0;

    // Calculate expected hours based on user's required hours per day
    // defaultHours is per day, 5 working days per week
    const userDefaultHours = ts.User?.defaultHours || 8.0;
    const expectedHours = 5 * userDefaultHours;
    const missingHours = Math.max(0, expectedHours - loggedHours);

    // Split name into first and last name
    const nameParts = (ts.User?.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return {
      id: ts.id,
      user_id: ts.userId,
      first_name: firstName,
      last_name: lastName,
      week_start_date: ts.weekStartDate,
      week_end_date: ts.weekEndDate,
      total_minutes: totalMinutes,
      total_billable_minutes: billableMinutes,
      total_non_billable_minutes: nonBillableMinutes,
      submission_status: ts.status,
      missing_hours: parseFloat(missingHours.toFixed(2)),
      User: ts.User,
    };
  });
};

// ================= GET FILTERED TIME ENTRIES (ADMIN) =================
export const getFilteredTimeEntries = async (filters = {}) => {
  const { employeeId, managerId, managerTeamId } = filters;

  let whereClause = {};

  if (employeeId) {
    whereClause.userId = employeeId;
  } else if (managerTeamId) {
    const approvedEntries = await ApprovalHistory.findAll({
      where: { actorId: managerTeamId, action: { [Op.in]: ["APPROVED", "REJECTED"] } },
      attributes: ["timeEntryId"],
    });
    const approvedEntryIds = approvedEntries.map((a) => a.timeEntryId).filter(Boolean);
    if (approvedEntryIds.length === 0) return [];
    whereClause.id = { [Op.in]: approvedEntryIds };
  } else if (managerId) {
    whereClause.managerId = managerId;
  }

  const entries = await TimeEntry.findAll({
    where: whereClause,
    include: [
      { model: User, attributes: ["id", "name", "email"] },
      { model: User, as: "Manager", attributes: ["id", "name", "email"] },
      { model: Client, attributes: ["id", "name"] },
      { model: Project, attributes: ["id", "name"] },
      { model: Task, attributes: ["id", "title"] },
    ],
    order: [["entryDate", "DESC"], ["createdAt", "DESC"]],
  });

  const entryIds = entries.map((e) => e.id);
  let commentMap = {};
  if (entryIds.length > 0) {
    const approvalHistories = await ApprovalHistory.findAll({
      where: { timeEntryId: { [Op.in]: entryIds }, action: "APPROVED" },
      order: [["createdAt", "DESC"]],
    });
    approvalHistories.forEach((ah) => {
      if (!commentMap[ah.timeEntryId]) {
        commentMap[ah.timeEntryId] = ah.comment || "-";
      }
    });
  }

  const formatDate = (dateStr) => {
    const dt = new Date(dateStr + "T00:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(dt.getDate()).padStart(2, "0");
    const month = months[dt.getMonth()];
    const year = String(dt.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const formatted = entries.map((entry) => {
    const json = entry.toJSON();
    const dateStr = json.entryDate;
    const entryType = classifyEntry(dateStr);
    return {
      id: json.id,
      entryDate: formatDate(dateStr),
      rawDate: dateStr,
      day: getDayName(dateStr),
      displayName: getDisplayName(dateStr),
      extraWorkType: getExtraWorkType(dateStr),
      userName: json.User?.name || "-",
      projectWorked: json.Project?.name || json.project || "-",
      clientWorked: json.Client?.name || json.client || "-",
      taskWorked: json.Task?.title || json.task || "-",
      description: json.description || "-",
      hoursWorked: Number(json.hours || 0),
      type: entryType,
      reportedTo: json.Manager?.name || "-",
      managerComment: commentMap[json.id] || "-",
      approvalStatus: json.status || "-",
      userId: json.userId,
    };
  });

  return formatted;
};

// ================= GET APPROVAL HISTORY =================
export const getApprovalHistory = async (timesheetId) => {
  return await ApprovalHistory.findAll({
    where: { timesheetId },
    include: [
      {
        model: User,
        as: "Actor",
        attributes: ["id", "name", "email"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};
