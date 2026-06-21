import { Op, UniqueConstraintError } from "sequelize";
import Client from "../models/client.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import Timesheet from "../models/timesheet.model.js";
import TimeEntry from "../models/timeEntry.model.js";
import ApprovalHistory from "../models/approvalHistory.model.js";

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

    const hasNoData = h === 0 && !description;

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

  await timesheet.update({ totalHours, status: "SUBMITTED" });

  for (const entry of entries) {
    if (entry.status !== "APPROVED") {
      await entry.update({ status: "SUBMITTED" });
    }
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

  if (timesheet.status !== "SUBMITTED") {
    throw new Error("Only submitted timesheets can be updated via this endpoint.");
  }

  await timesheet.update({ status: "DRAFT" });

  const entries = await TimeEntry.findAll({
    where: {
      userId,
      entryDate: { [Op.between]: [ws, timesheet.weekEndDate] },
    },
  });

  for (const entry of entries) {
    if (entry.status === "SUBMITTED") {
      await entry.update({ status: "DRAFT" });
    }
  }

  return { timesheet: { id: timesheet.id, status: "DRAFT" }, message: "Timesheet reverted to draft." };
};

export const getManagerAction = async (timesheetId) => {
  const timesheet = await Timesheet.findByPk(timesheetId, {
    attributes: ["id", "userId", "weekStartDate", "weekEndDate"],
  });
  if (!timesheet) return null;

  const entries = await TimeEntry.findAll({
    where: {
      userId: timesheet.userId,
      entryDate: { [Op.between]: [timesheet.weekStartDate, timesheet.weekEndDate] },
    },
    attributes: ["id"],
  });

  const entryIds = entries.map((e) => e.id);
  if (entryIds.length === 0) return null;

  const action = await ApprovalHistory.findOne({
    where: {
      timeEntryId: { [Op.in]: entryIds },
      action: { [Op.in]: ["APPROVED", "REJECTED"] },
    },
    include: [{ model: User, as: "Actor", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
  });

  if (!action) return null;

  return {
    status: action.action,
    managerName: action.Actor?.name || "Unknown",
    comment: action.comment || "",
    date: action.createdAt,
  };
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
    throw new Error("Cannot cancel a submitted timesheet. Use Update to revert to draft first.");
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
