
import "dotenv/config";
import jwt from "jsonwebtoken";

const token = jwt.sign(
  { user: { id: 720014, role: "EMPLOYEE", name: "venkyguptha" } },
  process.env.JWT_SECRET || "secretkey",
  { expiresIn: "1h" }
);

const BASE = "http://localhost:5000/api/employee-timesheet";
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

const weekStartDate = "2026-07-26";
// Use two distinct real projects for this user's org: 240007 (HR Portal / TechNova, clientId?) and 300006 (CSD / Airtel)
const projA = { projectId: 240007, clientId: 240007 ? undefined : undefined };

// Save draft with two projects: 240007 (HR Portal) and 300006 (CSD)
const dailyEntries = [];
const dates = ["2026-07-27", "2026-07-28"];
for (const d of dates) {
  dailyEntries.push({
    entryDate: d, hours: 5, description: "test A", clientId: 240001, projectId: 240007,
    managerId: 720019, clientName: "TechNova Solutions Pvt. Ltd.", projectName: "HR Portal",
  });
  dailyEntries.push({
    entryDate: d, hours: 3, description: "test B", clientId: 300001, projectId: 300006,
    managerId: 720018, clientName: "Airtel", projectName: "CSD",
  });
}

console.log("--- saveDraft (2 projects) ---");
console.log(JSON.stringify(await post("/save", { weekStartDate, dailyEntries }), null, 2));

console.log("--- submit projectId=240007 only ---");
const submitEntriesA = dates.map((d) => ({
  entryDate: d, hours: 5, description: "test A", clientId: 240001, projectId: 240007,
  managerId: 720019, clientName: "TechNova Solutions Pvt. Ltd.", projectName: "HR Portal",
}));
console.log(JSON.stringify(await post("/submit", { weekStartDate, projectId: 240007, dailyEntries: submitEntriesA }), null, 2));

console.log("--- weekly timesheet after submitting only project 240007 ---");
const weekly = await get(`/weekly?weekStart=${weekStartDate}`);
console.log(JSON.stringify(weekly.body?.data?.entries?.map(e => ({ project: e.project, projectId: e.projectId, date: e.entryDate, status: e.status })), null, 2));
console.log("timesheet.status:", weekly.body?.data?.timesheet?.status);

process.exit(0);
