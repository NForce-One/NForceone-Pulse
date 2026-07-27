import { Op, UniqueConstraintError } from "sequelize";
import sequelize from "../config/db.js";
import Client from "../models/client.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import Timesheet from "../models/timesheet.model.js";
import TimeEntry from "../models/timeEntry.model.js";
import ApprovalHistory from "../models/approvalHistory.model.js";
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

  let totalHours = 0;

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
    totalHours += h;

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

  if (timesheet.status === "SUBMITTED" || timesheet.status === "REJECTED") {
    await timesheet.update({ totalHours, status: "DRAFT" });
  } else {
    await timesheet.update({ totalHours });
  }

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
    totalHours,
  };
};

export const submitTimesheet = async (userId, data) => {
  const { weekStartDate } = data;

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

  if (timesheet.status === "SUBMITTED") {
    throw new Error("Timesheet is already submitted");
  }

  if (timesheet.status === "APPROVED") {
    throw new Error("Cannot submit an approved timesheet");
  }

  const entries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, we] },
    },
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

  if (totalHours <= 0) {
    throw new Error("Cannot submit an empty timesheet. Add at least some hours.");
  }

  if (!entries.some((e) => e.clientId && e.projectId)) {
    throw new Error("Please assign a client and project before submitting.");
  }

  const t = await sequelize.transaction();

  try {
    await timesheet.update({ totalHours, status: "SUBMITTED" }, { transaction: t });

    const updatePromises = [];

    for (const entry of entries) {
      if (entry.status !== "APPROVED") {
        const dailyEntry = (data.dailyEntries || []).find(
          (de) => de.entryDate === entry.entryDate && Number(de.projectId) === Number(entry.projectId)
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
    const managerEntry = entries.find((e) => e.managerId);
    const managerId = managerEntry?.managerId || null;
    const employeeUser = await User.findByPk(userId, { attributes: ["id", "name", "managerId"] });
    const record = {
      id: timesheet.id,
      userId,
      managerId: managerId || employeeUser?.managerId,
      weekStartDate: ws,
      weekEndDate: we,
      User: employeeUser ? { name: employeeUser.name, managerId: employeeUser.managerId } : null,
    };
    await notificationService.notifyTimesheetSubmitted(record);
  } catch (e) {
    console.error("Failed to send submission notifications (non-blocking):", e.message);
  }

  return { timesheet: { id: timesheet.id, status: timesheet.status, totalHours }, totalHours };
};

export const updateTimesheet = async (userId, data) => {
  const { weekStartDate } = data;

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

  if (timesheet.status !== "SUBMITTED" && timesheet.status !== "REJECTED") {
    throw new Error("Only submitted or rejected timesheets can be updated via this endpoint.");
  }

  await timesheet.update({ status: "DRAFT" });

  const entries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, timesheet.weekEndDate] },
    },
  });

  for (const entry of entries) {
    if (entry.status === "SUBMITTED" || entry.status === "REJECTED") {
      await entry.update({ status: "DRAFT" });
    }
  }

  return { timesheet: { id: timesheet.id, status: "DRAFT" }, message: "Timesheet reverted to draft." };
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
  const histories = await ApprovalHistory.findAll({
    where: {
      timeEntryId: { [Op.in]: entryIds },
      action: { [Op.in]: ["APPROVED", "REJECTED"] },
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
    const statuses = groupEntries.map((e) => e.status);
    let status = null;
    if (statuses.every((s) => s === "APPROVED")) status = "APPROVED";
    else if (statuses.some((s) => s === "REJECTED")) status = "REJECTED";
    if (!status) return; // this project is still pending/draft — nothing decided yet

    const groupEntryIds = new Set(groupEntries.map((e) => e.id));
    // histories is ordered newest-first, so the first match is this project's latest action
    const latestHistory = histories.find((h) => groupEntryIds.has(h.timeEntryId));

    actions.push({
      rowId,
      status,
      managerName: latestHistory?.Actor?.name || "Unknown",
      comment: latestHistory?.comment || "",
      date: latestHistory?.createdAt || null,
    });
  });

  return actions;
};

export const cancelTimesheet = async (userId, weekStartDate) => {
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

  if (timesheet.status === "SUBMITTED") {
    const approvedCount = await TimeEntry.count({
      where: {
        userId,
        entryDate: { [Op.between]: [ws, we] },
        status: "APPROVED",
      },
    });
    if (approvedCount > 0) {
      throw new Error("Cannot cancel: some entries for this week have already been approved.");
    }

    await TimeEntry.destroy({
      where: {
        userId,
        entryDate: { [Op.between]: [ws, we] },
      },
    });

    // Fully remove the timesheet record itself (not just its entries) so a
    // cancelled submission leaves no trace in Reports, Approvals, Team
    // Timesheets, or the Dashboard — it's as if the week was never touched.
    await timesheet.destroy();

    return {
      timesheet: null,
      entries: [],
      totalHours: 0,
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
