import * as employeeTimesheetService from "../services/employeeTimesheet.service.js";

export const getClients = async (req, res) => {
  try {
    const clients = await employeeTimesheetService.getActiveClients();
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required" });
    }
    const projects = await employeeTimesheetService.getProjectsByClientId(clientId);
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getManagerByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }
    const manager = await employeeTimesheetService.getManagerByProjectId(projectId);
    res.json({ success: true, data: manager });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWeeklyTimesheet = async (req, res) => {
  try {
    const { weekStart } = req.query;
    const result = await employeeTimesheetService.getWeeklyTimesheet(req.user.id, weekStart);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveDraftTimesheet = async (req, res) => {
  try {
    const result = await employeeTimesheetService.saveDraftTimesheet(req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const submitTimesheet = async (req, res) => {
  try {
    const result = await employeeTimesheetService.submitTimesheet(req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTimesheet = async (req, res) => {
  try {
    const result = await employeeTimesheetService.updateTimesheet(req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getManagerAction = async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const result = await employeeTimesheetService.getManagerAction(timesheetId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const cancelTimesheet = async (req, res) => {
  try {
    const { weekStartDate, projectId } = req.body;
    if (!weekStartDate) {
      return res.status(400).json({ success: false, message: "weekStartDate is required" });
    }
    const result = await employeeTimesheetService.cancelTimesheet(req.user.id, weekStartDate, projectId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteProjectEntries = async (req, res) => {
  try {
    const { projectId, weekStartDate } = req.params;
    const { clientName, projectName } = req.query;
    const result = await employeeTimesheetService.deleteProjectEntries(req.user.id, weekStartDate, projectId, clientName, projectName);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
