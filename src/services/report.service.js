import TimeEntry from "../models/timeEntry.model.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Client from "../models/client.model.js";
import Task from "../models/task.model.js";
import Timesheet from "../models/timesheet.model.js";
import ApprovalHistory from "../models/approvalHistory.model.js";
import BillingRate from "../models/billingRate.model.js";
import { Op } from "sequelize";
import { classifyEntry, getDayName, getDisplayName, getExtraWorkType } from "../utils/holidayConfig.js";
import { toDateOnlyString } from "../utils/dateUtils.js";

export const getEmployeeHoursReport = async (filters) => {
  const { startDate, endDate, from_date, to_date, userId, managerId, department, projectId, clientId } = filters;
  const fromDate = startDate || from_date;
  const toDate = endDate || to_date;
  const whereClause = {};

  if (fromDate && toDate) {
    whereClause.entryDate = { [Op.between]: [fromDate, toDate] };
  }
  if (userId) whereClause.userId = parseInt(userId);
  if (managerId) whereClause.managerId = parseInt(managerId);
  if (projectId) whereClause.projectId = parseInt(projectId);
  if (clientId) whereClause.clientId = parseInt(clientId);

  const userWhere = {};
  if (department) userWhere.department = department;

  const entries = await TimeEntry.findAll({
    where: whereClause,
    include: [
      { model: User, attributes: ["id", "name", "email", "department"], where: userWhere },
      { model: User, as: "Manager", attributes: ["id", "name", "email"] },
      { model: Project, attributes: ["id", "name", "code"] },
      { model: Client, attributes: ["id", "name", "code"] },
      { model: Task, attributes: ["id", "title", "category"] },
    ],
    order: [["entryDate", "DESC"]],
  });

  return entries.map((entry) => {
    const json = entry.toJSON();
    return {
      ...json,
      projectName: json.Project?.name || json.project || "-",
      taskTitle: json.Task?.title || json.task || "-",
      clientName: json.Client?.name || json.client || "-",
    };
  });
};

export const getProjectHoursReport = async (filters) => {
  const { startDate, endDate, from_date, to_date, projectId, clientId, userId, department } = filters;
  const fromDate = startDate || from_date;
  const toDate = endDate || to_date;
  const whereClause = {};

  if (fromDate && toDate) {
    whereClause.entryDate = { [Op.between]: [fromDate, toDate] };
  }
  if (projectId) whereClause.projectId = parseInt(projectId);
  if (clientId) whereClause.clientId = parseInt(clientId);

  const userWhere = {};
  if (userId) userWhere.id = userId;
  if (department) userWhere.department = department;

  const entries = await TimeEntry.findAll({
    where: whereClause,
    include: [
      { model: Project, attributes: ["id", "name", "code", "status"] },
      { model: Client, attributes: ["id", "name", "code"] },
      { model: User, attributes: ["id", "name", "email"], where: userWhere },
    ],
    order: [["entryDate", "DESC"]],
  });

  return entries.map((entry) => {
    const json = entry.toJSON();
    return {
      ...json,
      projectName: json.Project?.name || json.project || "-",
      clientName: json.Client?.name || json.client || "-",
    };
  });
};

export const getUtilizationReport = async (filters) => {
  const { startDate, endDate, from_date, to_date, department, userId } = filters;
  const fromDate = startDate || from_date;
  const toDate = endDate || to_date;
  const whereClause = {};

  if (fromDate && toDate) {
    whereClause.entryDate = { [Op.between]: [fromDate, toDate] };
  }

  const userWhere = {};
  if (userId) userWhere.id = userId;
  if (department) userWhere.department = department;

  const users = await User.findAll({
    where: userWhere,
    include: [
      {
        model: TimeEntry,
        as: "TimeEntries",
        where: whereClause,
        required: false,
        attributes: ["hours", "isBillable"],
      },
    ],
  });

  const utilization = users
    .map((user) => {
      const entries = user.TimeEntries || [];
      const totalHours = entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
      const billableHours = entries
        .filter((e) => e.isBillable)
        .reduce((sum, e) => sum + Number(e.hours || 0), 0);
      const utilizationPercent = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

      return {
        userId: user.id,
        name: user.name || "-",
        email: user.email || "-",
        department: user.department || "-",
        totalHours,
        billableHours,
        nonBillableHours: totalHours - billableHours,
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      };
    })
    .filter((u) => u.name !== "-");

  return utilization;
};

export const getBillingSummary = async (filters) => {
  const { startDate, endDate, from_date, to_date, projectId, clientId, userId } = filters;
  const fromDate = startDate || from_date;
  const toDate = endDate || to_date;
  const whereClause = { isBillable: true };

  if (fromDate && toDate) {
    whereClause.entryDate = { [Op.between]: [fromDate, toDate] };
  }
  if (projectId) whereClause.projectId = parseInt(projectId);
  if (clientId) whereClause.clientId = parseInt(clientId);
  if (userId) whereClause.userId = parseInt(userId);

  const entries = await TimeEntry.findAll({
    where: whereClause,
    include: [
      { model: Project, attributes: ["id", "name", "code"] },
      { model: Client, attributes: ["id", "name", "code"] },
      { model: User, attributes: ["id", "name"] },
    ],
  });

  const summary = {};
  entries.forEach((entry) => {
    const json = entry.toJSON();
    const clientKey = json.clientId || json.client || "no-client";
    const projectKey = json.projectId || json.project || "no-project";
    const key = `${clientKey}-${projectKey}`;

    if (!summary[key]) {
      summary[key] = {
        clientId: json.clientId,
        clientName: json.Client?.name || json.client || "Unknown",
        projectId: json.projectId,
        projectName: json.Project?.name || json.project || "Unknown",
        totalHours: 0,
        userId: json.userId,
      };
    }
    summary[key].totalHours += Number(json.hours || 0);
  });

  const result = Object.values(summary);

  // Fetch billing rates for each project/user combination
  for (const item of result) {
    const rateWhere = {
      projectId: item.projectId,
    };
    if (item.userId) {
      rateWhere[Op.or] = [{ userId: item.userId }, { userId: null }];
    }
    const rates = await BillingRate.findAll({
      where: rateWhere,
      order: [["effectiveFrom", "DESC"]],
      limit: 1,
    });
    item.rate = rates.length > 0 ? rates[0].billingRate : 0;
  }

  return result;
};

export const getTimesheetStatusReport = async (filters) => {
  const { startDate, endDate, userId, status } = filters;
  const whereClause = {};

  if (startDate && endDate) {
    whereClause.weekStartDate = { [Op.between]: [startDate, endDate] };
  }
  if (userId) whereClause.userId = userId;
  if (status) whereClause.status = status;

  return await Timesheet.findAll({
    where: whereClause,
    include: [
      { model: User, attributes: ["id", "name", "email", "department"] },
    ],
    order: [["weekStartDate", "DESC"]],
  });
};

export const getDashboardStats = async (userId, role, startDate = null, endDate = null, isSelfView = false) => {
  const now = new Date();

  let startOfWeek, endOfWeek;
  let startOfMonth, endOfMonth;

  if (startDate && endDate) {
    startOfWeek = new Date(startDate + "T00:00:00");
    endOfWeek = new Date(endDate + "T23:59:59.999");
    startOfMonth = new Date(startDate + "T00:00:00");
    endOfMonth = new Date(endDate + "T23:59:59.999");
  } else {
    startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const startOfWeekStr = toDateOnlyString(startOfWeek);
  const endOfWeekStr = toDateOnlyString(endOfWeek);

  const startOfMonthStr = toDateOnlyString(startOfMonth);
  const endOfMonthStr = toDateOnlyString(endOfMonth);

  let whereClause = {};
  let teamMemberIds = [];
  const isSelfViewActive = role === "EMPLOYEE" || (role === "MANAGER" && isSelfView);
  const isTeamView = role === "MANAGER" && !isSelfView;

  if (isSelfViewActive) {
    whereClause.userId = userId;
  } else if (isTeamView) {
    const teamMembers = await User.findAll({
      where: { managerId: userId, isActive: true },
      attributes: ["id"],
    });
    teamMemberIds = teamMembers.map((m) => m.id);
    if (teamMemberIds.length > 0) {
      whereClause.userId = { [Op.in]: teamMemberIds };
    } else {
      whereClause.userId = { [Op.in]: [-1] };
    }
  }

  const statusFilter = isTeamView ? { status: "APPROVED" } : { status: { [Op.in]: ["DRAFT", "SUBMITTED", "APPROVED"] } };

  const weekEntries = await TimeEntry.findAll({
    where: {
      ...whereClause,
      ...statusFilter,
      entryDate: { [Op.between]: [startOfWeekStr, endOfWeekStr] },
    },
    include: [
      { model: User, attributes: ["id", "name", "email", "department", "defaultHours"] },
      { model: Project, attributes: ["id", "name"] },
    ],
  });

  const monthEntries = await TimeEntry.findAll({
    where: {
      ...whereClause,
      ...statusFilter,
      entryDate: { [Op.between]: [startOfMonthStr, endOfMonthStr] },
    },
    include: [
      { model: User, attributes: ["id", "name", "email"] },
      { model: User, as: "Manager", attributes: ["id", "name", "email"] },
      { model: Client, attributes: ["id", "name"] },
      { model: Project, attributes: ["id", "name"] },
      { model: Task, attributes: ["id", "title"] },
    ],
  });

  const totalWeekHours = weekEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
  const billableWeekHours = weekEntries
    .filter((e) => e.isBillable)
    .reduce((sum, e) => sum + Number(e.hours || 0), 0);
  const nonBillableWeekHours = totalWeekHours - billableWeekHours;

  let weekendHours = 0;
  let weekendEntries = 0;
  let holidayHours = 0;
  let holidayEntries = 0;
  let normalHours = 0;

  const entryClassification = {};
  monthEntries.forEach((entry) => {
    const json = entry.toJSON();
    const dateStr = json.entryDate;
    const hours = parseFloat(json.hours || 0);
    let entryType = "working";
    try {
      entryType = classifyEntry(dateStr);
    } catch (e) {
      console.warn(`[dashboard] classifyEntry failed for date "${dateStr}": ${e.message}`);
    }
    entryClassification[json.id] = entryType;
    if (entryType === "holiday") {
      holidayHours += hours;
      holidayEntries++;
    } else if (entryType === "weekend") {
      weekendHours += hours;
      weekendEntries++;
    } else {
      normalHours += hours;
    }
  });

  const totalMonthHours = monthEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0);

  const formatDate = (dateStr) => {
    const dt = new Date(dateStr + "T00:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(dt.getDate()).padStart(2, "0");
    const month = months[dt.getMonth()];
    const year = String(dt.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  let dashboardEntries = [];
  if (monthEntries.length > 0) {
    const entryIds = monthEntries.map((e) => e.id);
    let commentMap = {};
    const approvalHistories = await ApprovalHistory.findAll({
      where: { timeEntryId: { [Op.in]: entryIds }, action: "APPROVED" },
      order: [["createdAt", "DESC"]],
    });
    approvalHistories.forEach((ah) => {
      if (!commentMap[ah.timeEntryId]) {
        commentMap[ah.timeEntryId] = ah.comment || "-";
      }
    });

    dashboardEntries = monthEntries.map((entry) => {
      const json = entry.toJSON();
      const dateStr = json.entryDate;
      const entryType = entryClassification[json.id] || "working";
      return {
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
      };
    });
  }

  console.log(`[DEBUG Dashboard] monthEntries count: ${monthEntries.length}, dashboardEntries built: ${dashboardEntries.length}`);
  console.log(`[DEBUG Dashboard] normalHours: ${normalHours}, weekendHours: ${weekendHours}, holidayHours: ${holidayHours}`);

  const draftCount = weekEntries.filter((e) => e.status === "DRAFT").length;

  let pendingApprovals = 0;
  let teamData = [];
  let topEmployees = [];
  let missingEmployees = [];
  let topProjects = [];
  let weeklyTrend = [];
  let projectDistribution = [];
  let utilization = 0;
  let missingHours = 0;

  if (role === "MANAGER" || role === "ADMIN") {
    if (role === "MANAGER" && !isSelfView) {
      const pendingWhere = { status: "SUBMITTED" };
      if (teamMemberIds.length > 0) {
        pendingWhere.userId = { [Op.in]: teamMemberIds };
      }
      pendingApprovals = await Timesheet.count({ where: pendingWhere });
    }

    if (role === "MANAGER" && !isSelfView) {
      const teamMembers = await User.findAll({
        where: { managerId: userId, isActive: true },
        attributes: ["id", "name", "email", "department", "defaultHours"],
      });

      const workingDaysPerWeek = 5;
      let totalExpectedHours = 0;
      teamMembers.forEach((member) => {
        const dailyHours = Number(member.defaultHours || 8);
        totalExpectedHours += dailyHours * workingDaysPerWeek;
      });
      missingHours = Math.max(0, Math.round((totalExpectedHours - totalWeekHours) * 100) / 100);

      teamData = await Promise.all(
        teamMembers.map(async (member) => {
          const memberEntries = await TimeEntry.findAll({
            where: {
              userId: member.id,
              status: "APPROVED",
              entryDate: { [Op.between]: [startOfWeekStr, endOfWeekStr] },
            },
          });
          const memberHours = memberEntries.reduce(
            (sum, e) => sum + Number(e.hours || 0),
            0
          );
          return {
            userId: member.id,
            name: member.name,
            email: member.email,
            weekHours: Math.round(memberHours * 100) / 100,
            entriesCount: memberEntries.length,
          };
        })
      );

      topEmployees = [...teamData]
        .sort((a, b) => b.weekHours - a.weekHours)
        .slice(0, 5);

      const defaultHours = 40;
      missingEmployees = teamData
        .filter((member) => member.weekHours < defaultHours)
        .map((member) => ({
          ...member,
          missingHours: Math.round((defaultHours - member.weekHours) * 100) / 100,
        }));

      const projectHoursMap = {};
      weekEntries.forEach((entry) => {
        const projectName = entry.Project?.name || entry.project || "Unknown";
        if (!projectHoursMap[projectName]) {
          projectHoursMap[projectName] = 0;
        }
        projectHoursMap[projectName] += Number(entry.hours || 0);
      });

      topProjects = Object.entries(projectHoursMap)
        .map(([name, hours]) => ({ name, hours: Math.round(hours * 100) / 100 }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      projectDistribution = Object.entries(projectHoursMap)
        .map(([name, hours]) => ({ name, hours: Math.round(hours * 100) / 100 }))
        .sort((a, b) => b.hours - a.hours);

      const last4Weeks = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(startOfWeek);
        weekStart.setDate(weekStart.getDate() - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekStartStr = toDateOnlyString(weekStart);
        const weekEndStr = toDateOnlyString(weekEnd);

        const weekData = await TimeEntry.findAll({
          where: {
            userId: { [Op.in]: teamMemberIds },
            status: "APPROVED",
            entryDate: { [Op.between]: [weekStartStr, weekEndStr] },
          },
        });

        const weekTotal = weekData.reduce((sum, e) => sum + Number(e.hours || 0), 0);
        const weekBillable = weekData
          .filter((e) => e.isBillable)
          .reduce((sum, e) => sum + Number(e.hours || 0), 0);

        last4Weeks.push({
          week: `Week ${4 - i}`,
          totalHours: Math.round(weekTotal * 100) / 100,
          billableHours: Math.round(weekBillable * 100) / 100,
          nonBillableHours: Math.round((weekTotal - weekBillable) * 100) / 100,
        });
      }
      weeklyTrend = last4Weeks;

      utilization = totalWeekHours > 0 ? Math.round((billableWeekHours / totalWeekHours) * 100 * 100) / 100 : 0;
    }
  }

  let adminStats = {};
  if (role === "ADMIN") {
    const totalUsers = await User.count({ where: { isActive: true } });
    const totalProjects = await Project.count({ where: { status: "ACTIVE" } });
    const totalClients = await Client.count({ where: { status: "ACTIVE" } });

    const allWeekEntries = await TimeEntry.findAll({
      where: { entryDate: { [Op.between]: [startOfWeekStr, endOfWeekStr] } },
    });
    const orgTotalHours = allWeekEntries.reduce(
      (sum, e) => sum + Number(e.hours || 0),
      0
    );

    adminStats = {
      totalUsers,
      totalProjects,
      totalClients,
      orgTotalHours,
    };
  }

  const result = {
    totalWeekHours: Math.round((normalHours + weekendHours + holidayHours) * 100) / 100,
    billableWeekHours: Math.round(billableWeekHours * 100) / 100,
    nonBillableWeekHours: Math.round(nonBillableWeekHours * 100) / 100,
    totalMonthHours: Math.round(totalMonthHours * 100) / 100,
    pendingApprovals,
    teamData,
    topEmployees,
    missingEmployees,
    topProjects,
    weeklyTrend,
    projectDistribution,
    utilization,
    missingHours: Math.round(missingHours * 100) / 100,
    weekendHours: Math.round(weekendHours * 100) / 100,
    weekendEntries,
    holidayHours: Math.round(holidayHours * 100) / 100,
    normalHours: Math.round(normalHours * 100) / 100,
    holidayEntries,
    totalExtraHours: Math.round((weekendHours + holidayHours) * 100) / 100,
    dashboardEntries,
  };

  console.log(`[DEBUG Dashboard] dashboardEntries IDs: ${dashboardEntries.map(e => e.rawDate).join(', ')}`);

  if (role === "EMPLOYEE" || (role === "MANAGER" && isSelfView)) {
    result.draftEntries = draftCount;
  }

  return { ...result, ...adminStats };
};

export const getUserWorkingHours = async (userId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfMonthStr = toDateOnlyString(startOfMonth);
  const endOfMonthStr = toDateOnlyString(endOfMonth);

  const entries = await TimeEntry.findAll({
    where: {
      userId,
      status: { [Op.in]: ["DRAFT", "SUBMITTED", "APPROVED"] },
      entryDate: { [Op.between]: [startOfMonthStr, endOfMonthStr] },
    },
  });

  let normalHours = 0;
  let weekendHours = 0;
  let holidayHours = 0;

  entries.forEach((entry) => {
    const json = entry.toJSON();
    const dateStr = json.entryDate;
    const hours = Number(json.hours || 0);
    let entryType = "working";
    try {
      entryType = classifyEntry(dateStr);
    } catch (e) {
      console.warn(`[workingHours] classifyEntry failed for date "${dateStr}": ${e.message}`);
    }
    if (entryType === "holiday") {
      holidayHours += hours;
    } else if (entryType === "weekend") {
      weekendHours += hours;
    } else {
      normalHours += hours;
    }
  });

  return {
    normalHours: Math.round(normalHours * 100) / 100,
    weekendHours: Math.round(weekendHours * 100) / 100,
    holidayHours: Math.round(holidayHours * 100) / 100,
    totalHours: Math.round((normalHours + weekendHours + holidayHours) * 100) / 100,
    totalEntries: entries.length,
  };
};

export const getHourDetails = async (userId, role, type, startDate = null, endDate = null, isSelfView = false) => {
  const stats = await getDashboardStats(userId, role, startDate, endDate, isSelfView);
  const allEntries = stats?.dashboardEntries || [];
  console.log(`[DEBUG getHourDetails] dashboardEntries from getDashboardStats: ${allEntries.length} entries for type=${type}`);

  let filtered = [];
  if (type === "working") {
    filtered = allEntries.filter(e => e.type === "working");
  } else if (type === "weekend") {
    filtered = allEntries.filter(e => e.type === "weekend");
  } else if (type === "holiday") {
    filtered = allEntries.filter(e => e.type === "holiday");
  } else if (type === "extra") {
    filtered = allEntries.filter(e => e.type === "weekend" || e.type === "holiday");
  } else if (type === "draft") {
    filtered = allEntries.filter(e => e.approvalStatus === "DRAFT");
  } else {
    filtered = allEntries;
  }

  const weekendHours = filtered.filter(e => e.type === "weekend").reduce((s, e) => s + e.hoursWorked, 0);
  const holidayHours = filtered.filter(e => e.type === "holiday").reduce((s, e) => s + e.hoursWorked, 0);
  const normalHours = filtered.filter(e => e.type === "working").reduce((s, e) => s + e.hoursWorked, 0);

  return {
    entries: filtered,
    normalHours: Math.round(normalHours * 100) / 100,
    weekendHours: Math.round(weekendHours * 100) / 100,
    holidayHours: Math.round(holidayHours * 100) / 100,
    totalExtraHours: Math.round((weekendHours + holidayHours) * 100) / 100,
  };
};

export const exportReportCSV = async (filters) => {
  console.log("exportReportCSV called with filters:", filters);
  const { report_type = "employee_hours" } = filters;
  console.log("report_type:", report_type);
  let data = [];
  let csv = "";

  switch (report_type) {
    case "employee_hours": {
      console.log("Getting employee hours report...");
      data = await getEmployeeHoursReport(filters);
      const headers = ["Employee Name", "Client", "Project", "Task", "Date", "Hours", "Billable", "Status", "Description"];
      const rows = data.map((entry) => [
        entry.User?.name || "-",
        entry.clientName || "-",
        entry.projectName || "-",
        entry.taskTitle || entry.Task?.title || "-",
        entry.entryDate || "-",
        entry.hours || 0,
        entry.isBillable ? "Yes" : "No",
        entry.status || "-",
        (entry.description || "").replace(/"/g, '""'),
      ]);
      csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
      break;
    }
    case "project_hours": {
      console.log("Getting project hours report...");
      data = await getProjectHoursReport(filters);
      const projectMap = {};
      data.forEach((entry) => {
        const key = entry.projectId || entry.Project?.id;
        if (!projectMap[key]) {
          projectMap[key] = {
            projectName: entry.projectName || entry.Project?.name || "-",
            clientName: entry.clientName || entry.Client?.name || "-",
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
          };
        }
        const hours = Number(entry.hours || 0);
        projectMap[key].totalHours += hours;
        if (entry.isBillable) {
          projectMap[key].billableHours += hours;
        } else {
          projectMap[key].nonBillableHours += hours;
        }
      });
      const headers = ["Project", "Client", "Total Hours", "Billable Hours", "Non-Billable Hours"];
      const rows = Object.values(projectMap).map((p) => [
        p.projectName,
        p.clientName,
        p.totalHours,
        p.billableHours,
        p.nonBillableHours,
      ]);
      csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
      break;
    }
    case "utilization": {
      console.log("Getting utilization report...");
      data = await getUtilizationReport(filters);
      const headers = ["Employee", "Total Hours", "Billable Hours", "Utilization %"];
      const rows = data.map((u) => [
        u.name || "-",
        u.totalHours || 0,
        u.billableHours || 0,
        u.utilizationPercent || 0,
      ]);
      csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
      break;
    }
    case "billing_summary": {
      console.log("Getting billing summary report...");
      data = await getBillingSummary(filters);
      const headers = ["Project", "Client", "Total Billable Hours", "Rate per Hour", "Total Amount"];
      const rows = data.map((b) => [
        b.projectName || "-",
        b.clientName || "-",
        b.totalHours || 0,
        b.rate || 0,
        (b.totalHours || 0) * (b.rate || 0),
      ]);
      csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
      break;
    }
    default:
      console.log("Invalid report type:", report_type);
      csv = "Invalid report type";
  }

  return csv;
};
