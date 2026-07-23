import * as timeEntryService from "../services/timeEntry.service.js";
import * as reportService from "../services/report.service.js";
import ApprovalHistory from "../models/approvalHistory.model.js";
import User from "../models/user.model.js";
import { sendEmail } from "../services/email.service.js";
import { Op } from "sequelize";
import Timesheet from "../models/timesheet.model.js";
import TimeEntryModel from "../models/timeEntry.model.js";
import { approvedTimesheetTemplate } from "../templates/approvedTimesheet.template.js";
import { rejectedTimesheetTemplate } from "../templates/rejectedTimesheet.template.js";
import { parseDateSafe, toDateOnlyString } from "../utils/dateUtils.js";

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

    // ✅ Ensure valid date (safe YYYY-MM-DD parsing)
    const entryDate = req.body.date ? parseDateSafe(req.body.date) : new Date();
    if (req.body.date && !entryDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

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

    const workingHours = await reportService.getUserWorkingHours(userId);

    res.status(201).json({
      success: true,
      data: entry,
      workingHours,
    });

  } catch (error) {
    console.error("CREATE ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= PENDING APPROVAL COUNT =================
export const getPendingApprovalCount = async (req, res) => {
  try {
    const { id, role } = req.user;
    const count = await timeEntryService.getPendingApprovalCount(id, role);
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ALL =================
export const getTimeEntries = async (req, res) => {
  try {
    const user = req.user;
    const isApprovals = req.query.for === "approvals";

    let entries;

    if (isApprovals) {
      if (user.role === "MANAGER") {
        entries = await timeEntryService.getSubmittedToManager(user.id);
      } else if (user.role === "ADMIN") {
        entries = await timeEntryService.getManagerEntriesForAdmin();
      } else {
        entries = await timeEntryService.getEntriesByUser(user.id);
      }
    } else {
      if (user.role === "EMPLOYEE" || user.role === "MANAGER") {
        entries = await timeEntryService.getEntriesByUser(user.id);
      } else {
        entries = await timeEntryService.getAllTimeEntries();
      }
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
        entryDate: req.body.entryDate ? parseDateSafe(req.body.entryDate) : undefined,
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

    const workingHours = await reportService.getUserWorkingHours(user.id);

    res.json({
      success: true,
      data: entry,
      workingHours,
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

    const workingHours = await reportService.getUserWorkingHours(req.user.id);

    res.json({
      success: true,
      message: result.message,
      workingHours,
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

    if (!["ADMIN", "MANAGER", "EMPLOYEE"].includes(user.role)) {
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

    const workingHours = await reportService.getUserWorkingHours(user.id);

    res.json({
      success: true,
      data: entry,
      workingHours,
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
    const { comment } = req.body;

    console.log("[TIME-ENTRY-APPROVE] ===== START =====");
    console.log("[TIME-ENTRY-APPROVE] entryId:", id, "managerId:", user.id);

    if (!["ADMIN", "MANAGER"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only manager/admin can approve",
      });
    }

    const entry = await timeEntryService.getTimeEntryById(id);

    if (!entry) throw new Error("Time entry not found");
    console.log("[TIME-ENTRY-APPROVE] Entry found, userId:", entry.userId, "project:", entry.project);

    entry.status = "APPROVED";
    await entry.save();
    console.log("[TIME-ENTRY-APPROVE] Entry status updated to APPROVED");

    await ApprovalHistory.create({
      timeEntryId: entry.id,
      actorId: user.id,
      action: "APPROVED",
      comment: comment || null,
    });
    console.log("[TIME-ENTRY-APPROVE] Approval history created");

    // 📧 Check if ALL entries in this week are now APPROVED → send weekly summary email
    console.log("[TIME-ENTRY-APPROVE] ===== CHECKING ALL ENTRIES FOR WEEK =====");
    try {
      const rawDate = entry.entryDate;
      console.log("[TIME-ENTRY-APPROVE] raw entryDate value:", JSON.stringify(rawDate), "type:", typeof rawDate);

      const entryDateStr = typeof rawDate === 'string' ? rawDate : toDateOnlyString(rawDate);
      console.log("[TIME-ENTRY-APPROVE] entryDateStr used for parsing:", entryDateStr);
      const entryDateObj = new Date(entryDateStr + "T00:00:00");
      const dayOfWeek = entryDateObj.getDay();
      const weekStart = new Date(entryDateObj);
      weekStart.setDate(entryDateObj.getDate() - dayOfWeek);
      const weekStartStr = toDateOnlyString(weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekEndStr = toDateOnlyString(weekEnd);
      console.log("[TIME-ENTRY-APPROVE] Week range:", weekStartStr, "to", weekEndStr);

      const allWeekEntries = await TimeEntryModel.findAll({
        where: {
          userId: entry.userId,
          entryDate: { [Op.gte]: weekStartStr, [Op.lte]: weekEndStr },
        },
        attributes: ["id", "project", "entryDate", "hours", "status"],
      });
      console.log("[TIME-ENTRY-APPROVE] All entries in week:", allWeekEntries.length);
      console.log("[TIME-ENTRY-APPROVE] Entry statuses:", allWeekEntries.map(e => ({ id: e.id, date: e.entryDate, status: e.status })));

      const allApproved = allWeekEntries.length > 0 && allWeekEntries.every(e => e.status === "APPROVED");
      console.log("[TIME-ENTRY-APPROVE] All approved?", allApproved);

      if (allApproved) {
        console.log("[TIME-ENTRY-APPROVE] ===== ALL ENTRIES APPROVED, SENDING WEEKLY EMAIL =====");
        console.log("[TIME-ENTRY-APPROVE] Looking up timesheet with weekStartDate:", weekStartStr);
        // Atomic update: only one parallel request will match the non-APPROVED status
        const [updatedCount] = await Timesheet.update(
          { status: "APPROVED" },
          {
            where: {
              userId: entry.userId,
              weekStartDate: weekStartStr,
              status: { [Op.ne]: "APPROVED" },
            },
          }
        );
        console.log("[TIME-ENTRY-APPROVE] Timesheet update affected rows:", updatedCount);

        if (updatedCount > 0) {
          const timesheet = await Timesheet.findOne({
            where: { userId: entry.userId, weekStartDate: weekStartStr },
            include: [{ model: User, attributes: ["id", "name", "email"] }],
          });
          console.log("[TIME-ENTRY-APPROVE] Timesheet found:", !!timesheet);
          console.log("[TIME-ENTRY-APPROVE] Timesheet user:", JSON.stringify({ id: timesheet?.User?.id, name: timesheet?.User?.name, email: timesheet?.User?.email }));
          console.log("[TIME-ENTRY-APPROVE] Timesheet status updated to APPROVED");

          const manager = await User.findByPk(user.id, { attributes: ["name"] });
          const approvedEntries = allWeekEntries.map(e => ({
            project: e.project,
            entryDate: String(e.entryDate || ""),
            hours: e.hours,
          }));
          const totalHours = allWeekEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0);

          const html = approvedTimesheetTemplate({
            employeeName: timesheet.User?.name || "Employee",
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
            totalHours: totalHours,
            managerName: manager?.name || "Manager",
            comment: comment || null,
            approvalDate: toDateOnlyString(new Date()),
            entries: approvedEntries,
          });
          console.log("[TIME-ENTRY-APPROVE] Weekly template generated, HTML length:", html.length);

          const recipientEmail = timesheet.User?.email;
          console.log("[TIME-ENTRY-APPROVE] Recipient email:", recipientEmail);
          console.log("[TIME-ENTRY-APPROVE] Subject: Your Weekly Timesheet Has Been APPROVED");
          console.log("[TIME-ENTRY-APPROVE] Calling sendEmail...");

          const emailResult = await sendEmail({
            to: recipientEmail,
            subject: "Your Weekly Timesheet Has Been APPROVED",
            html,
          });
          console.log("[TIME-ENTRY-APPROVE] Weekly email sent. Resend response:", JSON.stringify(emailResult));
        } else {
          console.log("[TIME-ENTRY-APPROVE] Timesheet already approved by another request, skipping email");
        }
      } else {
        console.log("[TIME-ENTRY-APPROVE] Not all entries approved yet, skipping weekly email");
      }
    } catch (emailError) {
      console.error("[TIME-ENTRY-APPROVE] ===== WEEKLY EMAIL FAILED =====");
      console.error("[TIME-ENTRY-APPROVE] Error name:", emailError.name);
      console.error("[TIME-ENTRY-APPROVE] Error message:", emailError.message);
      console.error("[TIME-ENTRY-APPROVE] Error stack:", emailError.stack);
    }
    console.log("[TIME-ENTRY-APPROVE] ===== END =====");

    res.json({
      success: true,
      data: entry,
    });

  } catch (error) {
    console.error("[TIME-ENTRY-APPROVE] Request failed:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= COMMENT (manager note, no status change) =================
export const commentTimeEntry = async (req, res) => {
  try {
    const user = req.user;
    const id = req.params.id;
    const { comment } = req.body;

    if (!["ADMIN", "MANAGER"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only manager/admin can comment",
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment is required",
      });
    }

    const entry = await timeEntryService.commentOnTimeEntry(id, user.id, comment);

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
    const { comment } = req.body;

    console.log("[TIME-ENTRY-REJECT] ===== START =====");
    console.log("[TIME-ENTRY-REJECT] entryId:", id, "managerId:", user.id);

    if (!["ADMIN", "MANAGER"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only manager/admin can reject",
      });
    }

    const entry = await timeEntryService.getTimeEntryById(id);

    if (!entry) throw new Error("Time entry not found");
    console.log("[TIME-ENTRY-REJECT] Entry found, userId:", entry.userId, "project:", entry.project);

    entry.status = "REJECTED";
    await entry.save();
    console.log("[TIME-ENTRY-REJECT] Entry status updated to REJECTED");

    await ApprovalHistory.create({
      timeEntryId: entry.id,
      actorId: user.id,
      action: "REJECTED",
      comment: comment || null,
    });
    console.log("[TIME-ENTRY-REJECT] Approval history created");

    // 📧 Check if ALL entries in this week are now REJECTED → send weekly summary email
    console.log("[TIME-ENTRY-REJECT] ===== CHECKING ALL ENTRIES FOR WEEK =====");
    try {
      const rawDate = entry.entryDate;
      console.log("[TIME-ENTRY-REJECT] raw entryDate value:", JSON.stringify(rawDate), "type:", typeof rawDate);

      const entryDateStr = typeof rawDate === 'string' ? rawDate : toDateOnlyString(rawDate);
      console.log("[TIME-ENTRY-REJECT] entryDateStr used for parsing:", entryDateStr);
      const entryDateObj = new Date(entryDateStr + "T00:00:00");
      const dayOfWeek = entryDateObj.getDay();
      const weekStart = new Date(entryDateObj);
      weekStart.setDate(entryDateObj.getDate() - dayOfWeek);
      const weekStartStr = toDateOnlyString(weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekEndStr = toDateOnlyString(weekEnd);
      console.log("[TIME-ENTRY-REJECT] Week range:", weekStartStr, "to", weekEndStr);

      const allWeekEntries = await TimeEntryModel.findAll({
        where: {
          userId: entry.userId,
          entryDate: { [Op.gte]: weekStartStr, [Op.lte]: weekEndStr },
        },
        attributes: ["id", "project", "entryDate", "hours", "status"],
      });
      console.log("[TIME-ENTRY-REJECT] All entries in week:", allWeekEntries.length);
      console.log("[TIME-ENTRY-REJECT] Entry statuses:", allWeekEntries.map(e => ({ id: e.id, date: e.entryDate, status: e.status })));

      const allRejected = allWeekEntries.length > 0 && allWeekEntries.every(e => e.status === "REJECTED");
      console.log("[TIME-ENTRY-REJECT] All rejected?", allRejected);

      if (allRejected) {
        console.log("[TIME-ENTRY-REJECT] ===== ALL ENTRIES REJECTED, SENDING WEEKLY EMAIL =====");
        console.log("[TIME-ENTRY-REJECT] Looking up timesheet with weekStartDate:", weekStartStr);
        // Atomic update: only one parallel request will match the non-REJECTED status
        const [updatedCount] = await Timesheet.update(
          { status: "REJECTED" },
          {
            where: {
              userId: entry.userId,
              weekStartDate: weekStartStr,
              status: { [Op.ne]: "REJECTED" },
            },
          }
        );
        console.log("[TIME-ENTRY-REJECT] Timesheet update affected rows:", updatedCount);

        if (updatedCount > 0) {
          const timesheet = await Timesheet.findOne({
            where: { userId: entry.userId, weekStartDate: weekStartStr },
            include: [{ model: User, attributes: ["id", "name", "email"] }],
          });
          console.log("[TIME-ENTRY-REJECT] Timesheet found:", !!timesheet);
          console.log("[TIME-ENTRY-REJECT] Timesheet user:", JSON.stringify({ id: timesheet?.User?.id, name: timesheet?.User?.name, email: timesheet?.User?.email }));
          console.log("[TIME-ENTRY-REJECT] Timesheet status updated to REJECTED");

          const manager = await User.findByPk(user.id, { attributes: ["name"] });
          const rejectedEntries = allWeekEntries.map(e => ({
            project: e.project,
            entryDate: String(e.entryDate || ""),
            hours: e.hours,
          }));
          const totalHours = allWeekEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0);

          const html = rejectedTimesheetTemplate({
            employeeName: timesheet.User?.name || "Employee",
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
            totalHours: totalHours,
            managerName: manager?.name || "Manager",
            comment: comment || null,
            rejectionDate: toDateOnlyString(new Date()),
            entries: rejectedEntries,
          });
          console.log("[TIME-ENTRY-REJECT] Weekly template generated, HTML length:", html.length);

          const recipientEmail = timesheet.User?.email;
          console.log("[TIME-ENTRY-REJECT] Recipient email:", recipientEmail);
          console.log("[TIME-ENTRY-REJECT] Subject: Your Weekly Timesheet Has Been REJECTED");
          console.log("[TIME-ENTRY-REJECT] Calling sendEmail...");

          const emailResult = await sendEmail({
            to: recipientEmail,
            subject: "Your Weekly Timesheet Has Been REJECTED",
            html,
          });
          console.log("[TIME-ENTRY-REJECT] Weekly email sent. Resend response:", JSON.stringify(emailResult));
        } else {
          console.log("[TIME-ENTRY-REJECT] Timesheet already rejected by another request, skipping email");
        }
      } else {
        console.log("[TIME-ENTRY-REJECT] Not all entries rejected yet, skipping weekly email");
      }
    } catch (emailError) {
      console.error("[TIME-ENTRY-REJECT] ===== WEEKLY EMAIL FAILED =====");
      console.error("[TIME-ENTRY-REJECT] Error name:", emailError.name);
      console.error("[TIME-ENTRY-REJECT] Error message:", emailError.message);
      console.error("[TIME-ENTRY-REJECT] Error stack:", emailError.stack);
    }
    console.log("[TIME-ENTRY-REJECT] ===== END =====");

    res.json({
      success: true,
      data: entry,
    });

  } catch (error) {
    console.error("[TIME-ENTRY-REJECT] Request failed:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};