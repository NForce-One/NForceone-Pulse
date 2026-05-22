import bcrypt from "bcrypt";
import { Op } from "sequelize";
import User from "../models/user.model.js";
import Client from "../models/client.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import TimeEntry from "../models/timeEntry.model.js";
import Timesheet from "../models/timesheet.model.js";
import BillingRate from "../models/billingRate.model.js";
import ProjectUser from "../models/projectUser.model.js";
import Holiday from "../models/holiday.model.js";
import Timer from "../models/timer.model.js";
import ApprovalHistory from "../models/approvalHistory.model.js";
import Notification from "../models/notification.model.js";
import AuditLog from "../models/auditLog.model.js";

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

export const seedDemoData = async (req, res) => {
  try {
    const log = [];
    const push = (msg) => log.push(msg);

    push("Clearing existing data…");
    await ApprovalHistory.destroy({ where: {} });
    await Notification.destroy({ where: {} });
    await AuditLog.destroy({ where: {} });
    await TimeEntry.destroy({ where: {} });
    await Timesheet.destroy({ where: {} });
    await Timer.destroy({ where: {} });
    await ProjectUser.destroy({ where: {} });
    await BillingRate.destroy({ where: {} });
    await Task.destroy({ where: {} });
    await Project.destroy({ where: {} });
    await Client.destroy({ where: {} });
    await Holiday.destroy({ where: {} });
    await User.destroy({ where: {} });

    const adminPw = await hash("Admin@Password123");
    const managerPw = await hash("Manager@Password123");
    const empPw = await hash("Nforce@123");

    const admin = await User.create({ name: "Admin", email: "admin@nforce.com", password: adminPw, role: "ADMIN", department: "Management", isActive: true, defaultHours: 8 });
    push("Admin created");

    const mgr1 = await User.create({ name: "Sarah Manager", email: "manager@nforce.com", password: managerPw, role: "MANAGER", department: "Engineering", isActive: true, defaultHours: 8 });
    const mgr2 = await User.create({ name: "Rajesh Kumar", email: "rajesh@nforce.com", password: managerPw, role: "MANAGER", department: "Design", isActive: true, defaultHours: 8 });
    const mgr3 = await User.create({ name: "Priya Sharma", email: "priya@nforce.com", password: managerPw, role: "MANAGER", department: "Operations", isActive: true, defaultHours: 8 });
    push("3 Managers created");

    const empData = [
      { name: "Alice Johnson",   email: "alice@nforce.com",   dept: "Engineering", mgr: mgr1.id, hrs: 8 },
      { name: "Bob Smith",       email: "bob@nforce.com",     dept: "Engineering", mgr: mgr1.id, hrs: 8 },
      { name: "Carol Williams",  email: "carol@nforce.com",   dept: "Design",      mgr: mgr2.id, hrs: 8 },
      { name: "David Brown",     email: "david@nforce.com",   dept: "Marketing",   mgr: mgr3.id, hrs: 8 },
      { name: "Eve Davis",       email: "eve@nforce.com",     dept: "Engineering", mgr: mgr1.id, hrs: 6 },
      { name: "Frank Miller",    email: "frank@nforce.com",   dept: "Sales",       mgr: mgr3.id, hrs: 8 },
      { name: "Grace Lee",       email: "grace@nforce.com",   dept: "Design",      mgr: mgr2.id, hrs: 7 },
      { name: "Henry Wilson",    email: "henry@nforce.com",   dept: "Engineering", mgr: mgr1.id, hrs: 8 },
      { name: "Ivy Thomas",      email: "ivy@nforce.com",     dept: "Marketing",   mgr: mgr3.id, hrs: 6 },
      { name: "Jack Anderson",   email: "jack@nforce.com",    dept: "Operations",  mgr: mgr3.id, hrs: 8 },
    ];

    const empIds = [];
    for (const e of empData) {
      const u = await User.create({ name: e.name, email: e.email, password: empPw, role: "EMPLOYEE", department: e.dept, managerId: e.mgr, isActive: true, defaultHours: e.hrs });
      empIds.push(u.id);
      push(`Employee ${e.name} created`);
    }

    const holidays = [
      { date: "2026-01-14", name: "Pongal",                description: "Harvest festival" },
      { date: "2026-01-26", name: "Republic Day",          description: "National holiday" },
      { date: "2026-03-01", name: "Maha Shivaratri",       description: "Religious festival" },
      { date: "2026-03-20", name: "Holi",                  description: "Festival of colours" },
      { date: "2026-04-02", name: "Good Friday",           description: "Christian holiday" },
      { date: "2026-04-14", name: "Ambedkar Jayanti",      description: "Birth anniversary" },
      { date: "2026-05-01", name: "Labour Day",            description: "International Workers' Day" },
      { date: "2026-08-15", name: "Independence Day",      description: "National holiday" },
      { date: "2026-08-27", name: "Ganesh Chaturthi",      description: "Religious festival" },
      { date: "2026-10-02", name: "Gandhi Jayanti",        description: "National holiday" },
      { date: "2026-10-22", name: "Dussehra",              description: "Religious festival" },
      { date: "2026-11-12", name: "Diwali",                description: "Festival of lights" },
      { date: "2026-11-15", name: "Diwali (holiday)",      description: "Festival of lights extended" },
      { date: "2026-12-25", name: "Christmas",             description: "Christian holiday" },
    ];

    for (const h of holidays) {
      await Holiday.create(h);
    }
    push(`${holidays.length} holidays created`);

    const clientData = [
      { name: "Acme Corp",       code: "ACME", company: "Acme Corporation",    email: "billing@acme.com",    phone: "+1-555-0101", status: "ACTIVE",   billingType: "HOURLY" },
      { name: "Globex Inc",      code: "GLBX", company: "Globex Industries",   email: "ar@globex.com",       phone: "+1-555-0102", status: "ACTIVE",   billingType: "FIXED" },
      { name: "Initech",         code: "INIT", company: "Initech Solutions",   email: "payments@initech.com",phone: "+1-555-0103", status: "ACTIVE",   billingType: "HOURLY" },
      { name: "Hooli",           code: "HOOl", company: "Hooli Technologies",  email: "finance@hooli.com",   phone: "+1-555-0104", status: "ACTIVE",   billingType: "HOURLY" },
      { name: "Stark Industries",code: "STARK",company: "Stark Industries",     email: "acc@stark.com",       phone: "+1-555-0105", status: "ACTIVE",   billingType: "FIXED" },
      { name: "Wayne Enterprises",code:"WAYNE",company: "Wayne Enterprises",   email: "bills@wayne.com",     phone: "+1-555-0106", status: "INACTIVE", billingType: "HOURLY" },
    ];

    const clientIds = [];
    for (const c of clientData) {
      const cl = await Client.create(c);
      clientIds.push(cl.id);
      push(`Client ${c.name} created`);
    }

    const projData = [
      { name: "Website Redesign",       code: "WEB-RD", clientIdx: 0, mgr: mgr1.id, budgetHours: 500, budgetAmount: 50000,  status: "ACTIVE",   desc: "Complete overhaul of corporate website" },
      { name: "Mobile App Dev",         code: "MOB-APP",clientIdx: 0, mgr: mgr1.id, budgetHours: 800, budgetAmount: 96000,  status: "ACTIVE",   desc: "Cross-platform mobile application" },
      { name: "Cloud Migration",        code: "CLD-MIG",clientIdx: 1, mgr: mgr1.id, budgetHours: 1200,budgetAmount: 144000, status: "ACTIVE",   desc: "Migrate on-prem infrastructure to cloud" },
      { name: "Data Analytics Platform",code: "DAT-ANL",clientIdx: 1, mgr: mgr2.id, budgetHours: 600, budgetAmount: 72000,  status: "ACTIVE",   desc: "Real-time data analytics dashboard" },
      { name: "Internal CRM Tool",      code: "CRM-INT",clientIdx: 2, mgr: mgr2.id, budgetHours: 300, budgetAmount: 30000,  status: "COMPLETED",desc: "In-house customer relationship management" },
      { name: "E-commerce Site",        code: "ECOMM",  clientIdx: 3, mgr: mgr1.id, budgetHours: 900, budgetAmount: 108000, status: "ACTIVE",   desc: "Full-featured online store" },
      { name: "AI Chatbot",             code: "AI-BOT", clientIdx: 4, mgr: mgr2.id, budgetHours: 400, budgetAmount: 56000,  status: "ACTIVE",   desc: "Customer support AI chatbot" },
      { name: "Legacy System Audit",    code: "LEG-AUD",clientIdx: 5, mgr: mgr3.id, budgetHours: 150, budgetAmount: 15000,  status: "INACTIVE", desc: "Audit of legacy systems (on hold)" },
    ];

    const projectIds = [];
    for (const p of projData) {
      const proj = await Project.create({
        name: p.name, code: p.code, clientId: clientIds[p.clientIdx], managerId: p.mgr,
        budgetHours: p.budgetHours, budgetAmount: p.budgetAmount, status: p.status,
        description: p.desc, startDate: "2025-06-01", endDate: p.status === "COMPLETED" ? "2026-01-15" : "2026-12-31",
      });
      projectIds.push(proj.id);
      push(`Project ${p.name} created`);
    }

    for (const pid of projectIds) {
      for (const uid of empIds) {
        await ProjectUser.create({ projectId: pid, userId: uid });
      }
    }
    push("Project-user assignments created");

    const taskData = [
      { title: "Frontend Development",     cat: "Development",  pi: 0, bill: true,  assignIdx: 0 },
      { title: "Backend API",              cat: "Development",  pi: 0, bill: true,  assignIdx: 1 },
      { title: "UI/UX Design",             cat: "Design",       pi: 0, bill: true,  assignIdx: 2 },
      { title: "iOS Development",          cat: "Mobile",       pi: 1, bill: true,  assignIdx: 0 },
      { title: "Android Development",      cat: "Mobile",       pi: 1, bill: true,  assignIdx: 1 },
      { title: "AWS Infrastructure",       cat: "DevOps",       pi: 2, bill: true,  assignIdx: 4 },
      { title: "Database Migration",       cat: "DevOps",       pi: 2, bill: true,  assignIdx: 1 },
      { title: "Dashboard UI",             cat: "Development",  pi: 3, bill: true,  assignIdx: 2 },
      { title: "Report Generation",        cat: "Development",  pi: 3, bill: true,  assignIdx: 4 },
      { title: "User Management Module",   cat: "Backend",      pi: 4, bill: false, assignIdx: 1 },
      { title: "Product Catalog",          cat: "Development",  pi: 5, bill: true,  assignIdx: 0 },
      { title: "Payment Integration",      cat: "Integration",  pi: 5, bill: true,  assignIdx: 1 },
      { title: "NLP Model Training",       cat: "AI/ML",        pi: 6, bill: true,  assignIdx: 4 },
      { title: "Chatbot Conversation Flow",cat: "Design",       pi: 6, bill: true,  assignIdx: 2 },
      { title: "Code Review & Docs",       cat: "Maintenance",  pi: 7, bill: false, assignIdx: 7 },
    ];

    const taskIds = [];
    for (const t of taskData) {
      const task = await Task.create({
        title: t.title, category: t.cat, projectId: projectIds[t.pi],
        isBillableDefault: t.bill, assignedTo: empIds[t.assignIdx],
        status: "PENDING", description: `Task: ${t.title}`,
      });
      taskIds.push(task.id);
      push(`Task ${t.title} created`);
    }

    for (let i = 0; i < projectIds.length; i++) {
      await BillingRate.create({ projectId: projectIds[i], billingRate: 100 + i * 25, costRate: 50 + i * 10, effectiveFrom: "2025-01-01", role: "EMPLOYEE" });
      await BillingRate.create({ projectId: projectIds[i], billingRate: 150 + i * 30, costRate: 75 + i * 15, effectiveFrom: "2025-01-01", role: "MANAGER" });
    }
    push("Billing rates created");

    const uidToMgr = {};
    empIds.forEach((uid, i) => { uidToMgr[uid] = empData[i].mgr; });

    const entryStatuses = ["SUBMITTED", "APPROVED", "APPROVED", "SUBMITTED", "DRAFT", "REJECTED"];
    let entryCount = 0;

    for (const uid of empIds) {
      for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
        const date = new Date();
        date.setDate(date.getDate() - dayOffset);
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dateStr = date.toISOString().split("T")[0];
        const pIdx = Math.floor(Math.random() * projectIds.length);
        const cIdx = Math.floor(Math.random() * clientIds.length);
        const tIdx = Math.floor(Math.random() * taskIds.length);

        const hours = Math.round((2 + Math.random() * 6) * 100) / 100;
        const entryStatus = entryStatuses[Math.floor(Math.random() * entryStatuses.length)];
        const billable = Math.random() > 0.15;

        await TimeEntry.create({
          userId: uid, managerId: uidToMgr[uid],
          clientId: clientIds[cIdx], projectId: projectIds[pIdx], taskId: taskIds[tIdx],
          client: clientData[cIdx].name, project: projData[pIdx].name, task: taskData[tIdx].title,
          entryDate: dateStr, hours, description: `Worked on ${taskData[tIdx].title} for ${projData[pIdx].name}`,
          isBillable: billable, status: entryStatus,
        });
        entryCount++;
      }
    }
    push(`${entryCount} time entries created`);

    let tsCount = 0;
    for (const uid of empIds) {
      for (let w = 1; w <= 6; w++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (w - 1) * 7 + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const ws = weekStart.toISOString().split("T")[0];
        const we = weekEnd.toISOString().split("T")[0];

        const entries = await TimeEntry.findAll({
          where: { userId: uid, entryDate: { [Op.between]: [ws, we] } },
        });
        const totalH = entries.reduce((s, e) => s + Number(e.hours || 0), 0);
        const billH = entries.filter(e => e.isBillable).reduce((s, e) => s + Number(e.hours || 0), 0);

        let tsStatus;
        if (w <= 2) tsStatus = "APPROVED";
        else if (w === 3) tsStatus = "SUBMITTED";
        else if (w === 4) tsStatus = "PARTIALLY_APPROVED";
        else if (w === 5) tsStatus = "DRAFT";
        else tsStatus = "APPROVED";

        await Timesheet.create({
          userId: uid, weekStartDate: ws, weekEndDate: we,
          totalHours: Math.round(totalH * 100) / 100,
          billableHours: Math.round(billH * 100) / 100,
          status: tsStatus,
          comment: tsStatus === "REJECTED" ? "Please fix and resubmit" : null,
        });
        tsCount++;
      }
    }
    push(`${tsCount} timesheets created`);

    const timesheets = await Timesheet.findAll({ where: { status: { [Op.in]: ["APPROVED", "SUBMITTED", "PARTIALLY_APPROVED"] } } });
    for (const ts of timesheets) {
      const mgrId = uidToMgr[ts.userId] || mgr1.id;
      await ApprovalHistory.create({ timesheetId: ts.id, actorId: ts.userId, action: "SUBMITTED", comment: "Please review" });
      if (ts.status === "APPROVED" || ts.status === "PARTIALLY_APPROVED") {
        await ApprovalHistory.create({ timesheetId: ts.id, actorId: mgrId, action: "APPROVED", comment: "Looks good" });
      }
    }
    push("Approval history created");

    const notifTypes = ["SUBMITTED", "APPROVED", "MANAGER_REMINDER"];
    for (const ts of timesheets.slice(0, 10)) {
      await Notification.create({ userId: ts.userId, type: notifTypes[Math.floor(Math.random() * notifTypes.length)], title: "Timesheet Update", message: `Timesheet ending ${ts.weekEndDate} has been processed`, relatedId: ts.id });
    }
    push("Notifications created");

    const auditActions = [
      { action: "LOGIN", entity: "User" },
      { action: "CREATE", entity: "TimeEntry" },
      { action: "SUBMIT", entity: "Timesheet" },
      { action: "APPROVE", entity: "Timesheet" },
      { action: "CREATE", entity: "Project" },
    ];
    for (let i = 0; i < 20; i++) {
      const a = auditActions[Math.floor(Math.random() * auditActions.length)];
      await AuditLog.create({ userId: empIds[Math.floor(Math.random() * empIds.length)], action: a.action, entity: a.entity, entityId: i, details: `Sample audit entry ${i}`, ipAddress: "192.168.1." + (100 + i) });
    }
    push("Audit logs created");

    res.json({ success: true, message: "Comprehensive demo data seeded successfully", data: { created: log } });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};