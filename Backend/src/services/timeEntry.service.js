import TimeEntry from "../models/timeEntry.model.js";
import User from "../models/user.model.js";
import ApprovalHistory from "../models/approvalHistory.model.js";
import { Op } from "sequelize";

// ✅ HELPER FUNCTION TO GET ENTRIES WITH USER DATA
const getEntriesWithUser = async (whereClause = {}) => {
  const entries = await TimeEntry.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        attributes: ["id", "name", "email", "employeeId"],
        required: false,
      },
      {
        model: User,
        as: "Manager",
        attributes: ["id", "name", "email"],
        required: false,
      },
      ],
      order: [["entryDate", "DESC"]],
    });

  // Fetch latest approval comment for each entry
  if (entries.length > 0) {
    const entryIds = entries.map((e) => e.id);
    const approvals = await ApprovalHistory.findAll({
      where: {
        timeEntryId: { [Op.in]: entryIds },
        action: { [Op.in]: ["APPROVED", "REJECTED", "COMMENTED"] },
      },
      include: [
        {
          model: User,
          as: "Actor",
        attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const approvalMap = {};
    approvals.forEach((a) => {
      if (!approvalMap[a.timeEntryId]) {
        approvalMap[a.timeEntryId] = a;
      }
    });

    const approvalHistoryAll = await ApprovalHistory.findAll({
      where: {
        timeEntryId: { [Op.in]: entryIds },
        action: { [Op.in]: ["APPROVED", "REJECTED"] },
      },
      attributes: ["timeEntryId"],
    });
    const previouslyApprovedOrRejectedIds = new Set(approvalHistoryAll.map((h) => h.timeEntryId));

    entries.forEach((entry) => {
      const approval = approvalMap[entry.id];
      entry.dataValues.managerComment = approval?.comment || null;
      entry.dataValues.previouslyApproved = entry.status === "SUBMITTED" && previouslyApprovedOrRejectedIds.has(entry.id);
    });
  }

  return entries;
};



// ================= CREATE =================
export const createTimeEntry = async (data) => {
  return await TimeEntry.create(data);
};

// ================= GET ALL =================
export const getAllTimeEntries = async () => {
  return await getEntriesWithUser();
};

// ================= GET BY USER =================
export const getEntriesByUser = async (userId) => {
  return await getEntriesWithUser({ userId });
};

// ================= GET BY MANAGER =================
export const getEntriesByManager = async (managerId) => {
  return await getEntriesWithUser({ managerId });
};

// ================= GET SUBMITTED ENTRIES FOR MANAGER APPROVAL =================
// A DRAFT entry already carries the managerId the employee picked (needed so
// a later Submit knows who to route to), but the Approvals page must only
// ever show entries the employee actually submitted — never a draft in
// progress — so DRAFT is excluded here regardless of managerId.
export const getSubmittedToManager = async (managerId) => {
  return await getEntriesWithUser({
    managerId,
    status: { [Op.ne]: "DRAFT" },
  });
};

// ================= GET MANAGER ENTRIES FOR ADMIN APPROVAL =================
export const getManagerEntriesForAdmin = async () => {
  const managers = await User.findAll({
    where: { role: "MANAGER", isActive: true },
    attributes: ["id"],
  });
  const managerIds = managers.map((m) => m.id);
  if (managerIds.length === 0) return [];
  return await getEntriesWithUser({
    userId: { [Op.in]: managerIds },
    status: { [Op.ne]: "DRAFT" },
  });
};

// ================= PENDING APPROVAL COUNT =================
export const getPendingApprovalCount = async (userId, role) => {
  let whereClause = { status: "SUBMITTED" };

  if (role === "MANAGER") {
    whereClause.managerId = userId;
  } else if (role === "ADMIN") {
    const managers = await User.findAll({
      where: { role: "MANAGER", isActive: true },
      attributes: ["id"],
    });
    const managerIds = managers.map((m) => m.id);
    if (managerIds.length === 0) return 0;
    whereClause.userId = { [Op.in]: managerIds };
  } else {
    return 0;
  }

  const entries = await TimeEntry.findAll({
    where: whereClause,
    attributes: ["userId", "entryDate"],
  });

  const weekKeys = new Set();
  entries.forEach((entry) => {
    const d = new Date(entry.entryDate);
    d.setDate(d.getDate() - d.getDay());
    const weekStart = d.toISOString().slice(0, 10);
    weekKeys.add(`${entry.userId}_${weekStart}`);
  });

  return weekKeys.size;
};

// ================= GET BY ID =================
export const getTimeEntryById = async (id) => {
  return await TimeEntry.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ["id", "name", "email", "managerId"],
        required: false,
      },
    ],
  });
};

// ================= COMMENT (manager note, no status change) =================
export const commentOnTimeEntry = async (entryId, actorId, comment) => {
  const entry = await TimeEntry.findByPk(entryId);
  if (!entry) throw new Error("Time entry not found");

  await ApprovalHistory.create({
    timeEntryId: entry.id,
    actorId,
    action: "COMMENTED",
    comment: comment || null,
  });

  return entry;
};

// ================= UPDATE =================
export const updateTimeEntry = async (id, data) => {
  const entry = await TimeEntry.findByPk(id);

  if (!entry) {
    throw new Error("Time entry not found");
  }

  await entry.update(data);
  return entry;
};

// ================= DELETE =================
export const deleteTimeEntry = async (id) => {
  const entry = await TimeEntry.findByPk(id);

  if (!entry) {
    throw new Error("Time entry not found");
  }

  await entry.destroy();
  return { message: "Time entry deleted successfully" };
};