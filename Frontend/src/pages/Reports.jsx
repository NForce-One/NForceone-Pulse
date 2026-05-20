import React, { useState, useEffect } from "react";
import {
  getEmployeeHoursReport,
  getProjectHoursReport,
  getUtilizationReport,
  getBillingSummary,
  exportReportCSV,
  fetchProjects,
  fetchClients,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { BarChart3, Download } from "lucide-react";
import { format } from "date-fns";

export const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("employee-hours");
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    projectId: "",
    clientId: "",
    department: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const userId = user?.role === "EMPLOYEE" ? user?.id : null;
    const loadProjects = async () => {
      try {
        const res = await fetchProjects(userId);
        setProjects(res?.data || []);
      } catch (err) {
        setProjects([]);
      }
    };
    const loadClients = async () => {
      try {
        const res = await fetchClients(userId);
        setClients(res?.data || []);
      } catch (err) {
        setClients([]);
      }
    };
    loadProjects();
    loadClients();
  }, [user]);

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      let response;
      switch (activeTab) {
        case "employee-hours":
          response = await getEmployeeHoursReport(filters);
          break;
        case "project-hours":
          response = await getProjectHoursReport(filters);
          break;
        case "utilization":
          response = await getUtilizationReport(filters);
          break;
        case "billing":
          response = await getBillingSummary(filters);
          break;
        default:
          response = { data: [] };
      }
      const reportData = response?.data || [];
      setData(reportData);
      if (reportData.length > 0) {
        setMessage({ text: `Report generated successfully! Found ${reportData.length} records.`, type: "success" });
      } else {
        setMessage({ text: "No data found for the selected filters.", type: "info" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: "Error generating report. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setMessage({ text: "", type: "" });
  };

  const exportCSV = async () => {
    try {
      const reportTypeMap = {
        "employee-hours": "employee_hours",
        "project-hours": "project_hours",
        "utilization": "utilization",
        "billing": "billing_summary",
      };
      const params = {
        ...filters,
        report_type: reportTypeMap[activeTab] || "employee_hours",
      };
      const response = await exportReportCSV(params);
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = response.headers["content-disposition"];
      let filename = `report_${new Date().toISOString().split("T")[0]}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      alert("CSV exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#ff2d2d]" />
            Reports
          </h1>
          <p className="text-[#a1a1aa]">View and export time tracking reports</p>
        </div>
        <Button onClick={exportCSV} disabled={!data.length} className="hover:scale-105 active:scale-95">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-900/50 text-green-300 border border-green-700" :
          message.type === "error" ? "bg-red-900/50 text-red-300 border border-red-700" :
          "bg-blue-900/50 text-blue-300 border border-blue-700"
        }`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4 flex-wrap">
            <Input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} />
            <Input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} />
            <select
              name="projectId"
              value={filters.projectId}
              onChange={handleFilterChange}
              className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              name="clientId"
              value={filters.clientId}
              onChange={handleFilterChange}
              className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input name="department" value={filters.department} onChange={handleFilterChange} placeholder="Department" />
            <Button onClick={loadReport} className="hover:scale-105 active:scale-95">
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-[#a1a1aa]">Loading...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-[#a1a1aa]">No data found. Adjust filters and generate report.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a]">
                  <tr>
                    {activeTab === "employee-hours" && (
                      <>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Employee</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Project</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Task</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Hours</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Billable</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Status</th>
                      </>
                    )}
                    {activeTab === "project-hours" && (
                      <>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Project</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Client</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Employee</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Hours</th>
                      </>
                    )}
                    {activeTab === "utilization" && (
                      <>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Employee</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Department</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Total Hours</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Working</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Extra</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Utilization %</th>
                      </>
                    )}
                    {activeTab === "billing" && (
                      <>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Client</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Project</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Total Working Hours</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === "employee-hours" && data.map((entry, i) => (
                    <tr key={i} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150">
                      <td className="px-4 py-3 text-white">{entry.User?.name || "-"}</td>
                      <td className="px-4 py-3 text-white">{entry.projectName || entry.Project?.name || "-"}</td>
                      <td className="px-4 py-3 text-white">{entry.taskTitle || entry.Task?.title || "-"}</td>
                      <td className="px-4 py-3 text-[#a1a1aa]">{entry.entryDate}</td>
                      <td className="px-4 py-3 text-white font-medium">{entry.hours}h</td>
                      <td className="px-4 py-3">
                        <Badge variant={entry.isBillable ? "success" : "warning"}>
                          {entry.isBillable ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={entry.status === "APPROVED" ? "success" : entry.status === "SUBMITTED" ? "warning" : "default"}>
                          {entry.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {activeTab === "project-hours" && data.map((entry, i) => (
                    <tr key={i} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150">
                      <td className="px-4 py-3 text-white">{entry.projectName || entry.Project?.name || "-"}</td>
                      <td className="px-4 py-3 text-white">{entry.clientName || entry.Client?.name || "-"}</td>
                      <td className="px-4 py-3 text-white">{entry.User?.name || "-"}</td>
                      <td className="px-4 py-3 text-[#a1a1aa]">{entry.entryDate}</td>
                      <td className="px-4 py-3 text-white font-medium">{entry.hours}h</td>
                    </tr>
                  ))}
                  {activeTab === "utilization" && data.map((u, i) => (
                    <tr key={i} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150">
                      <td className="px-4 py-3 text-white">{u.name || "-"}</td>
                      <td className="px-4 py-3 text-[#a1a1aa]">{u.department || "-"}</td>
                      <td className="px-4 py-3 text-white">{(u.totalHours ?? 0)}h</td>
                      <td className="px-4 py-3 text-white">{(u.billableHours ?? 0)}h</td>
                      <td className="px-4 py-3 text-white">{(u.nonBillableHours ?? 0)}h</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.utilizationPercent >= 70 ? "success" : u.utilizationPercent >= 50 ? "warning" : "danger"}>
                          {(u.utilizationPercent ?? 0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {activeTab === "billing" && data.map((b, i) => (
                    <tr key={i} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150">
                      <td className="px-4 py-3 text-white">{b.clientName}</td>
                      <td className="px-4 py-3 text-white">{b.projectName}</td>
                      <td className="px-4 py-3 text-white font-medium">{b.totalHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
