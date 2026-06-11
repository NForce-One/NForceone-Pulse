import React, { useState, useEffect } from "react";
import {
  getEmployeeHoursReport,
  getProjectHoursReport,
  getUtilizationReport,
  getBillingSummary,
  exportReportCSV,
  fetchProjects,
  fetchClients,
  getApprovedEmployees,
  getManagers,
  fetchUsers,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCachedData } from "../hooks/useCachedData";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import CustomSelect from "../components/ui/CustomSelect";
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
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    projectId: "",
    clientId: "",
    department: "",
    userId: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [reportType, setReportType] = useState("team");
  const [allManagers, setAllManagers] = useState([]);
  const [allEmployeesForAdmin, setAllEmployeesForAdmin] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");

  const { data: cachedProjects } = useCachedData("reports_projects", async () => {
    const res = await fetchProjects();
    return res?.data || [];
  });
  const { data: cachedClients } = useCachedData("reports_clients", async () => {
    const res = await fetchClients();
    return res?.data || [];
  });

  useEffect(() => {
    if (cachedProjects) setProjects(cachedProjects);
  }, [cachedProjects]);
  useEffect(() => {
    if (cachedClients) setClients(cachedClients);
  }, [cachedClients]);

  useEffect(() => {
    if (user?.role === "MANAGER") {
      getApprovedEmployees().then((res) => {
        setEmployees(res?.data || []);
      }).catch(() => setEmployees([]));
    }
    if (user?.role === "ADMIN") {
      getManagers().then((res) => {
        setAllManagers(res?.data || []);
      }).catch(() => setAllManagers([]));
      fetchUsers().then((res) => {
        const employeeList = (res?.data || []).filter((u) => u.role === "EMPLOYEE");
        setAllEmployeesForAdmin(employeeList);
      }).catch(() => setAllEmployeesForAdmin([]));
    }
  }, [user]);

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params = { ...filters, ...getAdminParams() };
      let response;
      switch (activeTab) {
        case "employee-hours":
          response = await getEmployeeHoursReport(params);
          break;
        case "project-hours":
          response = await getProjectHoursReport(params);
          break;
        case "utilization":
          response = await getUtilizationReport(params);
          break;
        case "billing":
          response = await getBillingSummary(params);
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

  const filteredProjects = React.useMemo(() => {
    if (!filters.clientId) return projects;
    return projects.filter(
      (p) => Number(p.clientId) === Number(filters.clientId) && p.status === "ACTIVE"
    );
  }, [filters.clientId, projects]);

  const handleReportTypeChange = (e) => {
    const value = e.target.value;
    setReportType(value);
    if (value === "self") {
      setFilters((prev) => ({ ...prev, userId: String(user.id) }));
    } else {
      setFilters((prev) => ({ ...prev, userId: "" }));
    }
    setMessage({ text: "", type: "" });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "clientId" ? { projectId: "" } : {}),
    }));
    setMessage({ text: "", type: "" });
  };

  const handleEmployeeFilterChange = (e) => {
    setEmployeeFilter(e.target.value);
    setMessage({ text: "", type: "" });
  };

  const handleManagerFilterChange = (e) => {
    setManagerFilter(e.target.value);
    setMessage({ text: "", type: "" });
  };

  const getAdminParams = () => {
    if (user?.role !== "ADMIN") return {};
    const params = {};
    if (employeeFilter) {
      params.userId = employeeFilter;
    } else if (managerFilter) {
      params.managedBy = managerFilter;
    }
    return params;
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
        ...getAdminParams(),
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
           <h1 className="text-[32px] font-bold text-[#1E293B] leading-tight flex items-center gap-2">
             <BarChart3 className="w-6 h-6 text-[#B33A2F]" />
             Reports
           </h1>
           <p className="text-[#64748B]">View and export time tracking reports</p>
         </div>
        <div className="flex items-center gap-1">
          {user?.role === "MANAGER" && (
            <CustomSelect
              value={reportType}
              onChange={handleReportTypeChange}
              name="reportType"
              options={[
                { value: "team", label: "Team Reports" },
                { value: "self", label: "Self Reports" },
              ]}
              className="w-48"
              buttonClassName="bg-[#B33A2F] text-white hover:bg-[#992E25] border-[#B33A2F]"
            />
          )}
          <Button onClick={exportCSV} disabled={!data.length} className="hover:scale-105 active:scale-95">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

{message.text && (
         <div className={`p-3 rounded-lg text-sm ${
           message.type === "success" ? "bg-green-100 text-green-700 border border-green-200" :
           message.type === "error" ? "bg-red-100 text-red-700 border border-red-200" :
           "bg-blue-100 text-blue-700 border border-blue-200"
         }`}>
           {message.text}
         </div>
       )}

      <Card className="overflow-visible">
        <CardContent className="pt-6 overflow-visible">
          <div className="flex gap-4 mb-4 flex-wrap">
            <Input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} />
            <Input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} />
            <CustomSelect
                name="clientId"
                value={filters.clientId}
                onChange={handleFilterChange}
                placeholder="All Clients"
                options={clients
                  .filter((c) => c.status === "ACTIVE")
                  .map((c) => ({ value: String(c.id), label: c.name }))
                }
                className="min-w-[160px]"
              />
            <CustomSelect
               name="projectId"
               value={filters.projectId}
               onChange={handleFilterChange}
               disabled={!filters.clientId}
               placeholder={
                 !filters.clientId
                   ? "Select a client first"
                   : filteredProjects.length === 0
                   ? "No projects available"
                   : "All Projects"
               }
               options={filteredProjects.map((p) => ({ value: String(p.id), label: p.name }))}
               className="min-w-[160px]"
             />
            {user?.role === "ADMIN" && (
              <>
                <CustomSelect
                  value={employeeFilter}
                  onChange={handleEmployeeFilterChange}
                  placeholder="All Employees"
                  options={allEmployeesForAdmin.map((e) => ({ value: String(e.id), label: e.name }))}
                  className="min-w-[160px]"
                />
                <CustomSelect
                  value={managerFilter}
                  onChange={handleManagerFilterChange}
                  placeholder="All Managers"
                  options={allManagers.map((m) => ({ value: String(m.id), label: m.name }))}
                  className="min-w-[160px]"
                />
              </>
            )}
            {user?.role === "MANAGER" && reportType === "team" && (
              <CustomSelect
                name="userId"
                value={filters.userId}
                onChange={handleFilterChange}
                placeholder="All Employees"
                options={employees.map((e) => ({ value: String(e.id), label: e.name }))}
                className="min-w-[160px]"
              />
            )}
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
             <div className="text-center py-8 text-[#64748B]">Loading...</div>
           ) : data.length === 0 ? (
             <div className="text-center py-8 text-[#64748B]">No data found. Adjust filters and generate report.</div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                   <tr>
                     {activeTab === "employee-hours" && (
                       <>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Employee</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Project</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Task</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Hours</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Status</th>
                       </>
                     )}
                     {activeTab === "project-hours" && (
                       <>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Project</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Client</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Employee</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Date</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Hours</th>
                       </>
                     )}
                     {activeTab === "utilization" && (
                       <>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Employee</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Department</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Total Hours</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Working</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Extra</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Utilization %</th>
                       </>
                     )}
                     {activeTab === "billing" && (
                       <>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Client</th>
                         <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Project</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">Total Working Hours</th>
                       </>
                     )}
                   </tr>
                 </thead>
                 <tbody>
                   {activeTab === "employee-hours" && data.map((entry, i) => (
                     <tr key={i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                       <td className="px-4 py-3 text-[#1E293B]">{entry.User?.name || "-"}</td>
                       <td className="px-4 py-3 text-[#1E293B]">{entry.projectName || entry.Project?.name || "-"}</td>
                       <td className="px-4 py-3 text-[#1E293B]">{entry.taskTitle || entry.Task?.title || "-"}</td>
                       <td className="px-4 py-3 text-[#64748B]">{entry.entryDate}</td>
                        <td className="px-4 py-3 text-[#1E293B] font-medium">{entry.hours}h</td>
                        <td className="px-4 py-3">
                         <Badge variant={entry.status === "APPROVED" ? "success" : entry.status === "SUBMITTED" ? "warning" : "default"}>
                           {entry.status}
                         </Badge>
                       </td>
                     </tr>
                   ))}
                   {activeTab === "project-hours" && data.map((entry, i) => (
                     <tr key={i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                       <td className="px-4 py-3 text-[#1E293B]">{entry.projectName || entry.Project?.name || "-"}</td>
                       <td className="px-4 py-3 text-[#1E293B]">{entry.clientName || entry.Client?.name || "-"}</td>
                       <td className="px-4 py-3 text-[#1E293B]">{entry.User?.name || "-"}</td>
                       <td className="px-4 py-3 text-[#64748B]">{entry.entryDate}</td>
                       <td className="px-4 py-3 text-[#1E293B] font-medium">{entry.hours}h</td>
                     </tr>
                   ))}
                   {activeTab === "utilization" && data.map((u, i) => (
                     <tr key={i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                       <td className="px-4 py-3 text-[#1E293B]">{u.name || "-"}</td>
                       <td className="px-4 py-3 text-[#64748B]">{u.department || "-"}</td>
                       <td className="px-4 py-3 text-[#1E293B]">{(u.totalHours ?? 0)}h</td>
                       <td className="px-4 py-3 text-[#1E293B]">{(u.billableHours ?? 0)}h</td>
                       <td className="px-4 py-3 text-[#1E293B]">{(u.nonBillableHours ?? 0)}h</td>
                       <td className="px-4 py-3">
                         <Badge variant={u.utilizationPercent >= 70 ? "success" : u.utilizationPercent >= 50 ? "warning" : "danger"}>
                           {(u.utilizationPercent ?? 0)}%
                         </Badge>
                       </td>
                     </tr>
                   ))}
                   {activeTab === "billing" && data.map((b, i) => (
                     <tr key={i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                       <td className="px-4 py-3 text-[#1E293B]">{b.clientName}</td>
                       <td className="px-4 py-3 text-[#1E293B]">{b.projectName}</td>
                       <td className="px-4 py-3 text-[#1E293B] font-medium">{b.totalHours}h</td>
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
