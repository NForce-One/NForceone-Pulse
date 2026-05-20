import * as reportService from "../services/report.service.js";

export const getEmployeeHoursReport = async (req, res) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === "EMPLOYEE") {
      filters.userId = req.user.id;
    }
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
