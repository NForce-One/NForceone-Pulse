import React, { useState, useEffect, useCallback } from "react";
import {
  fetchAllUsers,
  fetchFilteredTimeEntries,
  fetchTeamTimesheets,
  approveTimesheet,
  rejectTimesheet,
  fetchTimesheetById,
  fetchTeamMembers,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

import {
  Card,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";

import { X, Loader, Eye, Check } from "lucide-react";

export const TeamTimesheets = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // ================= MANAGER FILTER (for admin) =================
  const [selectedManagerId, setSelectedManagerId] = useState("");

  // ================= ADMIN TIME ENTRIES SECTION =================
  const [allEmployeeList, setAllEmployeeList] = useState([]);
  const [allManagerList, setAllManagerList] = useState([]);
  const [entryEmployeeId, setEntryEmployeeId] = useState("");
  const [entryManagerId, setEntryManagerId] = useState("");
  const [entryManagerTeamId, setEntryManagerTeamId] = useState("");
  const [timeEntries, setTimeEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState("");

  // ================= TEAM TIMESHEETS SECTION =================
  const [timesheets, setTimesheets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectTimesheetId, setRejectTimesheetId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);

  // Load all users/managers for admin
  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    const loadUserLists = async () => {
      try {
        const users = await fetchAllUsers();
        if (!isMounted) return;
        const userArr = Array.isArray(users) ? users : [];
        setAllEmployeeList(userArr.filter((u) => u.role === "EMPLOYEE" || u.role === "MANAGER"));
        setAllManagerList(userArr.filter((u) => u.role === "MANAGER" || u.role === "ADMIN"));
      } catch {
        if (isMounted) {
          setAllEmployeeList([]);
          setAllManagerList([]);
        }
      }
    };
    loadUserLists();
    return () => { isMounted = false; };
  }, [isAdmin]);

  // Load time entries for admin section
  const loadTimeEntries = useCallback(async (filterType, filterValue) => {
    if (!filterValue) {
      setTimeEntries([]);
      setActiveFilterType("");
      return;
    }
    setEntriesLoading(true);
    setActiveFilterType(filterType);
    try {
      const filters = {};
      if (filterType === "employee") filters.employeeId = filterValue;
      else if (filterType === "manager") filters.managerId = filterValue;
      else if (filterType === "managerTeam") filters.managerTeamId = filterValue;
      const result = await fetchFilteredTimeEntries(filters);
      const entries = Array.isArray(result) ? result : [];
      setTimeEntries(entries);
    } catch {
      setTimeEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  // Load employees for filter dropdown (for admin: based on selected manager; for manager: own team)
  useEffect(() => {
    let isMounted = true;
    const loadEmployees = async () => {
      try {
        setEmployeesLoading(true);
        if (isAdmin && !selectedManagerId) {
          const users = await fetchAllUsers();
          if (!isMounted) return;
          const userArr = Array.isArray(users) ? users : [];
          setEmployees(userArr.filter((u) => u.role === "EMPLOYEE" || u.role === "MANAGER"));
        } else {
          const managerId = isAdmin ? selectedManagerId : null;
          const result = await fetchTeamMembers(managerId || undefined);
          if (!isMounted) return;
          const users = result?.data || result || [];
          setEmployees(Array.isArray(users) ? users : []);
        }
        if (!isAdmin) setEmployeeFilter("ALL");
      } catch {
        if (isMounted) setEmployees([]);
      } finally {
        if (isMounted) setEmployeesLoading(false);
      }
    };
    loadEmployees();
    return () => { isMounted = false; };
  }, [isAdmin, selectedManagerId]);

  // Load team timesheets
  const loadTeamTimesheets = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (employeeFilter !== "ALL") filters.employeeId = employeeFilter;
      if (isAdmin && selectedManagerId) {
        filters.managerId = selectedManagerId;
      }
      const result = await fetchTeamTimesheets(filters);
      const data = result?.data || result || [];
      setTimesheets(Array.isArray(data) ? data : []);
    } catch {
      setTimesheets([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, employeeFilter, isAdmin, selectedManagerId]);

  useEffect(() => {
    if (employeesLoading) return;
    loadTeamTimesheets();
  }, [employeesLoading, loadTeamTimesheets]);

  const handleViewDetails = async (timesheet) => {
    setSelectedTimesheet(timesheet);
    setShowDetails(true);
    setDetailsLoading(true);
    try {
      const result = await fetchTimesheetById(timesheet.id);
      setDetails(result?.data || result || timesheet);
    } catch {
      setDetails(timesheet);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this timesheet?")) return;
    try {
      await approveTimesheet(id, "Approved by manager");
      await loadTeamTimesheets();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to approve timesheet");
    }
  };

  const handleRejectClick = (id) => {
    setRejectTimesheetId(id);
    setRejectComment("");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectComment.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    try {
      await rejectTimesheet(rejectTimesheetId, rejectComment);
      setShowRejectModal(false);
      setRejectTimesheetId(null);
      setRejectComment("");
      await loadTeamTimesheets();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to reject timesheet");
    }
  };

  const getStatusBadge = (status) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
    switch (status) {
      case "APPROVED":
        return `${base} bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`;
      case "REJECTED":
        return `${base} bg-red-500/20 text-red-300 border border-red-500/30`;
      case "SUBMITTED":
        return `${base} bg-blue-500/20 text-blue-300 border border-blue-500/30`;
      default:
        return `${base} bg-[#2a2a2a] text-[#a1a1aa] border border-[#3a3a3a]`;
    }
  };

  return (
    <div className="space-y-6">

      {/* ================= TEAM TIMESHEETS SECTION (shown to both admin and manager) ================= */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Team Timesheets</h2>

        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#a1a1aa] whitespace-nowrap">Team Manager:</label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => {
                      setSelectedManagerId(e.target.value);
                      setEmployeeFilter("ALL");
                    }}
                    className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d]"
                  >
                    <option value="" className="bg-[#1a1a1a]">My Team</option>
                    {allManagerList.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#1a1a1a]">{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#a1a1aa] whitespace-nowrap">Employee:</label>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d]"
                >
                  <option value="ALL" className="bg-[#1a1a1a]">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-[#1a1a1a]">{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-[#a1a1aa] whitespace-nowrap">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d]"
                >
                  <option value="ALL" className="bg-[#1a1a1a]">All Status</option>
                  <option value="DRAFT" className="bg-[#1a1a1a]">Draft</option>
                  <option value="SUBMITTED" className="bg-[#1a1a1a]">Submitted</option>
                  <option value="APPROVED" className="bg-[#1a1a1a]">Approved</option>
                  <option value="REJECTED" className="bg-[#1a1a1a]">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-[#a1a1aa] whitespace-nowrap">From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d]"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-[#a1a1aa] whitespace-nowrap">To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center gap-2 text-[#a1a1aa]">
                <Loader className="w-5 h-5 animate-spin" />
                Loading team timesheets...
              </div>
            </div>
          ) : timesheets.length === 0 ? (
            <CardContent className="py-8 text-center text-[#a1a1aa]">
              No team timesheets found. Ensure employees are assigned to you as their manager and have created timesheets.
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Employee</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Week Start</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Week End</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Total Hours</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Billable</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Non-Billable</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Missing</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right text-[#a1a1aa] font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((ts) => (
                    <tr key={ts.id} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150">
                      <td className="px-4 py-3 text-white whitespace-nowrap">
                        {ts.first_name} {ts.last_name}
                      </td>
                      <td className="px-4 py-3 text-[#a1a1aa] whitespace-nowrap">{ts.week_start_date}</td>
                      <td className="px-4 py-3 text-[#a1a1aa] whitespace-nowrap">{ts.week_end_date}</td>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {(ts.total_minutes / 60).toFixed(2)}h
                      </td>
                      <td className="px-4 py-3 text-emerald-400 whitespace-nowrap">
                        {(ts.total_billable_minutes / 60).toFixed(2)}h
                      </td>
                      <td className="px-4 py-3 text-amber-400 whitespace-nowrap">
                        {(ts.total_non_billable_minutes / 60).toFixed(2)}h
                      </td>
                      <td className="px-4 py-3 text-red-400 whitespace-nowrap">
                        {ts.missing_hours > 0 ? `${ts.missing_hours}h` : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={getStatusBadge(ts.submission_status)}>
                          {ts.submission_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(ts)}
                            className="p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-[#2a2a2a] transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {ts.submission_status === "SUBMITTED" && (
                            <>
                              <button
                                onClick={() => handleApprove(ts.id)}
                                className="p-1.5 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectClick(ts.id)}
                                className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ================= ADMIN TIME ENTRIES SECTION ================= */}
      {isAdmin && (
        <div className="space-y-4 pt-6 border-t border-[#2a2a2a]">
          <h2 className="text-xl font-bold text-white">Time Entry Details</h2>

          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#a1a1aa] whitespace-nowrap">Employee:</label>
                  <select
                    value={entryEmployeeId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEntryEmployeeId(val);
                      setEntryManagerId("");
                      setEntryManagerTeamId("");
                      loadTimeEntries("employee", val);
                    }}
                    className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d]"
                  >
                    <option value="" className="bg-[#1a1a1a]">Select Employee</option>
                    {allEmployeeList.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#1a1a1a]">{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#a1a1aa] whitespace-nowrap">Manager:</label>
                  <select
                    value={entryManagerId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEntryManagerId(val);
                      setEntryEmployeeId("");
                      setEntryManagerTeamId("");
                      loadTimeEntries("manager", val);
                    }}
                    className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d]"
                  >
                    <option value="" className="bg-[#1a1a1a]">Select Manager</option>
                    {allManagerList.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#1a1a1a]">{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#a1a1aa] whitespace-nowrap">Approved By Manager:</label>
                  <select
                    value={entryManagerTeamId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEntryManagerTeamId(val);
                      setEntryEmployeeId("");
                      setEntryManagerId("");
                      loadTimeEntries("managerTeam", val);
                    }}
                    className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d]"
                  >
                    <option value="" className="bg-[#1a1a1a]">Select Manager</option>
                    {allManagerList.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#1a1a1a]">{u.name}</option>
                    ))}
                  </select>
                </div>

                {activeFilterType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEntryEmployeeId("");
                      setEntryManagerId("");
                      setEntryManagerTeamId("");
                      setTimeEntries([]);
                      setActiveFilterType("");
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            {entriesLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="flex items-center gap-2 text-[#a1a1aa]">
                  <Loader className="w-5 h-5 animate-spin" />
                  Loading entries...
                </div>
              </div>
            ) : !activeFilterType ? (
              <CardContent className="py-8 text-center text-[#a1a1aa]">
                Select an employee or manager above to view time entries.
              </CardContent>
            ) : timeEntries.length === 0 ? (
              <CardContent className="py-8 text-center text-[#a1a1aa]">
                No time entries found for the selected criteria.
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Day</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Employee Name</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Work Type</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Holiday Name</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Client</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Project</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Task</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Description</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Hours Worked</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Reported To</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Manager Comment</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeEntries.map((entry, idx) => (
                      <tr key={entry.id || idx} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150">
                        <td className="px-4 py-3 text-white whitespace-nowrap">{entry.entryDate}</td>
                        <td className="px-4 py-3 text-[#a1a1aa] whitespace-nowrap">{entry.day}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{entry.userName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.extraWorkType === "HOLIDAY" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Holiday</span>
                          ) : entry.extraWorkType === "WEEKEND" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">Weekend</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Normal</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#a1a1aa] whitespace-nowrap">{entry.displayName || "-"}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{entry.clientWorked}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{entry.projectWorked}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{entry.taskWorked}</td>
                        <td className="px-4 py-3 text-[#a1a1aa] whitespace-nowrap max-w-[200px] truncate">{entry.description}</td>
                        <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{Number(entry.hoursWorked || 0).toFixed(2)}h</td>
                        <td className="px-4 py-3 text-[#a1a1aa] whitespace-nowrap">{entry.reportedTo}</td>
                        <td className="px-4 py-3 text-[#a1a1aa] whitespace-nowrap">{entry.managerComment}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            entry.approvalStatus === "APPROVED" ? "bg-emerald-500/20 text-emerald-300" :
                            entry.approvalStatus === "REJECTED" ? "bg-red-500/20 text-red-300" :
                            entry.approvalStatus === "SUBMITTED" ? "bg-blue-500/20 text-blue-300" :
                            "bg-[#2a2a2a] text-[#a1a1aa]"
                          }`}>{entry.approvalStatus}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {activeFilterType && timeEntries.length > 0 && (
            <div className="text-sm text-[#a1a1aa] text-right">
              Total: <span className="text-white font-semibold font-mono">{timeEntries.reduce((sum, e) => sum + Number(e.hoursWorked || 0), 0).toFixed(2)}h</span>
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW DETAILS MODAL ================= */}
      {showDetails && selectedTimesheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
              <h3 className="text-lg font-semibold text-white">
                Timesheet Details - {selectedTimesheet.first_name} {selectedTimesheet.last_name}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader className="w-5 h-5 animate-spin text-[#a1a1aa]" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Employee</label>
                      <p className="text-white font-medium">{details.User?.name || `${selectedTimesheet.first_name} ${selectedTimesheet.last_name}`}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Status</label>
                      <p><span className={getStatusBadge(details.status || selectedTimesheet.submission_status)}>{details.status || selectedTimesheet.submission_status}</span></p>
                    </div>
                    <div>
                      <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Week Start</label>
                      <p className="text-white">{details.weekStartDate || selectedTimesheet.week_start_date}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Week End</label>
                      <p className="text-white">{details.weekEndDate || selectedTimesheet.week_end_date}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Total Hours</label>
                      <p className="text-white font-mono">{(details.totalHours || selectedTimesheet.total_minutes / 60 || 0).toFixed(2)}h</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Billable Hours</label>
                      <p className="text-emerald-400 font-mono">{(details.billableHours || selectedTimesheet.total_billable_minutes / 60 || 0).toFixed(2)}h</p>
                    </div>
                  </div>

                  {details.TimeEntries && details.TimeEntries.length > 0 && (
                    <div>
                      <label className="text-xs text-[#a1a1aa] uppercase tracking-wider mb-2 block">Time Entries</label>
                      <div className="overflow-x-auto rounded-lg border border-[#2a2a2a]">
                        <table className="w-full text-sm">
                          <thead className="bg-[#0f0f0f]">
                            <tr>
                              <th className="px-3 py-2 text-left text-[#a1a1aa] font-medium">Date</th>
                              <th className="px-3 py-2 text-left text-[#a1a1aa] font-medium">Project</th>
                              <th className="px-3 py-2 text-left text-[#a1a1aa] font-medium">Task</th>
                              <th className="px-3 py-2 text-left text-[#a1a1aa] font-medium">Hours</th>
                              <th className="px-3 py-2 text-left text-[#a1a1aa] font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details.TimeEntries.map((entry) => (
                              <tr key={entry.id} className="border-t border-[#2a2a2a]">
                                <td className="px-3 py-2 text-white">{entry.entryDate}</td>
                                <td className="px-3 py-2 text-[#a1a1aa]">{entry.project || "-"}</td>
                                <td className="px-3 py-2 text-[#a1a1aa]">{entry.task || "-"}</td>
                                <td className="px-3 py-2 text-white font-mono">{entry.hours || 0}h</td>
                                <td className="px-3 py-2"><span className={getStatusBadge(entry.status)}>{entry.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {details.comment && (
                    <div>
                      <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Comment</label>
                      <p className="text-white bg-[#0f0f0f] rounded-lg p-3 mt-1">{details.comment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= REJECT MODAL ================= */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
              <h3 className="text-lg font-semibold text-white">Reject Timesheet</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#a1a1aa]">Please provide a reason for rejecting this timesheet.</p>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleRejectConfirm}
                  disabled={!rejectComment.trim()}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
