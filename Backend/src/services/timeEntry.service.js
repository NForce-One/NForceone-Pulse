import TimeEntry from "../models/timeEntry.model.js";
import User from "../models/user.model.js"; // ✅ ADD THIS

// ✅ HELPER FUNCTION TO GET ENTRIES WITH USER DATA
const getEntriesWithUser = async (whereClause = {}) => {
  const entries = await TimeEntry.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"], // ✅ FETCH USER NAME
        required: false,
      },
      {
        model: User,
        as: "Manager",
        attributes: ["id", "name", "email"], // ✅ FETCH MANAGER NAME
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
  });
  
  // 🔥 DEBUG LOG
  console.log("📊 ENTRIES WITH USER:", JSON.stringify(entries, null, 2));
  
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

// ================= GET BY ID =================
export const getTimeEntryById = async (id) => {
  return await TimeEntry.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"],
        required: false,
      },
    ],
  });
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