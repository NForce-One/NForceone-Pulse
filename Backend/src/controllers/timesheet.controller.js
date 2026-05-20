import * as timesheetService from "../services/timesheet.service.js";
import User from "../models/user.model.js";

// ================= GET ALL TIMESHEETS =================
export const getTimesheets = async (req, res) => {
  try {
    const user = req.user;
    let timesheets;

    if (user.role === "EMPLOYEE") {
      timesheets = await timesheetService.getTimesheetsByUser(user.id);
    } else {
      timesheets = await timesheetService.getAllTimesheets();
    }

    res.json({
      success: true,
      data: timesheets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET SINGLE TIMESHEET =================
export const getTimesheet = async (req, res) => {
  try {
    const timesheet = await timesheetService.getTimesheetById(req.params.id);

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found",
      });
    }

    res.json({
      success: true,
      data: timesheet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GENERATE TIMESHEET =================
export const generateTimesheet = async (req, res) => {
  try {
    const { weekStartDate } = req.body;
    const timesheet = await timesheetService.generateTimesheet(
      req.user.id,
      weekStartDate
    );

    res.json({
      success: true,
      data: timesheet,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= SUBMIT TIMESHEET =================
export const submitTimesheet = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE") {
      return res.status(403).json({
        success: false,
        message: "Only employees can submit timesheets",
      });
    }

    const timesheet = await timesheetService.submitTimesheet(
      req.params.id,
      req.user.id,
      req.body.comment
    );

    res.json({
      success: true,
      data: timesheet,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= APPROVE TIMESHEET =================
export const approveTimesheet = async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only managers/admins can approve",
      });
    }

    const timesheet = await timesheetService.approveTimesheet(
      req.params.id,
      req.user.id,
      req.body.comment
    );

    res.json({
      success: true,
      data: timesheet,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= REJECT TIMESHEET =================
export const rejectTimesheet = async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only managers/admins can reject",
      });
    }

    const timesheet = await timesheetService.rejectTimesheet(
      req.params.id,
      req.user.id,
      req.body.comment
    );

    res.json({
      success: true,
      data: timesheet,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= COMMENT TIMESHEET (manager note, no status change) =================
export const commentTimesheet = async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only managers/admins can comment",
      });
    }

    if (!req.body.comment || !req.body.comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment is required",
      });
    }

    const timesheet = await timesheetService.commentTimesheet(
      req.params.id,
      req.user.id,
      req.body.comment
    );

    res.json({
      success: true,
      data: timesheet,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= WITHDRAW TIMESHEET =================
export const withdrawTimesheet = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE") {
      return res.status(403).json({
        success: false,
        message: "Only employees can withdraw",
      });
    }

    const timesheet = await timesheetService.withdrawTimesheet(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      data: timesheet,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET TEAM TIMESHEETS (MANAGER/ADMIN) =================
export const getTeamTimesheets = async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only managers/admins can view team timesheets",
      });
    }

    const filters = {
      status: req.query.status || "ALL",
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      employeeId: req.query.employeeId || null,
    };

    // Admin can specify a managerId to view a specific manager's team
    // If no managerId specified and user is admin, show all teams
    let managerId;
    if (req.user.role === "ADMIN" && !req.query.managerId) {
      managerId = "all";
    } else {
      managerId = req.query.managerId || req.user.id;
    }

    const timesheets = await timesheetService.getTeamTimesheets(
      managerId,
      filters
    );

    res.json({
      success: true,
      data: timesheets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET FILTERED TIME ENTRIES (ADMIN) =================
export const getFilteredTimeEntries = async (req, res) => {
  try {
    const { employeeId, managerId, managerTeamId } = req.query;

    const entries = await timesheetService.getFilteredTimeEntries({
      employeeId: employeeId || null,
      managerId: managerId || null,
      managerTeamId: managerTeamId || null,
    });

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

// ================= GET APPROVAL HISTORY =================
export const getApprovalHistory = async (req, res) => {
  try {
    const history = await timesheetService.getApprovalHistory(req.params.id);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
