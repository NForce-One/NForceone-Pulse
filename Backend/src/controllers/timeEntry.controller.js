import * as timeEntryService from "../services/timeEntry.service.js";
import * as notificationService from "../services/notification.service.js";

// ================= CREATE =================
export const createTimeEntry = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ FIXED VALIDATION (removed managerId)
    if (!req.body.client || !req.body.project || !req.body.task || !req.body.hours) {
      return res.status(400).json({
        success: false,
        message: "Client, Project, Task and Hours are required",
      });
    }

    // ✅ Ensure valid date
    const entryDate = req.body.date
      ? new Date(req.body.date)
      : new Date();

    // ✅ Look up IDs from string values if not provided
    let clientId = req.body.clientId || null;
    let projectId = req.body.projectId || null;
    let taskId = req.body.taskId || null;

    const Client = (await import("../models/client.model.js")).default;
    const Project = (await import("../models/project.model.js")).default;
    const Task = (await import("../models/task.model.js")).default;

    if (!clientId && req.body.client) {
      const client = await Client.findOne({ where: { name: req.body.client } });
      if (client) clientId = client.id;
    }

    if (!projectId && req.body.project) {
      const project = await Project.findOne({ where: { name: req.body.project } });
      if (project) projectId = project.id;
    }

    if (!taskId && req.body.task) {
      const task = await Task.findOne({ where: { title: req.body.task } });
      if (task) taskId = task.id;
    }

    // FINAL DATA (clean + matches model)
    const normalizedData = {
      userId, // comes from logged-in user
      client: req.body.client || null,
      project: req.body.project,
      task: req.body.task,
      entryDate,
      hours: Number(req.body.hours),
      description: req.body.description || "",
      managerId: req.body.managerId || null,
      clientId,
      projectId,
      taskId,
      status: "DRAFT",
    };

    console.log("SAVING DATA:", normalizedData);

    const entry = await timeEntryService.createTimeEntry(normalizedData);

    res.status(201).json({
      success: true,
      data: entry,
    });

  } catch (error) {
    console.error("CREATE ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET ALL =================
export const getTimeEntries = async (req, res) => {
  try {
    const user = req.user;

    let entries;

    if (user.role === "EMPLOYEE") {
      entries = await timeEntryService.getEntriesByUser(user.id);
    } else if (user.role === "MANAGER") {
      entries = await timeEntryService.getEntriesByManager(user.id);
    } else {
      entries = await timeEntryService.getAllTimeEntries();
    }

    res.json({
      success: true,
      data: entries,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= UPDATE =================
export const updateTimeEntry = async (req, res) => {
  try {
    const user = req.user;
    const id = req.params.id;

    let updateData = { ...req.body };

    if (user.role === "EMPLOYEE") {
      updateData = {
        project: req.body.project,
        task: req.body.task,
        entryDate: req.body.entryDate,
        hours: req.body.hours,
        description: req.body.description,
      };
    }

    // ✅ Look up IDs from string values if not provided
    const Client = (await import("../models/client.model.js")).default;
    const Project = (await import("../models/project.model.js")).default;
    const Task = (await import("../models/task.model.js")).default;

    if (!updateData.clientId && updateData.client) {
      const client = await Client.findOne({ where: { name: updateData.client } });
      if (client) updateData.clientId = client.id;
    }

    if (!updateData.projectId && updateData.project) {
      const project = await Project.findOne({ where: { name: updateData.project } });
      if (project) updateData.projectId = project.id;
    }

    if (!updateData.taskId && updateData.task) {
      const task = await Task.findOne({ where: { title: updateData.task } });
      if (task) updateData.taskId = task.id;
    }

    const entry = await timeEntryService.updateTimeEntry(id, updateData);

    res.json({
      success: true,
      data: entry,
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= DELETE =================
export const deleteTimeEntry = async (req, res) => {
  try {
    const result = await timeEntryService.deleteTimeEntry(req.params.id);

    res.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= SUBMIT =================
export const submitTimeEntry = async (req, res) => {
  try {
    const user = req.user;
    const id = req.params.id;

    if (user.role !== "EMPLOYEE") {
      return res.status(403).json({
        success: false,
        message: "Only employee can submit",
      });
    }

    const entry = await timeEntryService.getTimeEntryById(id);

    if (!entry) throw new Error("Time entry not found");

    if (entry.status !== "DRAFT") {
      throw new Error("Only DRAFT entries can be submitted");
    }

    entry.status = "SUBMITTED";
    await entry.save();

    await notificationService.notifyTimesheetSubmitted(entry);

    res.json({
      success: true,
      data: entry,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= APPROVE =================
export const approveTimeEntry = async (req, res) => {
  try {
    const user = req.user;
    const id = req.params.id;

    if (!["ADMIN", "MANAGER"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only manager/admin can approve",
      });
    }

    const entry = await timeEntryService.getTimeEntryById(id);

    if (!entry) throw new Error("Time entry not found");

    entry.status = "APPROVED";
    await entry.save();

    await notificationService.notifyTimesheetApproved(entry);

    res.json({
      success: true,
      data: entry,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= REJECT =================
export const rejectTimeEntry = async (req, res) => {
  try {
    const user = req.user;
    const id = req.params.id;

    if (!["ADMIN", "MANAGER"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only manager/admin can reject",
      });
    }

    const entry = await timeEntryService.getTimeEntryById(id);

    if (!entry) throw new Error("Time entry not found");

    entry.status = "REJECTED";
    await entry.save();

    await notificationService.notifyTimesheetRejected(entry);

    res.json({
      success: true,
      data: entry,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};