import { Op, UniqueConstraintError } from "sequelize";
import sequelize from "../config/db.js";
import Client from "../models/client.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import Timesheet from "../models/timesheet.model.js";
import TimeEntry from "../models/timeEntry.model.js";
import ApprovalHistory from "../models/approvalHistory.model.js";
import Notification from "../models/notification.model.js";
import * as notificationService from "./notification.service.js";

const toLocalDate = (date) => {
  if (typeof date === "string") {
    if (date.includes("T")) return new Date(date);
    return new Date(date + "T00:00:00");
  }
  return new Date(date);
};

const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getWeekStart = (date) => {
  const d = toLocalDate(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return formatDate(d);
};

const getWeekEnd = (date) => {
  const d = toLocalDate(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + 6);
  return formatDate(d);
};

export const getActiveClients = async () => {
  const clients = await Client.findAll({
    where: { status: "ACTIVE" },
    attributes: ["id", "name", "code", "status"],
    order: [["name", "ASC"]],
  });
  return clients;
};

export const getProjectsByClientId = async (clientId) => {
  const id = parseInt(clientId);
  if (isNaN(id)) throw new Error("Invalid client ID");
  return await Project.findAll({
    where: { clientId: id, status: "ACTIVE" },
    attributes: ["id", "name", "code", "managerId", "status"],
    order: [["name", "ASC"]],
  });
};

export const getManagerByProjectId = async (projectId) => {
  const id = parseInt(projectId);
  if (isNaN(id)) throw new Error("Invalid project ID");
  const project = await Project.findByPk(id, {
    attributes: ["managerId"],
    include: [
      {
        model: User,
        as: "Manager",
        attributes: ["id", "name", "email"],
      },
    ],
  });
  return project?.Manager || null;
};

export const getWeeklyTimesheet = async (userId, weekStartDate) => {
  const ws = weekStartDate || getWeekStart(new Date());
  const we = getWeekEnd(ws);

  let timesheet = await Timesheet.findOne({
    where: { userId, weekStartDate: ws },
  });

  if (!timesheet) {
    timesheet = await Timesheet.create({
      userId,
      weekStartDate: ws,
      weekEndDate: we,
      totalHours: 0,
      billableHours: 0,
      status: "DRAFT",
    });
  }

  const entries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, we] },
    },
    order: [["entryDate", "ASC"]],
  });

  let clientId = null;
  let projectId = null;
  let managerId = null;

  if (entries.length > 0) {
    clientId = entries[0].clientId || null;
    projectId = entries[0].projectId || null;
    managerId = entries[0].managerId || null;
  }

  let managerData = null;
  if (managerId) {
    managerData = await User.findByPk(managerId, {
      attributes: ["id", "name", "email"],
    });
  }

  return {
    timesheet: {
      id: timesheet.id,
      weekStartDate: timesheet.weekStartDate,
      weekEndDate: timesheet.weekEndDate,
      status: timesheet.status,
      totalHours: timesheet.totalHours,
    },
    entries: entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      hours: e.hours,
      description: e.description,
      comment: e.comment,
      status: e.status,
      clientId: e.clientId,
      projectId: e.projectId,
      managerId: e.managerId,
      client: e.client,
      project: e.project,
    })),
    clientId,
    projectId,
    managerId: managerData ? { id: managerData.id, name: managerData.name } : null,
    totalHours: timesheet.totalHours || 0,
  };
};

export const saveDraftTimesheet = async (userId, data) => {
  const { weekStartDate, dailyEntries } = data;

  if (!weekStartDate || !dailyEntries || !Array.isArray(dailyEntries)) {
    throw new Error("Missing required fields: weekStartDate and dailyEntries");
  }

  const ws = weekStartDate;
  const we = getWeekEnd(ws);

  let timesheet = await Timesheet.findOne({
    where: { userId, weekStartDate: ws },
  });

  if (!timesheet) {
    timesheet = await Timesheet.create({
      userId,
      weekStartDate: ws,
      weekEndDate: we,
      totalHours: 0,
      billableHours: 0,
      status: "DRAFT",
    });
  }

  if (timesheet.status === "APPROVED") {
    throw new Error("Cannot modify an approved timesheet");
  }

  for (const entry of dailyEntries) {
    const cId = entry.clientId ? parseInt(entry.clientId) : (data.clientId ? parseInt(data.clientId) : null);
    const pId = entry.projectId ? parseInt(entry.projectId) : (data.projectId ? parseInt(data.projectId) : null);

    if (!cId) continue;

    const findWhere = { userId, entryDate: entry.entryDate };
    findWhere.projectId = pId !== null ? pId : { [Op.is]: null };

    const existingEntry = await TimeEntry.findOne({ where: findWhere });
    if (existingEntry) continue;

    const client = await Client.findByPk(cId);
    if (client && client.status === "INACTIVE") {
      throw new Error(
        "The selected client is inactive. You cannot proceed with creating a project for this client."
      );
    }
  }

  for (const entry of dailyEntries) {
    const { entryDate, hours, description, comment } = entry;

    const cId = entry.clientId ? parseInt(entry.clientId) : (data.clientId ? parseInt(data.clientId) : null);
    const pId = entry.projectId ? parseInt(entry.projectId) : (data.projectId ? parseInt(data.projectId) : null);
    const mId = entry.managerId ? parseInt(entry.managerId) : (data.managerId ? parseInt(data.managerId) : null);

    let clientName = entry.clientName || "";
    let projectName = entry.projectName || "";

    if (!clientName && cId) {
      const cl = await Client.findByPk(cId);
      clientName = cl?.name || "";
    }
    if (!projectName && pId) {
      const pr = await Project.findByPk(pId);
      projectName = pr?.name || "";
    }

    const h = Math.max(0, parseFloat(hours) || 0);

    const findWhere = { userId, entryDate };
    if (pId !== null) {
      findWhere.projectId = pId;
    } else {
      findWhere.projectId = { [Op.is]: null };
    }

    const hasNoData = h === 0 && !description && !comment;

    const entryData = {
      userId,
      managerId: mId,
      clientId: cId,
      projectId: pId,
      client: clientName,
      project: projectName,
      task: projectName || "Weekly Timesheet",
      entryDate,
      hours: h,
      description: description || "",
      comment: comment || null,
      isBillable: true,
    };

    if (hasNoData) {
      const existingEntry = await TimeEntry.findOne({ where: findWhere });
      if (!existingEntry) continue;
      await existingEntry.update({ ...entryData, status: "DRAFT" });
    } else {
      const allowedStatuses = ["DRAFT", "SUBMITTED", "REJECTED"];
      try {
        const [existingEntry, created] = await TimeEntry.findOrCreate({
          where: findWhere,
          defaults: { ...entryData, status: "DRAFT" },
        });
        if (!created && allowedStatuses.includes(existingEntry.status)) {
          await existingEntry.update({ ...entryData, status: "DRAFT" });
        }
      } catch (err) {
        if (err instanceof UniqueConstraintError) {
          const existingEntry = await TimeEntry.findOne({ where: findWhere });
          if (existingEntry && allowedStatuses.includes(existingEntry.status)) {
            await existingEntry.update({ ...entryData, status: "DRAFT" });
          }
        } else {
          throw err;
        }
      }
    }
  }

  // Recalculate totalHours from ALL entries in the week (not just the saved
  // project) and derive the aggregate timesheet status from every project's
  // entries so that saving one project never clobbers a sibling's status.
  const allWeekEntries = await TimeEntry.findAll({
    where: { userId, entryDate: { [Op.between]: [ws, we] } },
  });
  const weekTotalHours = allWeekEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  const allStatuses = [...new Set(allWeekEntries.map((e) => e.status))];
  let aggregateStatus;
  if (allStatuses.length === 0 || allStatuses.every((s) => s === "DRAFT")) {
    aggregateStatus = "DRAFT";
  } else if (allStatuses.every((s) => s === "APPROVED")) {
    aggregateStatus = "APPROVED";
  } else if (allStatuses.some((s) => s === "SUBMITTED")) {
    aggregateStatus = "SUBMITTED";
  } else if (allStatuses.some((s) => s === "REJECTED")) {
    aggregateStatus = "REJECTED";
  } else {
    aggregateStatus = timesheet.status || "DRAFT";
  }

  await timesheet.update({ totalHours: weekTotalHours, status: aggregateStatus });

  const updatedEntries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, we] },
    },
    order: [["entryDate", "ASC"]],
  });

  return {
    timesheet: {
      id: timesheet.id,
      weekStartDate: timesheet.weekStartDate,
      weekEndDate: timesheet.weekEndDate,
      status: timesheet.status,
      totalHours: timesheet.totalHours,
    },
    entries: updatedEntries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      hours: e.hours,
      description: e.description,
      comment: e.comment,
      status: e.status,
      clientId: e.clientId,
      projectId: e.projectId,
      managerId: e.managerId,
      client: e.client,
      project: e.project,
    })),
    totalHours: weekTotalHours,
  };
};

export const submitTimesheet = async (userId, data) => {
  const { weekStartDate, projectId } = data;

  if (!weekStartDate) {
    throw new Error("weekStartDate is required");
  }

  const ws = weekStartDate;
  const we = getWeekEnd(ws);

  let timesheet = await Timesheet.findOne({
    where: { userId, weekStartDate: ws },
  });

  if (!timesheet) {
    throw new Error("No timesheet found for this week. Please save a draft first.");
  }

  // Submitting is scoped to ONE project's entries — every project has its
  // own independent Draft → Submitted → Rejected/Approved lifecycle, so this
  // must never touch another project's entries or their status.
  const pId = projectId !== undefined && projectId !== null && projectId !== "null"
    ? parseInt(projectId)
    : null;
  const projectWhere = pId !== null ? pId : { [Op.is]: null };

  const projectEntries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, we] },
      projectId: projectWhere,
    },
  });

  const projectTotalHours = projectEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  if (projectTotalHours <= 0) {
    throw new Error("Cannot submit an empty project. Add at least some hours.");
  }

  if (!projectEntries.some((e) => e.clientId)) {
    throw new Error("Please assign a client and project before submitting.");
  }

  if (projectEntries.every((e) => e.status === "APPROVED")) {
    throw new Error("This project has already been approved.");
  }

  if (projectEntries.every((e) => e.status === "SUBMITTED")) {
    throw new Error("This project has already been submitted.");
  }

  let weekTotalHours = 0;
  let aggregateStatus;
  const t = await sequelize.transaction();

  try {
    const updatePromises = [];

    for (const entry of projectEntries) {
      if (entry.status !== "APPROVED") {
        const dailyEntry = (data.dailyEntries || []).find(
          (de) => de.entryDate === entry.entryDate && Number(de.projectId || 0) === Number(entry.projectId || 0)
        );
        const updateFields = { status: "SUBMITTED" };
        if (dailyEntry?.managerId) {
          updateFields.managerId = dailyEntry.managerId;
        }
        if (dailyEntry && dailyEntry.comment !== undefined) {
          updateFields.comment = dailyEntry.comment || null;
        }
        updatePromises.push(
          TimeEntry.update(updateFields, { where: { id: entry.id }, transaction: t })
        );
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // The parent Timesheet's totalHours/status is a week-level aggregate
    // (used by manager/admin dashboards, the Team Timesheets list, and
    // reminder cron jobs) — derive the aggregate status from ALL entries'
    // individual statuses so that submitting one project never overwrites
    // a sibling project's Approved/Rejected state.
    const allWeekEntries = await TimeEntry.findAll({
      where: { userId, entryDate: { [Op.between]: [ws, we] } },
      transaction: t,
    });
    weekTotalHours = allWeekEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

    const allStatuses = [...new Set(allWeekEntries.map((e) => e.status))];
    if (allStatuses.length === 0 || allStatuses.every((s) => s === "DRAFT")) {
      aggregateStatus = "DRAFT";
    } else if (allStatuses.every((s) => s === "APPROVED")) {
      aggregateStatus = "APPROVED";
    } else if (allStatuses.some((s) => s === "SUBMITTED")) {
      aggregateStatus = "SUBMITTED";
    } else if (allStatuses.some((s) => s === "REJECTED")) {
      aggregateStatus = "REJECTED";
    } else {
      aggregateStatus = "SUBMITTED";
    }

    await timesheet.update({ totalHours: weekTotalHours, status: aggregateStatus }, { transaction: t });

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  try {
    const ApprovalHistory = (await import("../models/approvalHistory.model.js")).default;
    await ApprovalHistory.create({
      timeEntryId: null,
      timesheetId: timesheet.id,
      actorId: userId,
      action: "SUBMITTED",
      comment: "Timesheet submitted via EmployeeTimeIQ",
    });
  } catch (e) {
    console.error("Failed to create approval history (non-blocking):", e.message);
  }

  try {
    const dailyManagerId = (data.dailyEntries || []).find((de) => de.managerId)?.managerId;
    const managerEntry = projectEntries.find((e) => e.managerId);
    const effectiveManagerId = dailyManagerId ? Number(dailyManagerId) : (managerEntry?.managerId || null);
    const employeeUser = await User.findByPk(userId, { attributes: ["id", "name", "managerId"] });
    const record = {
      id: timesheet.id,
      userId,
      managerId: effectiveManagerId || employeeUser?.managerId,
      weekStartDate: ws,
      weekEndDate: we,
      User: employeeUser ? { name: employeeUser.name, managerId: employeeUser.managerId } : null,
    };

    // A resubmission only counts as such to the manager CURRENTLY assigned —
    // if the employee reassigned this project to a different manager (e.g.
    // via the Project Details edit), that manager is seeing it for the first
    // time, so it's a fresh submission, not a resubmission. The (userId,
    // projectId) branch is what still finds a prior decision after the
    // project was Cancelled and re-added, since the original entries (and
    // their ids) no longer exist.
    const projectEntryIds = projectEntries.map((e) => e.id);
    const priorDecision = effectiveManagerId && (projectEntryIds.length > 0 || pId !== null)
      ? await ApprovalHistory.findOne({
          where: {
            action: { [Op.in]: ["APPROVED", "REJECTED"] },
            actorId: effectiveManagerId,
            [Op.or]: [
              ...(projectEntryIds.length > 0 ? [{ timeEntryId: { [Op.in]: projectEntryIds } }] : []),
              ...(pId !== null ? [{ userId, projectId: pId }] : []),
            ],
          },
          attributes: ["id"],
          limit: 1,
        })
      : null;

    if (priorDecision) {
      await notificationService.notifyTimesheetResubmitted(record);
    } else {
      await notificationService.notifyTimesheetSubmitted(record);
    }
  } catch (e) {
    console.error("Failed to send submission notifications (non-blocking):", e.message);
  }

  return { timesheet: { id: timesheet.id, status: aggregateStatus, totalHours: weekTotalHours }, totalHours: weekTotalHours };
};

export const updateTimesheet = async (userId, data) => {
  const { weekStartDate, projectId } = data;

  if (!weekStartDate) {
    throw new Error("weekStartDate is required");
  }

  const ws = weekStartDate;

  let timesheet = await Timesheet.findOne({
    where: { userId, weekStartDate: ws },
  });

  if (!timesheet) {
    throw new Error("No timesheet found for this week.");
  }

  // Update (revert-to-draft) is scoped to ONE project — every project has
  // its own independent lifecycle, so this must never touch another
  // project's entries or status.
  const hasProjectScope = projectId !== undefined && projectId !== null && projectId !== "null";
  const pId = hasProjectScope ? parseInt(projectId) : null;
  const projectWhere = pId !== null ? pId : { [Op.is]: null };

  const scopeWhere = hasProjectScope
    ? { userId, entryDate: { [Op.between]: [ws, timesheet.weekEndDate] }, projectId: projectWhere }
    : { userId, entryDate: { [Op.between]: [ws, timesheet.weekEndDate] } };

  const scopedEntries = await TimeEntry.findAll({ where: scopeWhere });
  const revertableEntries = scopedEntries.filter(
    (e) => e.status === "SUBMITTED" || e.status === "REJECTED" || e.status === "APPROVED"
  );

  if (revertableEntries.length === 0) {
    throw new Error("Nothing to update: this project has no submitted or rejected entries.");
  }

  for (const entry of revertableEntries) {
    await entry.update({ status: "DRAFT" });
  }

  // Reconcile the week-level aggregate from everything else in the week —
  // another project may still be legitimately Submitted or Approved, but
  // never lock the timesheet as APPROVED when entries were just reverted
  // to DRAFT — that would block the employee from editing and resubmitting.
  const allEntries = await TimeEntry.findAll({
    where: { userId, entryDate: { [Op.between]: [ws, timesheet.weekEndDate] } },
  });
  let newStatus;
  const hasDraft = allEntries.some((e) => e.status === "DRAFT");
  const hasSubmitted = allEntries.some((e) => e.status === "SUBMITTED");
  const hasApproved = allEntries.some((e) => e.status === "APPROVED");
  if (hasSubmitted) {
    newStatus = "SUBMITTED";
  } else if (hasApproved && !hasDraft) {
    newStatus = "APPROVED";
  } else {
    newStatus = "DRAFT";
  }
  await timesheet.update({ status: newStatus });

  return { timesheet: { id: timesheet.id, status: newStatus }, message: "Project reverted to draft." };
};

// Correcting Client/Project/Manager on a row must never touch its hours,
// comments, or approval status — this reassigns the existing entries to the
// new project in place, independent of whether the row is Draft, Pending,
// Approved, or Rejected.
export const updateProjectDetails = async (userId, data) => {
  const { weekStartDate, oldProjectId, clientId, projectId, managerId } = data;

  if (!weekStartDate) {
    throw new Error("weekStartDate is required");
  }
  if (!clientId || !projectId) {
    throw new Error("Client and Project are required");
  }

  const ws = weekStartDate;

  const timesheet = await Timesheet.findOne({ where: { userId, weekStartDate: ws } });
  if (!timesheet) {
    throw new Error("No timesheet found for this week.");
  }

  const cId = parseInt(clientId);
  const pId = parseInt(projectId);
  const mId = managerId !== undefined && managerId !== null && managerId !== "" ? parseInt(managerId) : null;

  const client = await Client.findByPk(cId);
  if (client && client.status === "INACTIVE") {
    throw new Error(
      "The selected client is inactive. You cannot proceed with creating a project for this client."
    );
  }

  const hasOldScope = oldProjectId !== undefined && oldProjectId !== null && oldProjectId !== "null";
  const oldPId = hasOldScope ? parseInt(oldProjectId) : null;
  const oldProjectWhere = oldPId !== null ? oldPId : { [Op.is]: null };

  const entries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, timesheet.weekEndDate] },
      projectId: oldProjectWhere,
    },
  });
  if (entries.length === 0) {
    throw new Error("No entries found for this project.");
  }

  if (oldPId !== pId) {
    // The (userId, entryDate, projectId) uniqueness invariant means the new
    // project must not already have its own separate row this week.
    const conflict = await TimeEntry.findOne({
      where: {
        userId,
        entryDate: { [Op.between]: [ws, timesheet.weekEndDate] },
        projectId: pId,
      },
    });
    if (conflict) {
      throw new Error("This project is already added for this week.");
    }
  }

  const project = await Project.findByPk(pId);
  const clientName = client?.name || "";
  const projectName = project?.name || "";

  for (const entry of entries) {
    await entry.update({
      clientId: cId,
      projectId: pId,
      managerId: mId,
      client: clientName,
      project: projectName,
      task: projectName || entry.task,
    });
  }

  return { message: "Project details updated." };
};

// A timesheet week can hold several projects, each routed to its own manager.
// The result here is grouped per project (matching the frontend's own
// per-project row grouping) so one manager's approve/reject doesn't get
// displayed against a different manager's project.
export const getManagerAction = async (timesheetId) => {
  const timesheet = await Timesheet.findByPk(timesheetId, {
    attributes: ["id", "userId", "weekStartDate", "weekEndDate"],
  });
  if (!timesheet) return [];

  const entries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: { [Op.between]: [timesheet.weekStartDate, timesheet.weekEndDate] },
    },
    attributes: ["id", "projectId", "client", "project", "status"],
  });
  if (entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id);
  const projectIds = [...new Set(entries.map((e) => e.projectId).filter((p) => p !== null && p !== undefined))];

  // Match history either by a still-alive entry (covers Update→resubmit,
  // where the entries persist) or by (userId, projectId) — the latter is
  // what survives a Cancel, which detaches the entries tied to it. Without
  // this, a rejected project that's cancelled and re-added would lose all
  // memory of ever having been decided, and read as a first-time Pending
  // submission instead of a resubmission.
  const histories = await ApprovalHistory.findAll({
    where: {
      action: { [Op.in]: ["APPROVED", "REJECTED"] },
      [Op.or]: [
        { timeEntryId: { [Op.in]: entryIds } },
        ...(projectIds.length > 0 ? [{ userId: timesheet.userId, projectId: { [Op.in]: projectIds } }] : []),
      ],
    },
    include: [{ model: User, as: "Actor", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
  });

  // Same row key the frontend uses to group entries into project rows
  const rowKeyFor = (entry) =>
    entry.projectId ? `proj-${entry.projectId}` : `unassigned-${entry.client || ""}-${entry.project || ""}`;

  const groups = new Map();
  entries.forEach((entry) => {
    const key = rowKeyFor(entry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  const actions = [];
  groups.forEach((groupEntries, rowId) => {
    const groupEntryIds = new Set(groupEntries.map((e) => e.id));
    const groupProjectId = groupEntries[0]?.projectId ?? null;
    // histories is ordered newest-first, so the first match is this project's
    // latest action — whether tied to a still-alive entry or to a project
    // that was previously cancelled and re-added.
    const latestHistory = histories.find(
      (h) => groupEntryIds.has(h.timeEntryId) || (groupProjectId !== null && Number(h.projectId) === Number(groupProjectId))
    );
    if (!latestHistory) return; // never decided by any manager — nothing to report

    // `status` reflects the LIVE decision only — once the employee reverts
    // this row to Draft and resubmits, it goes back to null even though a
    // past decision exists, so the frontend can tell "currently Approved/
    // Rejected" apart from "was decided once, now Pending again".
    const statuses = groupEntries.map((e) => e.status);
    let status = null;
    if (statuses.every((s) => s === "APPROVED")) status = "APPROVED";
    else if (statuses.some((s) => s === "REJECTED")) status = "REJECTED";

    actions.push({
      rowId,
      status,
      // Who made the most recent decision — the frontend compares this
      // against the row's CURRENT managerId to tell a genuine resubmission
      // to the same manager (Re-Submitted) apart from a first submission to
      // a newly assigned one (Pending).
      priorActorId: latestHistory.actorId,
      managerName: latestHistory.Actor?.name || "Unknown",
      comment: latestHistory.comment || "",
      date: latestHistory.createdAt || null,
    });
  });

  return actions;
};

export const cancelTimesheet = async (userId, weekStartDate, projectId) => {
  const ws = weekStartDate;
  const we = getWeekEnd(ws);

  let timesheet = await Timesheet.findOne({
    where: { userId, weekStartDate: ws },
  });

  if (!timesheet) {
    return {
      timesheet: null,
      entries: [],
      totalHours: 0,
    };
  }

  if (timesheet.status === "APPROVED") {
    throw new Error("Cannot cancel an approved timesheet");
  }

  const hasProjectScope = projectId !== undefined && projectId !== null && projectId !== "null";
  const pId = hasProjectScope ? parseInt(projectId) : null;
  const projectWhere = pId !== null ? pId : { [Op.is]: null };

  if (timesheet.status === "SUBMITTED" || timesheet.status === "REJECTED") {
    // Cancel is scoped to ONE project — every project has its own
    // independent lifecycle, so cancelling one must never remove or affect
    // another project's entries or status. Without this, a week whose
    // aggregate status is REJECTED (no sibling project still Submitted)
    // would fall through to the whole-week wipe below.
    const scopeWhere = hasProjectScope
      ? { userId, entryDate: { [Op.between]: [ws, we] }, projectId: projectWhere }
      : { userId, entryDate: { [Op.between]: [ws, we] } };

    const scopedEntries = await TimeEntry.findAll({ where: scopeWhere });
    // Manager-approved entries are never touched by Cancel — only the
    // still-pending (non-approved) entries for this project get removed.
    const cancelableEntries = scopedEntries.filter((e) => e.status !== "APPROVED");

    if (cancelableEntries.length === 0) {
      throw new Error("Nothing to cancel: this project has already been approved.");
    }

    const cancelableIds = cancelableEntries.map((e) => e.id);

    await TimeEntry.destroy({ where: { id: { [Op.in]: cancelableIds } } });

    // Detach (don't destroy) ApprovalHistory tied to the entries we just
    // deleted — userId/projectId on these rows are what let a later
    // resubmission of this same project still read as "previously decided
    // by this manager" (Re-Submitted) even though the original entries and
    // their ids are gone.
    await ApprovalHistory.update(
      { timeEntryId: null },
      { where: { timeEntryId: { [Op.in]: cancelableIds } } }
    );

    // Recompute the week-level aggregate from whatever's left across ALL
    // projects — another project may still be legitimately Submitted or
    // Approved even though this one was just cancelled.
    const remainingEntries = await TimeEntry.findAll({
      where: { userId, entryDate: { [Op.between]: [ws, we] } },
    });

    if (remainingEntries.length === 0) {
      // Nothing left anywhere in the week — fully remove the timesheet and
      // its submission trail so it leaves no trace in Reports, Approvals,
      // Team Timesheets, the Dashboard, or anyone's notifications.
      await ApprovalHistory.destroy({ where: { timesheetId: timesheet.id } });
      await Notification.destroy({ where: { type: "SUBMITTED", relatedId: timesheet.id } });
      await timesheet.destroy();

      return {
        timesheet: null,
        entries: [],
        totalHours: 0,
      };
    }

    const remainingTotal = remainingEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
    let newStatus;
    if (remainingEntries.some((e) => e.status === "SUBMITTED")) {
      newStatus = "SUBMITTED";
    } else if (remainingEntries.some((e) => e.status === "APPROVED")) {
      newStatus = "APPROVED";
    } else {
      newStatus = "DRAFT";
    }

    // Only clear the week's submission trail once nothing is pending or
    // approved anywhere else — another project's own submission may still
    // be legitimately in flight and must keep its history intact.
    if (newStatus === "DRAFT") {
      await ApprovalHistory.destroy({ where: { timesheetId: timesheet.id } });
      await Notification.destroy({ where: { type: "SUBMITTED", relatedId: timesheet.id } });
    }

    await timesheet.update({ totalHours: remainingTotal, status: newStatus });

    return {
      timesheet: {
        id: timesheet.id,
        weekStartDate: timesheet.weekStartDate,
        weekEndDate: timesheet.weekEndDate,
        status: newStatus,
        totalHours: remainingTotal,
      },
      entries: [],
      totalHours: remainingTotal,
    };
  }

  await TimeEntry.destroy({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, we] },
    },
  });

  await timesheet.update({ totalHours: 0, billableHours: 0 });

  return {
    timesheet: {
      id: timesheet.id,
      weekStartDate: timesheet.weekStartDate,
      weekEndDate: timesheet.weekEndDate,
      status: timesheet.status,
      totalHours: timesheet.totalHours,
    },
    entries: [],
    totalHours: 0,
  };
};

export const deleteProjectEntries = async (userId, weekStartDate, projectId, clientName, projectName) => {
  const ws = weekStartDate;
  const we = getWeekEnd(ws);

  const whereClause = {
    userId,
    entryDate: { [Op.between]: [ws, we] },
  };
  const pId = projectId !== null && projectId !== undefined && projectId !== "null"
    ? parseInt(projectId)
    : null;
  if (pId !== null) {
    whereClause.projectId = pId;
  } else {
    whereClause.projectId = { [Op.is]: null };
    if (clientName) whereClause.client = clientName;
    if (projectName) whereClause.project = projectName;
  }

  await TimeEntry.destroy({ where: whereClause });

  const remainingEntries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, we] },
    },
  });

  const totalHours = remainingEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  const timesheet = await Timesheet.findOne({
    where: { userId, weekStartDate: ws },
  });

  if (timesheet) {
    await timesheet.update({ totalHours });
  }

  return {
    timesheet: timesheet
      ? {
          id: timesheet.id,
          weekStartDate: timesheet.weekStartDate,
          weekEndDate: timesheet.weekEndDate,
          status: timesheet.status,
          totalHours: timesheet.totalHours,
        }
      : null,
    totalHours,
  };
};
