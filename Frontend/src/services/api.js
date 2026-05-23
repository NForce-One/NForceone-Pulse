import axios from "axios";

// 🔥 BASE URL
const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// ✅ Attach JWT Token (NO CHANGE)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ FIXED GLOBAL ERROR HANDLER (ONLY CHANGE HERE)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔥 ONLY handle 401 (not 403)
    if (error.response?.status === 401) {
      console.error("❌ Unauthorized - token invalid or expired");

      // clear only if truly invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "/login";
    }

    // ❗ DO NOT logout on 403 or 400
    return Promise.reject(error);
  }
);

// ================= AUTH =================

// ✅ LOGIN
export const loginUser = async ({ email, password }) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });
  return response.data;
};

// ✅ FORGOT PASSWORD
export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

// ✅ RESET PASSWORD
export const resetPassword = async (data) => {
  const response = await api.post("/auth/reset-password", data);
  return response.data;
};

// ✅ REGISTER
export const registerUser = async (data) => {
  const response = await api.post("/auth/register", data);
  return response.data;
};

// ✅ GET MANAGERS
export const getManagers = async () => {
  const response = await api.get("/auth/managers");
  return response.data;
};

// ================= TIME ENTRIES =================

// ✅ FETCH
export const fetchTimeEntries = async (params = {}) => {
  const response = await api.get("/time-entries", { params });
  return response.data;
};

// ✅ CREATE
export const createTimeEntry = async (data) => {
  const payload = {
    client: data.client || null,
    project: data.project,
    task: data.task,
    description: data.description,
    hours: Number(data.hours),
    date: data.date || new Date().toISOString().split("T")[0],
    managerId: data.managerId || null,
    clientId: data.clientId || null,
    projectId: data.projectId || null,
    taskId: data.taskId || null,
    workItemRef: data.workItemRef || null,
    isBillable: data.isBillable !== undefined ? data.isBillable : true,
  };

  const response = await api.post("/time-entries", payload);
  return response.data;
};

export const updateTimeEntry = async (id, data) => {
  const response = await api.put(`/time-entries/${id}`, data);
  return response.data;
};

export const deleteTimeEntry = async (id) => {
  const response = await api.delete(`/time-entries/${id}`);
  return response.data;
};

// ================= FLOW ACTIONS =================

export const submitTimeEntry = async (id) => {
  const response = await api.put(`/time-entries/${id}/submit`);
  return response.data;
};

export const approveTimeEntry = async (id, comment = "") => {
  const response = await api.put(`/time-entries/${id}/approve`, { comment });
  return response.data;
};

export const rejectTimeEntry = async (id, comment = "") => {
  const response = await api.put(`/time-entries/${id}/reject`, { comment });
  return response.data;
};

export const commentTimeEntry = async (id, comment) => {
  const response = await api.put(`/time-entries/${id}/comment`, { comment });
  return response.data;
};

// ================= TIMER =================

export const getActiveTimer = async () => {
  const response = await api.get("/timers/active");
  return response.data;
};

export const startTimer = async (data) => {
  const response = await api.post("/timers/start", data);
  return response.data;
};

export const pauseTimer = async (id) => {
  const response = await api.put(`/timers/${id}/pause`);
  return response.data;
};

export const resumeTimer = async (id) => {
  const response = await api.put(`/timers/${id}/resume`);
  return response.data;
};

export const stopTimer = async (id) => {
  const response = await api.put(`/timers/${id}/stop`);
  return response.data;
};

export const saveTimer = async (id) => {
  const response = await api.put(`/timers/${id}/save`);
  return response.data;
};

export const convertTimerToEntry = async (id) => {
  const response = await api.post(`/timers/${id}/convert`);
  return response.data;
};

// ================= TIMESHEETS =================

export const fetchTimesheets = async () => {
  const response = await api.get("/timesheets");
  return response.data;
};

export const fetchTimesheetById = async (id) => {
  const response = await api.get(`/timesheets/${id}`);
  return response.data;
};

export const fetchFilteredTimeEntries = async (filters = {}) => {
  const params = {};
  if (filters.employeeId) params.employeeId = filters.employeeId;
  if (filters.managerId) params.managerId = filters.managerId;
  if (filters.managerTeamId) params.managerTeamId = filters.managerTeamId;
  const response = await api.get("/timesheets/filtered-entries", { params });
  return response.data?.data ?? response.data ?? [];
};

// ================= TEAM TIMESHEETS (MANAGER) =================

export const fetchTeamTimesheets = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "ALL") {
    params.append("status", filters.status);
  }
  if (filters.dateFrom) {
    params.append("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.append("dateTo", filters.dateTo);
  }
  if (filters.employeeId) {
    params.append("employeeId", filters.employeeId);
  }
  if (filters.managerId) {
    params.append("managerId", filters.managerId);
  }

  const queryString = params.toString();
  const url = `/timesheets/team${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data;
};

export const generateTimesheet = async (weekStartDate) => {
  const response = await api.post("/timesheets/generate", { weekStartDate });
  return response.data;
};

export const submitTimesheet = async (id, comment) => {
  const response = await api.put(`/timesheets/${id}/submit`, { comment });
  return response.data;
};

export const approveTimesheet = async (id, comment) => {
  const response = await api.put(`/timesheets/${id}/approve`, { comment });
  return response.data;
};

export const rejectTimesheet = async (id, comment) => {
  const response = await api.put(`/timesheets/${id}/reject`, { comment });
  return response.data;
};

export const commentTimesheet = async (id, comment) => {
  const response = await api.put(`/timesheets/${id}/comment`, { comment });
  return response.data;
};

export const withdrawTimesheet = async (id) => {
  const response = await api.put(`/timesheets/${id}/withdraw`);
  return response.data;
};

export const getTimesheetHistory = async (id) => {
  const response = await api.get(`/timesheets/${id}/history`);
  return response.data;
};

// ================= CLIENTS =================

export const fetchClients = async (userId = null) => {
  const params = userId ? { userId } : {};
  const response = await api.get("/clients", { params });
  return response.data;
};

export const createClient = async (data) => {
  const response = await api.post("/clients", data);
  return response.data;
};

export const updateClient = async (id, data) => {
  const response = await api.put(`/clients/${id}`, data);
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await api.delete(`/clients/${id}`);
  return response.data;
};

// ================= PROJECTS =================

export const fetchProjects = async (userId = null) => {
  const params = userId ? { userId } : {};
  const response = await api.get("/projects", { params });
  return response.data;
};

// ================= TASKS =================

export const fetchTasks = async () => {
  const response = await api.get("/tasks");
  return response.data;
};

// ================= USERS =================

export const getNextEmployeeId = async () => {
  const response = await api.get("/users/next-employee-id");
  return response.data;
};

export const fetchUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const getUser = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (data) => {
  const response = await api.post("/users", data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const toggleUserStatus = async (id) => {
  const response = await api.put(`/users/${id}/toggle-status`);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get("/users/me");
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await api.put("/users/me/profile", data);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await api.put("/users/me/change-password", data);
  return response.data;
};

export const fetchAllUsers = async () => {
  const res = await fetchUsers();
  return res?.data ?? res ?? [];
};

export const fetchAllProjects = async () => {
  const res = await fetchProjects();
  return res?.data ?? res ?? [];
};

export const fetchAllClients = async () => {
  const res = await fetchClients();
  return res?.data ?? res ?? [];
};

// ================= TEAM MEMBERS (MANAGER) =================

export const fetchTeamMembers = async (managerId = null) => {
  const params = managerId ? { managerId } : {};
  const response = await api.get("/users/team-members", { params });
  return response.data;
};

// ================= NOTIFICATIONS =================

export const fetchNotifications = async () => {
  const response = await api.get("/notifications");
  return response.data;
};

export const fetchUnreadCount = async () => {
  const response = await api.get("/notifications/unread-count");
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch("/notifications/read-all");
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

// ================= REPORTS =================

export const getDashboardStats = async (params = {}) => {
  const response = await api.get("/reports/dashboard", { params });
  return response.data?.data ?? response.data;
};

export const getHourDetails = async (params = {}) => {
  const response = await api.get("/reports/dashboard/hour-details", { params });
  const result = response.data?.data ?? response.data;
  if (result && typeof result === "object" && !Array.isArray(result) && result.success === false) {
    return null;
  }
  return result;
};

export const getEmployeeHoursReport = async (params) => {
  const response = await api.get("/reports/employee-hours", { params });
  return response.data;
};

export const getProjectHoursReport = async (params) => {
  const response = await api.get("/reports/project-hours", { params });
  return response.data;
};

export const getUtilizationReport = async (params) => {
  const response = await api.get("/reports/utilization", { params });
  return response.data;
};

export const getBillingSummary = async (params) => {
  const response = await api.get("/reports/billing-summary", { params });
  return response.data;
};

export const getTimesheetStatusReport = async (params) => {
  const response = await api.get("/reports/timesheet-status", { params });
  return response.data;
};

export const exportReportCSV = async (params) => {
  const response = await api.get("/reports/export", {
    params,
    responseType: "blob",
  });
  return response;
};

export const createProject = async (data) => {
  const response = await api.post("/projects", data);
  return response.data;
};

export const updateProject = async (id, data) => {
  const response = await api.put(`/projects/${id}`, data);
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

export const createTask = async (data) => {
  const response = await api.post("/tasks", data);
  return response.data;
};

export const updateTask = async (id, data) => {
  const response = await api.put(`/tasks/${id}`, data);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};

export default api;