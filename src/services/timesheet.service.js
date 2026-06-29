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
import { approvedTimesheetTemplate } from "../templates/approvedTimesheet.template.js";
import { rejectedTimesheetTemplate } from "../templates/rejectedTimesheet.template.js";
import { sendEmail } from "./email.service.js";

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
        [Op.gte]: timesheet.weekStartDate,
        [Op.lte]: timesheet.weekEndDate,
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
        [Op.gte]: weekStartDate,
        [Op.lte]: endDateStr,
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
          [Op.gte]: timesheet.weekStartDate,
          [Op.lte]: timesheet.weekEndDate,
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
  console.log("[APPROVE] Step 1: Fetching timesheet", timesheetId);
  const timesheet = await Timesheet.findByPk(timesheetId, {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!timesheet) {
    console.error("[APPROVE] Timesheet not found:", timesheetId);
    throw new Error("Timesheet not found");
  }
  console.log("[APPROVE] Step 2: Timesheet fetched. Status:", timesheet.status, "userId:", timesheet.userId);

  if (timesheet.status !== "SUBMITTED") {
    console.error("[APPROVE] Wrong status:", timesheet.status);
    throw new Error("Only submitted timesheets can be approved");
  }

  console.log("[APPROVE] Step 3: User record from include:", JSON.stringify({ id: timesheet.User?.id, name: timesheet.User?.name, email: timesheet.User?.email }));
  console.log("[APPROVE] Step 4: timesheet fields:", JSON.stringify({ weekStartDate: timesheet.weekStartDate, weekEndDate: timesheet.weekEndDate, totalHours: timesheet.totalHours }));

  timesheet.status = "APPROVED";
  await timesheet.save();
  console.log("[APPROVE] Step 5: Timesheet status updated to APPROVED");

  // Update all entries in the timesheet
  await TimeEntry.update(
    { status: "APPROVED" },
    {
      where: {
        userId: timesheet.userId,
        entryDate: {
          [Op.gte]: timesheet.weekStartDate,
          [Op.lte]: timesheet.weekEndDate,
        },
      },
    }
  );
  console.log("[APPROVE] Step 6: Time entries updated to APPROVED");

  // Fetch entries for approval history and email template
  const entries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: {
        [Op.gte]: timesheet.weekStartDate,
        [Op.lte]: timesheet.weekEndDate,
      },
    },
    attributes: ["id", "project", "entryDate", "hours"],
  });
  console.log("[APPROVE] Step 7: Entries fetched, count:", entries.length);

  const approvalHistories = entries.map((entry) => ({
    timeEntryId: entry.id,
    actorId: managerId,
    action: "APPROVED",
    comment: comment || null,
  }));

  if (approvalHistories.length > 0) {
    await ApprovalHistory.bulkCreate(approvalHistories);
    console.log("[APPROVE] Step 8: Approval histories created for", approvalHistories.length, "entries");
  }

  // Log timesheet-level approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: managerId,
    action: "APPROVED",
    comment: comment || null,
  });
  console.log("[APPROVE] Step 9: Timesheet-level approval history created");

  // 🔔 NOTIFICATION: Notify employee about approval
  console.log("[APPROVE] Step 10: Creating notification...");
  await notificationService.notifyTimesheetApproved({
    ...timesheet.toJSON(),
    User: timesheet.User,
  });
  console.log("[APPROVE] Step 11: Notification created successfully");

  // 📧 EMAIL: Send approval notification to employee
  console.log("[APPROVE] Step 12: Entering email block...");
  try {
    console.log("[APPROVE] Step 13: Fetching manager info...");
    const manager = await User.findByPk(managerId, {
      attributes: ["name"],
    });
    console.log("[APPROVE] Step 14: Manager fetched:", JSON.stringify({ id: managerId, name: manager?.name }));

    console.log("[APPROVE] Step 15: Mapping entries...");
    const approvedEntries = entries.map((e) => {
      const plain = typeof e.toJSON === 'function' ? e.toJSON() : e;
      const mapped = {
        project: plain.project,
        entryDate: plain.entryDate instanceof Date ? plain.entryDate.toISOString().split('T')[0] : String(plain.entryDate || ''),
        hours: plain.hours,
      };
      return mapped;
    });
    console.log("[APPROVE] Step 16: Entries mapped, count:", approvedEntries.length);
    if (approvedEntries.length > 0) {
      console.log("[APPROVE] First entry sample:", JSON.stringify(approvedEntries[0]));
    }

    console.log("[APPROVE] Step 17: Generating email template...");
    const html = approvedTimesheetTemplate({
      employeeName: timesheet.User?.name || "Employee",
      weekStart: timesheet.weekStartDate,
      weekEnd: timesheet.weekEndDate,
      totalHours: timesheet.totalHours,
      managerName: manager?.name || "Manager",
      comment: comment || null,
      approvalDate: new Date().toISOString().split("T")[0],
      entries: approvedEntries,
    });
    console.log("[APPROVE] Step 18: Template generated, HTML length:", html.length);

    console.log("[APPROVE] Step 19: Calling sendEmail with to:", timesheet.User?.email);
    await sendEmail({
      to: timesheet.User?.email,
      subject: "Timesheet Approved - NForce Pulse",
      html,
    });
    console.log("[APPROVE] Step 20: Email sent successfully!");
  } catch (emailError) {
    console.error("[APPROVE] FAILED at step:", "sendEmail block");
    console.error("[APPROVE] Error name:", emailError.name);
    console.error("[APPROVE] Error message:", emailError.message);
    console.error("[APPROVE] Error stack:", emailError.stack);
  }

  console.log("[APPROVE] Step 21: Returning timesheet");
  return timesheet;
};

// ================= REJECT TIMESHEET =================
export const rejectTimesheet = async (timesheetId, managerId, comment) => {
  console.log("[REJECT] Step 1: Fetching timesheet", timesheetId);
  const timesheet = await Timesheet.findByPk(timesheetId, {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!timesheet) {
    console.error("[REJECT] Timesheet not found:", timesheetId);
    throw new Error("Timesheet not found");
  }
  console.log("[REJECT] Step 2: Timesheet fetched. Status:", timesheet.status, "userId:", timesheet.userId);
  console.log("[REJECT] Step 3: User record from include:", JSON.stringify({ id: timesheet.User?.id, name: timesheet.User?.name, email: timesheet.User?.email }));

  if (timesheet.status !== "SUBMITTED") {
    console.error("[REJECT] Wrong status:", timesheet.status);
    throw new Error("Only submitted timesheets can be rejected");
  }

  timesheet.status = "REJECTED";
  await timesheet.save();
  console.log("[REJECT] Step 4: Timesheet status updated to REJECTED");

  // Update all entries in the timesheet
  await TimeEntry.update(
    { status: "REJECTED" },
    {
      where: {
        userId: timesheet.userId,
        entryDate: {
          [Op.gte]: timesheet.weekStartDate,
          [Op.lte]: timesheet.weekEndDate,
        },
      },
    }
  );
  console.log("[REJECT] Step 5: Time entries updated to REJECTED");

  // Fetch entries for approval history and email template
  const entries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: {
        [Op.gte]: timesheet.weekStartDate,
        [Op.lte]: timesheet.weekEndDate,
      },
    },
    attributes: ["id", "project", "entryDate", "hours"],
  });
  console.log("[REJECT] Step 6: Entries fetched, count:", entries.length);

  const approvalHistories = entries.map((entry) => ({
    timeEntryId: entry.id,
    actorId: managerId,
    action: "REJECTED",
    comment: comment || null,
  }));

  if (approvalHistories.length > 0) {
    await ApprovalHistory.bulkCreate(approvalHistories);
    console.log("[REJECT] Step 7: Approval histories created for", approvalHistories.length, "entries");
  }

  // Log timesheet-level approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: managerId,
    action: "REJECTED",
    comment: comment || null,
  });
  console.log("[REJECT] Step 8: Timesheet-level approval history created");

  // 🔔 NOTIFICATION: Notify employee about rejection
  console.log("[REJECT] Step 9: Creating notification...");
  await notificationService.notifyTimesheetRejected({
    ...timesheet.toJSON(),
    User: timesheet.User,
  });
  console.log("[REJECT] Step 10: Notification created successfully");

  // 📧 EMAIL: Send rejection notification to employee
  console.log("[REJECT] Step 11: Entering email block...");
  try {
    console.log("[REJECT] Step 12: Fetching manager info...");
    const manager = await User.findByPk(managerId, {
      attributes: ["name"],
    });
    console.log("[REJECT] Step 13: Manager fetched:", JSON.stringify({ id: managerId, name: manager?.name }));

    console.log("[REJECT] Step 14: Mapping entries...");
    const rejectedEntries = entries.map((e) => {
      const plain = typeof e.toJSON === 'function' ? e.toJSON() : e;
      const mapped = {
        project: plain.project,
        entryDate: plain.entryDate instanceof Date ? plain.entryDate.toISOString().split('T')[0] : String(plain.entryDate || ''),
        hours: plain.hours,
      };
      return mapped;
    });
    console.log("[REJECT] Step 15: Entries mapped, count:", rejectedEntries.length);
    if (rejectedEntries.length > 0) {
      console.log("[REJECT] First entry sample:", JSON.stringify(rejectedEntries[0]));
    }

    console.log("[REJECT] Step 16: Generating email template...");
    const html = rejectedTimesheetTemplate({
      employeeName: timesheet.User?.name || "Employee",
      weekStart: timesheet.weekStartDate,
      weekEnd: timesheet.weekEndDate,
      totalHours: timesheet.totalHours,
      managerName: manager?.name || "Manager",
      comment: comment || null,
      rejectionDate: new Date().toISOString().split("T")[0],
      entries: rejectedEntries,
    });
    console.log("[REJECT] Step 17: Template generated, HTML length:", html.length);

    console.log("[REJECT] Step 18: Calling sendEmail with to:", timesheet.User?.email);
    await sendEmail({
      to: timesheet.User?.email,
      subject: "Timesheet Requires Changes - NForce Pulse",
      html,
    });
    console.log("[REJECT] Step 19: Email sent successfully!");
  } catch (emailError) {
    console.error("[REJECT] FAILED at step:", "sendEmail block");
    console.error("[REJECT] Error name:", emailError.name);
    console.error("[REJECT] Error message:", emailError.message);
    console.error("[REJECT] Error stack:", emailError.stack);
  }

  console.log("[REJECT] Step 20: Returning timesheet");
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
        [Op.gte]: timesheet.weekStartDate,
        [Op.lte]: timesheet.weekEndDate,
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

  // Apply specific employee filter first (takes precedence over team filter)
  if (filters.employeeId) {
    whereClause.userId = filters.employeeId;
  }

  // Filter by manager's team members (skip if managerId is "all" for admin or employee is already selected)
  if (managerId && managerId !== "all" && !filters.employeeId) {
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
      whereClause.weekStartDate[Op.gte] = filters.dateFrom;
    }
    if (filters.dateTo) {
      whereClause.weekStartDate[Op.lte] = filters.dateTo;
    }
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
