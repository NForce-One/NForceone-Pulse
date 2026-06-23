import * as reportService from "../services/report.service.js";

const parseIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number).filter((n) => !isNaN(n));
  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").map(Number).filter((n) => !isNaN(n));
  }
  const num = Number(value);
  return isNaN(num) ? [] : [num];
};

const applyManagerFilter = async (req, filters) => {
  if (req.user.role !== "MANAGER") return null;
  if (filters.reportType === "self") {
    filters.userId = req.user.id;
    return null;
  }
  const approvedIds = await reportService.getApprovedEmployeeIds(req.user.id);
  const requestedUserIds = parseIds(filters.userId);
  if (requestedUserIds.length > 0) {
    const allApproved = requestedUserIds.every((id) => approvedIds.includes(id));
    if (!allApproved) {
      return { error: "Unauthorized to view one or more selected employees' data" };
    }
    filters.userId = requestedUserIds;
  } else {
    filters.userId = approvedIds.length > 0 ? approvedIds : [-1];
  }
  return null;
};

export const getApprovedEmployees = async (req, res) => {
  try {
    if (req.user.role === "MANAGER") {
      const ids = await reportService.getApprovedEmployeeIds(req.user.id);
      const employees = await (await import("../models/user.model.js")).default.findAll({
        where: { id: ids, isActive: true },
        attributes: ["id", "name", "email"],
        order: [["name", "ASC"]],
      });
      return res.json({ success: true, data: employees });
    }
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const applyAdminFilter = async (req, filters) => {
  if (req.user.role !== "ADMIN") return;
  let combinedIds = [];
  const existingUserIds = parseIds(filters.userId);
  if (existingUserIds.length > 0) {
    combinedIds.push(...existingUserIds);
  }
  if (filters.managedBy) {
    const managerIds = parseIds(filters.managedBy);
    for (const managerId of managerIds) {
      const approvedIds = await reportService.getApprovedEmployeeIds(managerId);
      combinedIds.push(...approvedIds);
    }
    delete filters.managedBy;
  }
  if (combinedIds.length > 0) {
    filters.userId = [...new Set(combinedIds)];
  }
};

export const getEmployeeHoursReport = async (req, res) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === "EMPLOYEE") {
      filters.userId = req.user.id;
    }
    await applyAdminFilter(req, filters);
    const authError = await applyManagerFilter(req, filters);
    if (authError) return res.status(403).json({ success: false, message: authError.error });
    const report = await reportService.getEmployeeHoursReport(filters);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectHoursReport = async (req, res) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === "EMPLOYEE") {
      filters.userId = req.user.id;
    }
    await applyAdminFilter(req, filters);
    const authError = await applyManagerFilter(req, filters);
    if (authError) return res.status(403).json({ success: false, message: authError.error });
    const report = await reportService.getProjectHoursReport(filters);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUtilizationReport = async (req, res) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === "EMPLOYEE") {
      filters.userId = req.user.id;
    }
    await applyAdminFilter(req, filters);
    const authError = await applyManagerFilter(req, filters);
    if (authError) return res.status(403).json({ success: false, message: authError.error });
    const report = await reportService.getUtilizationReport(filters);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBillingSummary = async (req, res) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === "EMPLOYEE") {
      filters.userId = req.user.id;
    }
    await applyAdminFilter(req, filters);
    const authError = await applyManagerFilter(req, filters);
    if (authError) return res.status(403).json({ success: false, message: authError.error });
    const report = await reportService.getBillingSummary(filters);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimesheetStatusReport = async (req, res) => {
  try {
    const report = await reportService.getTimesheetStatusReport(req.query);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMissingTimeDetails = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }
    if (req.user.role === "MANAGER") {
      const result = await reportService.getMissingTimeDetails(req.user.id, startDate, endDate);
      return res.json({ success: true, data: result });
    }
    res.json({ success: true, data: { employees: [], totalCount: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate, self } = req.query;
    const stats = await reportService.getDashboardStats(req.user.id, req.user.role, startDate, endDate, self === "true");
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHourDetails = async (req, res) => {
  try {
    const { type, startDate, endDate, self } = req.query;
    if (!["working", "extra", "total", "weekend", "holiday", "draft"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type. Must be working, extra, total, weekend, holiday, or draft." });
    }
    const details = await reportService.getHourDetails(req.user.id, req.user.role, type, startDate || null, endDate || null, self === "true");
    res.json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportReport = async (req, res) => {
  try {
    console.log("Export request query:", req.query);
    const filters = { ...req.query };
    if (req.user.role === "EMPLOYEE") {
      filters.userId = req.user.id;
    }
    await applyAdminFilter(req, filters);
    const authError = await applyManagerFilter(req, filters);
    if (authError) return res.status(403).json({ success: false, message: authError.error });

    const csv = await reportService.exportReportCSV(filters);
    const date = new Date().toISOString().split("T")[0];
    const filename = `report_${date}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
