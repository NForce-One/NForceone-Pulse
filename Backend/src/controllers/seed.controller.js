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

export const seedDemoData = async (req, res) => {
  try {
    const result = { created: [], skipped: [] };
    const log = (msg) => result.created.push(msg);

    // ── Users ──
    const admin = await User.findOne({ where: { email: "admin@nforce.com" } });
    if (!admin) {
      const hp = await bcrypt.hash("Admin@Password123", 10);
      await User.create({ name: "System Admin", email: "admin@nforce.com", password: hp, role: "ADMIN", isActive: true });
      log("Admin created");
    }

    const manager = await User.findOne({ where: { email: "manager@nforce.com" } });
    let managerId;
    if (!manager) {
      const hp = await bcrypt.hash("Manager@Password123", 10);
      const m = await User.create({ name: "Sarah Manager", email: "manager@nforce.com", password: hp, role: "MANAGER", isActive: true });
      managerId = m.id;
      log("Manager created");
    } else {
      managerId = manager.id;
    }

    const employees = [
      { name: "Alice Johnson", email: "alice@nforce.com", dept: "Engineering" },
      { name: "Bob Smith", email: "bob@nforce.com", dept: "Engineering" },
      { name: "Carol Williams", email: "carol@nforce.com", dept: "Design" },
      { name: "David Brown", email: "david@nforce.com", dept: "Marketing" },
      { name: "Eve Davis", email: "eve@nforce.com", dept: "Engineering" },
      { name: "Frank Miller", email: "frank@nforce.com", dept: "Sales" },
    ];

    const empIds = [];
    for (const e of employees) {
      let user = await User.findOne({ where: { email: e.email } });
      if (!user) {
        const hp = await bcrypt.hash("Nforce@123", 10);
        user = await User.create({ name: e.name, email: e.email, password: hp, role: "EMPLOYEE", department: e.dept, managerId, isActive: true, defaultHours: 8 });
        log(`Employee ${e.name} created`);
      }
      empIds.push(user.id);
    }

    // ── Clients ──
    const clientData = [
      { name: "Acme Corp", code: "ACME", company: "Acme Corporation", billingType: "HOURLY" },
      { name: "Globex Inc", code: "GLBX", company: "Globex Industries", billingType: "FIXED" },
      { name: "Initech", code: "INIT", company: "Initech Solutions", billingType: "HOURLY" },
      { name: "Hooli", code: "HOOl", company: "Hooli Technologies", billingType: "HOURLY" },
    ];
    const clientIds = [];
    for (const c of clientData) {
      let cl = await Client.findOne({ where: { code: c.code } });
      if (!cl) {
        cl = await Client.create({ ...c, status: "ACTIVE" });
        log(`Client ${c.name} created`);
      }
      clientIds.push(cl.id);
    }

    // ── Projects ──
    const projectData = [
      { name: "Website Redesign", code: "WEB-RD", clientIdx: 0, budgetHours: 500 },
      { name: "Mobile App Dev", code: "MOB-APP", clientIdx: 0, budgetHours: 800 },
      { name: "Cloud Migration", code: "CLD-MIG", clientIdx: 1, budgetHours: 1200 },
      { name: "Data Analytics Platform", code: "DAT-ANL", clientIdx: 1, budgetHours: 600 },
      { name: "Internal CRM Tool", code: "CRM-INT", clientIdx: 2, budgetHours: 300 },
      { name: "E-commerce Site", code: "ECOMM", clientIdx: 3, budgetHours: 900 },
    ];
    const projectIds = [];
    for (const p of projectData) {
      let proj = await Project.findOne({ where: { code: p.code } });
      if (!proj) {
        proj = await Project.create({
          name: p.name, code: p.code, clientId: clientIds[p.clientIdx], managerId,
          budgetHours: p.budgetHours, status: "ACTIVE",
        });
        log(`Project ${p.name} created`);
      }
      projectIds.push(proj.id);
    }

    // ── Assign employees to projects ──
    for (const pid of projectIds) {
      for (const uid of empIds) {
        const exists = await ProjectUser.findOne({ where: { projectId: pid, userId: uid } });
        if (!exists) {
          await ProjectUser.create({ projectId: pid, userId: uid });
        }
      }
    }

    // ── Tasks ──
    const taskData = [
      { title: "Frontend Development", category: "Development", projIdx: 0 },
      { title: "Backend API", category: "Development", projIdx: 0 },
      { title: "UI/UX Design", category: "Design", projIdx: 0 },
      { title: "iOS Development", category: "Mobile", projIdx: 1 },
      { title: "Android Development", category: "Mobile", projIdx: 1 },
      { title: "AWS Infrastructure", category: "DevOps", projIdx: 2 },
      { title: "Database Setup", category: "DevOps", projIdx: 2 },
      { title: "Dashboard UI", category: "Development", projIdx: 3 },
      { title: "Report Generation", category: "Development", projIdx: 3 },
      { title: "User Management", category: "Backend", projIdx: 4 },
      { title: "Product Catalog", category: "Development", projIdx: 5 },
      { title: "Payment Integration", category: "Integration", projIdx: 5 },
    ];
    const taskIds = [];
    for (const t of taskData) {
      let task = await Task.findOne({ where: { title: t.title, projectId: projectIds[t.projIdx] } });
      if (!task) {
        task = await Task.create({
          title: t.title, category: t.category, projectId: projectIds[t.projIdx], status: "PENDING",
        });
        log(`Task ${t.title} created`);
      }
      taskIds.push(task.id);
    }

    // ── Billing Rates ──
    for (let i = 0; i < projectIds.length; i++) {
      const exists = await BillingRate.findOne({ where: { projectId: projectIds[i] } });
      if (!exists) {
        await BillingRate.create({ projectId: projectIds[i], billingRate: 100 + i * 25, costRate: 50 + i * 10, effectiveFrom: "2025-01-01" });
      }
    }

    // ── Time Entries (last 4 weeks, weekdays) ──
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const statuses = ["SUBMITTED", "APPROVED", "APPROVED", "SUBMITTED", "DRAFT"];
    let entryCount = 0;

    for (const uid of empIds) {
      for (let dayOffset = 1; dayOffset <= 20; dayOffset++) {
        const date = new Date();
        date.setDate(date.getDate() - dayOffset);
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dateStr = date.toISOString().split("T")[0];
        const pIdx = Math.floor(Math.random() * projectIds.length);
        const tIdx = taskIds[Math.floor(Math.random() * taskIds.length)];

        const exists = await TimeEntry.findOne({ where: { userId: uid, entryDate: dateStr } });
        if (!exists) {
          const hours = Math.round((4 + Math.random() * 4) * 100) / 100;
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          await TimeEntry.create({
            userId: uid, managerId, clientId: clientIds[pIdx], projectId: projectIds[pIdx], taskId: tIdx,
            client: clientData[pIdx].name, project: projectData[pIdx].name, task: taskData[tIdx].title,
            entryDate: dateStr, hours, description: `Work on ${taskData[tIdx].title} for ${projectData[pIdx].name}`,
            isBillable: Math.random() > 0.2, status,
          });
          entryCount++;
        }
      }
    }
    log(`${entryCount} time entries created`);

    // ── Timesheets ──
    let tsCount = 0;
    for (const uid of empIds) {
      for (let w = 1; w <= 4; w++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (w - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const ws = weekStart.toISOString().split("T")[0];
        const we = weekEnd.toISOString().split("T")[0];

        const exists = await Timesheet.findOne({ where: { userId: uid, weekStartDate: ws } });
        if (!exists) {
          const entries = await TimeEntry.findAll({
            where: { userId: uid, entryDate: { [Op.between]: [ws, we] } },
          });
          const totalH = entries.reduce((s, e) => s + Number(e.hours || 0), 0);
          const billH = entries.filter(e => e.isBillable).reduce((s, e) => s + Number(e.hours || 0), 0);
          const tsStatus = w <= 2 ? "APPROVED" : w === 3 ? "SUBMITTED" : "DRAFT";
          await Timesheet.create({
            userId: uid, weekStartDate: ws, weekEndDate: we,
            totalHours: Math.round(totalH * 100) / 100,
            billableHours: Math.round(billH * 100) / 100,
            status: tsStatus,
          });
          tsCount++;
        }
      }
    }
    log(`${tsCount} timesheets created`);

    res.json({ success: true, message: "Demo data seeded successfully", data: result });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
