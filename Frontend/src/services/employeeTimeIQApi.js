import api from "./api";

const extractData = (res) => {
  if (!res) return null;
  if (res.success !== undefined) return res;
  if (res.data !== undefined) return res.data;
  return res;
};

export const fetchETClients = async () => {
  const res = await api.get("/employee-timesheet/clients");
  return extractData(res.data);
};

export const fetchETProjectsByClient = async (clientId) => {
  const res = await api.get(`/employee-timesheet/projects/${clientId}`);
  return extractData(res.data);
};

export const fetchETManagerByProject = async (projectId) => {
  const res = await api.get(`/employee-timesheet/managers/${projectId}`);
  return extractData(res.data);
};

export const fetchETWeeklyTimesheet = async (weekStart) => {
  const params = weekStart ? { weekStart } : {};
  const res = await api.get("/employee-timesheet/weekly", { params });
  return extractData(res.data);
};

export const saveETDraft = async (data) => {
  const res = await api.post("/employee-timesheet/save", data);
  return extractData(res.data);
};

export const submitETTimesheet = async (data) => {
  const res = await api.post("/employee-timesheet/submit", data);
  return extractData(res.data);
};

export const updateETTimesheet = async (data) => {
  const res = await api.put("/employee-timesheet/update", data);
  return extractData(res.data);
};

export const updateETProjectDetails = async (data) => {
  const res = await api.put("/employee-timesheet/project-details", data);
  return extractData(res.data);
};

export const fetchETManagerAction = async (timesheetId) => {
  const res = await api.get(`/employee-timesheet/manager-action/${timesheetId}`);
  return extractData(res.data);
};

export const cancelETTimesheet = async (weekStartDate, projectId) => {
  const res = await api.post("/employee-timesheet/cancel", { weekStartDate, projectId });
  return extractData(res.data);
};

export const deleteETProjectEntries = async (projectId, weekStartDate, clientName, projectName) => {
  const params = {};
  if (clientName) params.clientName = clientName;
  if (projectName) params.projectName = projectName;
  const res = await api.delete(`/employee-timesheet/project/${projectId}/week/${weekStartDate}`, { params });
  return extractData(res.data);
};
