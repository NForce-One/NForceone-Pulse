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

// A timesheet can span projects assigned to different managers. Each manager's
// approve/reject action only resolves the entries assigned to them, so the
// timesheet-level status has to be derived from the full set of entry statuses
// rather than force-set to whatever the most recent actor decided.
//
// The frontend (TeamTimesheets.jsx, EmployeeTimeIQ.jsx) only knows how to
// render/gate DRAFT/SUBMITTED/APPROVED/REJECTED, so a mixed outcome (one
// project approved, another rejected) rolls up to REJECTED — it correctly
// signals "needs your attention" and unlocks editing, while each project's
// own TimeEntry.status independently keeps its real APPROVED/REJECTED value.
const deriveOverallStatus = (entryStatuses) => {
  const unique = new Set(entryStatuses);
  if (unique.size === 1 && unique.has("APPROVED")) return "APPROVED";
  const hasPending = entryStatuses.some((s) => s === "SUBMITTED" || s === "DRAFT");
  // Other managers' entries are still awaiting a decision
  if (hasPending) return "SUBMITTED";
  // Every entry is terminal: either unanimously rejected, or a mix of
  // approved/rejected across different managers' projects
  return "REJECTED";
};

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
        attributes: ["id", "name", "email", "employeeId"],
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

  // Live-sum from the entries instead of trusting the denormalized
  // Timesheet.totalHours/billableHours columns, which can go stale
  // when an entry is edited/deleted after the timesheet was saved.
  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
  const billableHours = entries
    .filter((e) => e.isBillable)
    .reduce((sum, e) => sum + Number(e.hours || 0), 0);

  return {
    ...timesheet.toJSON(),
    totalHours,
    billableHours,
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

  // Update all entries in the timesheet to SUBMITTED — except ones a manager
  // already approved. Different projects can be routed to different managers,
  // so a project that's already been approved must not be reset to pending
  // just because the employee resubmits other rejected/draft entries.
  await TimeEntry.update(
    { status: "SUBMITTED" },
    {
      where: {
        userId: timesheet.userId,
        entryDate: {
          [Op.gte]: timesheet.weekStartDate,
          [Op.lte]: timesheet.weekEndDate,
        },
        status: { [Op.ne]: "APPROVED" },
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

  // Collect every distinct manager assigned across this week's entries —
  // different projects can be routed to different managers
  const weekEntries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: {
        [Op.gte]: timesheet.weekStartDate,
        [Op.lte]: timesheet.weekEndDate,
      },
    },
    attributes: ["managerId"],
  });
  const managerIds = [...new Set(weekEntries.map((e) => e.managerId).filter(Boolean))];

  // 🔔 NOTIFICATION: Notify every manager involved about the new submission
  if (managerIds.length > 0 || timesheet.User?.managerId) {
    await notificationService.notifyTimesheetSubmitted({
      ...timesheet.toJSON(),
      userId: timesheet.userId,
      managerIds,
      User: timesheet.User,
    });
  }

  return timesheet;
};

// ================= APPROVE TIMESHEET =================
export const approveTimesheet = async (timesheetId, managerId, comment, actorRole = "MANAGER") => {
  console.log("[APPROVE-EMAIL] ===== START APPROVE TIMESHEET =====");
  console.log("[APPROVE-EMAIL] timesheetId:", timesheetId, "managerId:", managerId, "actorRole:", actorRole);

  const timesheet = await Timesheet.findByPk(timesheetId, {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!timesheet) {
    console.error("[APPROVE-EMAIL] Timesheet NOT FOUND");
    throw new Error("Timesheet not found");
  }
  console.log("[APPROVE-EMAIL] Timesheet found, status:", timesheet.status);
  console.log("[APPROVE-EMAIL] User from include:", JSON.stringify({ id: timesheet.User?.id, name: timesheet.User?.name, email: timesheet.User?.email }));
  console.log("[APPROVE-EMAIL] User EXISTS?", !!timesheet.User);

  if (timesheet.status !== "SUBMITTED") {
    console.error("[APPROVE-EMAIL] Wrong status:", timesheet.status);
    throw new Error("Only submitted timesheets can be approved");
  }

  const weekWhere = {
    userId: timesheet.userId,
    entryDate: {
      [Op.gte]: timesheet.weekStartDate,
      [Op.lte]: timesheet.weekEndDate,
    },
  };

  // A manager can only approve the projects assigned to them; an admin can
  // still override the whole timesheet regardless of per-project manager.
  const scopedWhere = actorRole === "ADMIN" ? weekWhere : { ...weekWhere, managerId };

  // Only entries still awaiting a decision within this actor's scope are
  // touched — entries already resolved by another manager are left alone.
  const entriesToApprove = await TimeEntry.findAll({
    where: { ...scopedWhere, status: "SUBMITTED" },
    attributes: ["id", "project", "projectId", "entryDate", "hours"],
  });

  if (entriesToApprove.length === 0) {
    throw new Error("No time entries pending your approval on this timesheet");
  }

  await TimeEntry.update(
    { status: "APPROVED" },
    { where: { id: { [Op.in]: entriesToApprove.map((e) => e.id) } } }
  );
  console.log("[APPROVE-EMAIL] Time entries updated to APPROVED:", entriesToApprove.length);

  // Recompute the parent timesheet status from every entry in the week —
  // other managers' entries may still be pending or already rejected.
  const allWeekEntries = await TimeEntry.findAll({
    where: weekWhere,
    attributes: ["status"],
  });
  timesheet.status = deriveOverallStatus(allWeekEntries.map((e) => e.status));
  await timesheet.save();
  console.log("[APPROVE-EMAIL] Timesheet saved with status:", timesheet.status);

  const liveTotalHours = entriesToApprove.reduce((sum, e) => sum + Number(e.hours || 0), 0);

  const approvalHistories = entriesToApprove.map((entry) => ({
    timeEntryId: entry.id,
    timesheetId: timesheet.id,
    userId: timesheet.userId,
    projectId: entry.projectId,
    actorId: managerId,
    action: "APPROVED",
    comment: comment || null,
  }));

  if (approvalHistories.length > 0) {
    await ApprovalHistory.bulkCreate(approvalHistories);
    console.log("[APPROVE-EMAIL] Approval histories created:", approvalHistories.length);
  }

  // Log timesheet-level approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: managerId,
    action: "APPROVED",
    comment: comment || null,
  });
  console.log("[APPROVE-EMAIL] Timesheet-level approval history created");

  // 🔔 NOTIFICATION: Only tell the employee "your timesheet is approved" once
  // every entry across every manager has landed on APPROVED.
  if (timesheet.status === "APPROVED") {
    console.log("[APPROVE-EMAIL] Creating notification...");
    await notificationService.notifyTimesheetApproved({
      ...timesheet.toJSON(),
      User: timesheet.User,
      actorId: managerId,
    });
    console.log("[APPROVE-EMAIL] Notification created successfully");
  } else {
    console.log("[APPROVE-EMAIL] Skipping full-approval notification; timesheet status is", timesheet.status);
  }

  // 📧 EMAIL: Send approval notification to employee
  console.log("[APPROVE-EMAIL] ===== ENTERING EMAIL BLOCK =====");
  try {
    console.log("[APPROVE-EMAIL] Fetching manager info...");
    const manager = await User.findByPk(managerId, {
      attributes: ["name"],
    });
    console.log("[APPROVE-EMAIL] Manager fetched:", JSON.stringify({ id: managerId, name: manager?.name }));

    console.log("[APPROVE-EMAIL] Mapping entries for template...");
    const approvedEntries = entriesToApprove.map((e) => {
      const plain = typeof e.toJSON === 'function' ? e.toJSON() : e;
      return {
        project: plain.project,
        entryDate: plain.entryDate instanceof Date ? plain.entryDate.toISOString().split('T')[0] : String(plain.entryDate || ''),
        hours: plain.hours,
      };
    });
    console.log("[APPROVE-EMAIL] Entries mapped, count:", approvedEntries.length);
    if (approvedEntries.length > 0) {
      console.log("[APPROVE-EMAIL] First entry sample:", JSON.stringify(approvedEntries[0]));
    }

    console.log("[APPROVE-EMAIL] Generating email template...");
    const html = approvedTimesheetTemplate({
      employeeName: timesheet.User?.name || "Employee",
      weekStart: timesheet.weekStartDate,
      weekEnd: timesheet.weekEndDate,
      totalHours: liveTotalHours,
      managerName: manager?.name || "Manager",
      comment: comment || null,
      approvalDate: new Date().toISOString().split("T")[0],
      entries: approvedEntries,
    });
    console.log("[APPROVE-EMAIL] Template generated, HTML length:", html.length);

    const recipientEmail = timesheet.User?.email;
    console.log("[APPROVE-EMAIL] Recipient email:", recipientEmail);
    console.log("[APPROVE-EMAIL] About to call sendEmail...");

    const emailResult = await sendEmail({
      to: recipientEmail,
      subject:
        timesheet.status === "APPROVED"
          ? "Timesheet Approved - NForce Pulse"
          : "Timesheet Entries Approved - NForce Pulse",
      html,
    });
    console.log("[APPROVE-EMAIL] sendEmail completed. Result:", JSON.stringify(emailResult));
  } catch (emailError) {
    console.error("[APPROVE-EMAIL] ===== EMAIL FAILED =====");
    console.error("[APPROVE-EMAIL] Error name:", emailError.name);
    console.error("[APPROVE-EMAIL] Error message:", emailError.message);
    console.error("[APPROVE-EMAIL] Error stack:", emailError.stack);
  }
  console.log("[APPROVE-EMAIL] ===== END APPROVE TIMESHEET =====");

  return timesheet;
};

// ================= REJECT TIMESHEET =================
export const rejectTimesheet = async (timesheetId, managerId, comment, actorRole = "MANAGER") => {
  console.log("[REJECT-EMAIL] ===== START REJECT TIMESHEET =====");
  console.log("[REJECT-EMAIL] timesheetId:", timesheetId, "managerId:", managerId, "actorRole:", actorRole);

  const timesheet = await Timesheet.findByPk(timesheetId, {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!timesheet) {
    console.error("[REJECT-EMAIL] Timesheet NOT FOUND");
    throw new Error("Timesheet not found");
  }
  console.log("[REJECT-EMAIL] Timesheet found, status:", timesheet.status);
  console.log("[REJECT-EMAIL] User from include:", JSON.stringify({ id: timesheet.User?.id, name: timesheet.User?.name, email: timesheet.User?.email }));
  console.log("[REJECT-EMAIL] User EXISTS?", !!timesheet.User);

  if (timesheet.status !== "SUBMITTED") {
    console.error("[REJECT-EMAIL] Wrong status:", timesheet.status);
    throw new Error("Only submitted timesheets can be rejected");
  }

  const weekWhere = {
    userId: timesheet.userId,
    entryDate: {
      [Op.gte]: timesheet.weekStartDate,
      [Op.lte]: timesheet.weekEndDate,
    },
  };

  // A manager can only reject the projects assigned to them; an admin can
  // still override the whole timesheet regardless of per-project manager.
  const scopedWhere = actorRole === "ADMIN" ? weekWhere : { ...weekWhere, managerId };

  // Only entries still awaiting a decision within this actor's scope are
  // touched — entries already resolved by another manager are left alone.
  const entriesToReject = await TimeEntry.findAll({
    where: { ...scopedWhere, status: "SUBMITTED" },
    attributes: ["id", "project", "projectId", "entryDate", "hours"],
  });

  if (entriesToReject.length === 0) {
    throw new Error("No time entries pending your review on this timesheet");
  }

  await TimeEntry.update(
    { status: "REJECTED" },
    { where: { id: { [Op.in]: entriesToReject.map((e) => e.id) } } }
  );
  console.log("[REJECT-EMAIL] Time entries updated to REJECTED:", entriesToReject.length);

  // Recompute the parent timesheet status from every entry in the week —
  // other managers' entries may still be pending or already approved.
  const allWeekEntries = await TimeEntry.findAll({
    where: weekWhere,
    attributes: ["status"],
  });
  timesheet.status = deriveOverallStatus(allWeekEntries.map((e) => e.status));
  await timesheet.save();
  console.log("[REJECT-EMAIL] Timesheet saved with status:", timesheet.status);

  const liveTotalHours = entriesToReject.reduce((sum, e) => sum + Number(e.hours || 0), 0);

  const approvalHistories = entriesToReject.map((entry) => ({
    timeEntryId: entry.id,
    timesheetId: timesheet.id,
    userId: timesheet.userId,
    projectId: entry.projectId,
    actorId: managerId,
    action: "REJECTED",
    comment: comment || null,
  }));

  if (approvalHistories.length > 0) {
    await ApprovalHistory.bulkCreate(approvalHistories);
    console.log("[REJECT-EMAIL] Approval histories created:", approvalHistories.length);
  }

  // Log timesheet-level approval history
  await ApprovalHistory.create({
    timesheetId: timesheet.id,
    actorId: managerId,
    action: "REJECTED",
    comment: comment || null,
  });
  console.log("[REJECT-EMAIL] Timesheet-level approval history created");

  // 🔔 NOTIFICATION: Notify employee about rejection
  console.log("[REJECT-EMAIL] Creating notification...");
  await notificationService.notifyTimesheetRejected({
    ...timesheet.toJSON(),
    User: timesheet.User,
    actorId: managerId,
  });
  console.log("[REJECT-EMAIL] Notification created successfully");

  // 📧 EMAIL: Send rejection notification to employee
  console.log("[REJECT-EMAIL] ===== ENTERING EMAIL BLOCK =====");
  try {
    console.log("[REJECT-EMAIL] Fetching manager info...");
    const manager = await User.findByPk(managerId, {
      attributes: ["name"],
    });
    console.log("[REJECT-EMAIL] Manager fetched:", JSON.stringify({ id: managerId, name: manager?.name }));

    console.log("[REJECT-EMAIL] Mapping entries for template...");
    const rejectedEntries = entriesToReject.map((e) => {
      const plain = typeof e.toJSON === 'function' ? e.toJSON() : e;
      return {
        project: plain.project,
        entryDate: plain.entryDate instanceof Date ? plain.entryDate.toISOString().split('T')[0] : String(plain.entryDate || ''),
        hours: plain.hours,
      };
    });
    console.log("[REJECT-EMAIL] Entries mapped, count:", rejectedEntries.length);
    if (rejectedEntries.length > 0) {
      console.log("[REJECT-EMAIL] First entry sample:", JSON.stringify(rejectedEntries[0]));
    }

    console.log("[REJECT-EMAIL] Generating email template...");
    const html = rejectedTimesheetTemplate({
      employeeName: timesheet.User?.name || "Employee",
      weekStart: timesheet.weekStartDate,
      weekEnd: timesheet.weekEndDate,
      totalHours: liveTotalHours,
      managerName: manager?.name || "Manager",
      comment: comment || null,
      rejectionDate: new Date().toISOString().split("T")[0],
      entries: rejectedEntries,
    });
    console.log("[REJECT-EMAIL] Template generated, HTML length:", html.length);

    const recipientEmail = timesheet.User?.email;
    console.log("[REJECT-EMAIL] Recipient email:", recipientEmail);
    console.log("[REJECT-EMAIL] About to call sendEmail...");

    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: "Timesheet Requires Changes - NForce Pulse",
      html,
    });
    console.log("[REJECT-EMAIL] sendEmail completed. Result:", JSON.stringify(emailResult));
  } catch (emailError) {
    console.error("[REJECT-EMAIL] ===== EMAIL FAILED =====");
    console.error("[REJECT-EMAIL] Error name:", emailError.name);
    console.error("[REJECT-EMAIL] Error message:", emailError.message);
    console.error("[REJECT-EMAIL] Error stack:", emailError.stack);
  }
  console.log("[REJECT-EMAIL] ===== END REJECT TIMESHEET =====");

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
    // Find users who have this manager as their reporting manager
    const reportingUsers = await User.findAll({
      where: { managerId, isActive: true },
      attributes: ["id"],
    });
    const reportingUserIds = reportingUsers.map((u) => u.id);

    // Also find users who have actually submitted time entries to this
    // manager. A DRAFT entry already carries the managerId the employee
    // picked in EmployeeTimeIQ (needed so a later Submit knows who to route
    // to) — excluding DRAFT here means an ad hoc project-manager selection
    // doesn't grant that manager visibility until the employee submits.
    const entryUsers = await TimeEntry.findAll({
      where: { managerId, status: { [Op.ne]: "DRAFT" } },
      attributes: ["userId"],
    });
    const entryUserIds = entryUsers.map((e) => e.userId);

    // Combine both lists
    const allTeamMemberIds = [...new Set([...reportingUserIds, ...entryUserIds])];
    if (allTeamMemberIds.length === 0) return [];
    whereClause.userId = { [Op.in]: allTeamMemberIds };
  }

  // Apply status filter. Managers/Admins must never see a timesheet before
  // the employee actually submits it, so DRAFT is always excluded here —
  // regardless of which filter tab is selected (including "ALL" or an
  // explicit "DRAFT" request from an old/bypassed client).
  if (filters.status && filters.status !== "ALL" && filters.status !== "DRAFT") {
    if (filters.status === "RESUBMITTED") {
      whereClause.status = "SUBMITTED";
    } else {
      whereClause.status = filters.status;
    }
  } else {
    whereClause.status = { [Op.ne]: "DRAFT" };
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

  return Promise.all(
    timesheets.map(async (ts) => {
      const entries = await TimeEntry.findAll({
        where: {
          userId: ts.userId,
          entryDate: { [Op.gte]: ts.weekStartDate, [Op.lte]: ts.weekEndDate },
        },
        attributes: ["id", "hours", "isBillable", "status", "projectId"],
      });
      const loggedHours = entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
      const billableHours = entries
        .filter((e) => e.isBillable)
        .reduce((sum, e) => sum + Number(e.hours || 0), 0);

      const totalMinutes = Math.round(loggedHours * 60);
      const billableMinutes = Math.round(billableHours * 60);
      const nonBillableMinutes = totalMinutes - billableMinutes;

      const userDefaultHours = ts.User?.defaultHours || 8.0;
      const expectedHours = 5 * userDefaultHours;
      const missingHours = Math.max(0, expectedHours - loggedHours);

      const nameParts = (ts.User?.name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      let previouslyResubmitted = false;
      if (ts.status === "SUBMITTED") {
        const entryIds = entries.map((e) => e.id);
        const projectIds = [...new Set(entries.map((e) => e.projectId).filter((p) => p !== null && p !== undefined))];
        if (entryIds.length > 0 || projectIds.length > 0) {
          const historyWhere = {
            action: { [Op.in]: ["APPROVED", "REJECTED"] },
            [Op.or]: [
              ...(entryIds.length > 0 ? [{ timeEntryId: { [Op.in]: entryIds } }] : []),
              // Survives a Cancel, which detaches the entries this history was
              // originally tied to — otherwise a rejected project that's
              // cancelled and re-added would lose all memory of the decision.
              ...(projectIds.length > 0 ? [{ userId: ts.userId, projectId: { [Op.in]: projectIds } }] : []),
            ],
          };
          // Scope to the manager currently viewing this list — a resubmission
          // only reads as such to the manager who previously decided it; if
          // the employee reassigned a project to a different manager, it's a
          // fresh submission for that manager, not a resubmission.
          if (managerId && managerId !== "all") {
            historyWhere.actorId = managerId;
          }
          const priorActionHistory = await ApprovalHistory.findAll({
            where: historyWhere,
            attributes: ["id"],
            limit: 1,
          });
          previouslyResubmitted = priorActionHistory.length > 0;
        }
      }

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
        submission_status: previouslyResubmitted ? "RESUBMITTED" : ts.status,
        missing_hours: parseFloat(missingHours.toFixed(2)),
        User: ts.User,
      };
    })
  );
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
