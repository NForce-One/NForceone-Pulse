import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  fetchAllUsers,
  fetchTeamTimesheets,
  approveTimesheet,
  rejectTimesheet,
  fetchTimesheetById,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { clearPageCache } from "../hooks/useCachedData";
import { formatHoursToHHMM } from "../utils/timeFormat";

import {
  Card,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";

import { X, Loader, Eye, Check } from "lucide-react";

const DATE_FILTERS = [
  { value: "ALL", label: "All Dates" },
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "NEXT_MONTH", label: "Next Month" },
  { value: "THIS_YEAR", label: "This Year" },
  { value: "CUSTOM_MONTH", label: "Custom Month" },
  { value: "CUSTOM_RANGE", label: "Custom Range" },
];

const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getWeekStart = (date) => {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
};

const computeDateRange = (filter, customMonth, customFrom, customTo) => {
  const now = new Date();
  const todayStr = toLocalDateStr(now);

  switch (filter) {
    case "TODAY":
      return { dateFrom: todayStr, dateTo: todayStr };

    case "THIS_WEEK": {
      const mon = getWeekStart(now);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        dateFrom: toLocalDateStr(mon),
        dateTo: toLocalDateStr(sun),
      };
    }

    case "LAST_WEEK": {
      const mon = getWeekStart(now);
      mon.setDate(mon.getDate() - 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        dateFrom: toLocalDateStr(mon),
        dateTo: toLocalDateStr(sun),
      };
    }

    case "THIS_MONTH": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        dateFrom: toLocalDateStr(first),
        dateTo: toLocalDateStr(last),
      };
    }

    case "LAST_MONTH": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        dateFrom: toLocalDateStr(first),
        dateTo: toLocalDateStr(last),
      };
    }

    case "NEXT_MONTH": {
      const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return {
        dateFrom: toLocalDateStr(first),
        dateTo: toLocalDateStr(last),
      };
    }

    case "THIS_YEAR":
      return {
        dateFrom: `${now.getFullYear()}-01-01`,
        dateTo: `${now.getFullYear()}-12-31`,
      };

    case "CUSTOM_MONTH": {
      if (!customMonth) return {};
      const [year, month] = customMonth.split("-");
      const first = new Date(Number(year), Number(month) - 1, 1);
      const last = new Date(Number(year), Number(month), 0);
      return {
        dateFrom: toLocalDateStr(first),
        dateTo: toLocalDateStr(last),
      };
    }

    case "CUSTOM_RANGE":
      return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };

    default:
      return {};
  }
};

export const TeamTimesheets = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [allUsers, setAllUsers] = useState(() => {
    try {
      const cached = sessionStorage.getItem("c_team_users");
      return cached ? JSON.parse(cached).data : [];
    } catch { return []; }
  });
  const [timesheets, setTimesheets] = useState(() => {
    try {
      const cached = sessionStorage.getItem("c_team_timesheets");
      return cached ? JSON.parse(cached).data : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem("c_team_timesheets"));
  const [usersLoading, setUsersLoading] = useState(true);
  const hasCachedRef = useRef(!!(() => { try { return sessionStorage.getItem("c_team_timesheets"); } catch { return null; } })());

  // ================= FILTER STATE =================
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("ALL");
  const [selectedReportingManagerId, setSelectedReportingManagerId] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [customMonth, setCustomMonth] = useState("");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ================= REFRESH TRIGGER (for post-approve/reject reload) =================
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ================= MODAL STATE =================
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectTimesheetId, setRejectTimesheetId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);

  // ================= DERIVED LISTS =================
  const employeeOptions = useMemo(() => {
    if (!isAdmin) return [];
    return allUsers.filter((u) => u.role === "EMPLOYEE" || u.role === "MANAGER");
  }, [allUsers, isAdmin]);

  const managerOptions = useMemo(() => {
    if (!isAdmin) return [];
    return allUsers.filter((u) => u.role === "MANAGER" || u.role === "ADMIN");
  }, [allUsers, isAdmin]);

  // ================= LOAD USERS =================
  useEffect(() => {
    if (!isAdmin) {
      setUsersLoading(false);
      return;
    }
    let isMounted = true;
    const load = async () => {
      try {
        setUsersLoading(true);
        const users = await fetchAllUsers();
        if (!isMounted) return;
        setAllUsers(Array.isArray(users) ? users : []);
        sessionStorage.setItem("c_team_users", JSON.stringify({ data: Array.isArray(users) ? users : [], timestamp: Date.now() }));
      } catch (err) {
        console.error("Failed to load users:", err?.response?.data || err?.message || err);
        if (isMounted) setAllUsers([]);
      } finally {
        if (isMounted) setUsersLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [isAdmin]);

  // ================= LOAD TIMESHEETS (direct effect, no useCallback indirection) =================
  useEffect(() => {
    if (usersLoading) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        if (!hasCachedRef.current) setIsLoading(true);
        hasCachedRef.current = false;
        const filters = {};

        if (statusFilter !== "ALL") filters.status = statusFilter;
        if (selectedEmployeeId !== "ALL") filters.employeeId = selectedEmployeeId;
        if (selectedReportingManagerId) filters.managerId = selectedReportingManagerId;

        const range = computeDateRange(dateFilter, customMonth, customDateFrom, customDateTo);
        if (range.dateFrom) filters.dateFrom = range.dateFrom;
        if (range.dateTo) filters.dateTo = range.dateTo;

        console.log("[TeamTimesheets] Fetching with filters:", JSON.stringify(filters));
        const result = await fetchTeamTimesheets(filters);
        console.log("[TeamTimesheets] API response:", result);

        if (cancelled) return;
        const data = result?.data || result || [];
        const arr = Array.isArray(data) ? data : [];
        setTimesheets(arr);
        sessionStorage.setItem("c_team_timesheets", JSON.stringify({ data: arr, timestamp: Date.now() }));
        console.log("[TeamTimesheets] Timesheets set:", arr.length);
      } catch (err) {
        console.error("[TeamTimesheets] Fetch error:", err?.response?.data || err?.message || err);
        if (!cancelled) setTimesheets([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [
    usersLoading,
    statusFilter,
    selectedEmployeeId,
    selectedReportingManagerId,
    dateFilter,
    customMonth,
    customDateFrom,
    customDateTo,
    refreshTrigger,
  ]);

  // ================= SHOW/HIDE DATE SUPPORTS =================
  const showCustomMonthPicker = dateFilter === "CUSTOM_MONTH";
  const showCustomRangePickers = dateFilter === "CUSTOM_RANGE";
  const activeDateLabel = DATE_FILTERS.find((f) => f.value === dateFilter)?.label || "All Dates";

  // ================= ACTIONS =================
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
      clearPageCache("team_timesheets");
      setRefreshTrigger((prev) => prev + 1);
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
      clearPageCache("team_timesheets");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to reject timesheet");
    }
  };

  const getStatusBadge = (status) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
    switch (status) {
      case "APPROVED":
        return `${base} bg-emerald-100 text-emerald-700 border border-emerald-200`;
      case "REJECTED":
        return `${base} bg-red-100 text-red-700 border border-red-200`;
      case "SUBMITTED":
        return `${base} bg-blue-100 text-blue-700 border border-blue-200`;
      case "RESUBMITTED":
        return `${base} bg-amber-100 text-amber-700 border border-amber-200`;
      default:
        return `${base} bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]`;
    }
  };

  const handleEmployeeChange = (e) => {
    setSelectedEmployeeId(e.target.value);
  };

  const handleReportingManagerChange = (e) => {
    setSelectedReportingManagerId(e.target.value);
  };

  const handleDateFilterChange = (e) => {
    setDateFilter(e.target.value);
  };

  const handleResetFilters = () => {
    setSelectedEmployeeId("ALL");
    setSelectedReportingManagerId("");
    setDateFilter("ALL");
    setCustomMonth("");
    setCustomDateFrom("");
    setCustomDateTo("");
    setStatusFilter("ALL");
  };

  const hasActiveFilters =
    selectedEmployeeId !== "ALL" ||
    selectedReportingManagerId !== "" ||
    dateFilter !== "ALL" ||
    statusFilter !== "ALL";

  // ================= RENDER =================
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[32px] font-bold text-[#1E293B] leading-tight">Team Timesheets</h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">

              {/* EMPLOYEE DROPDOWN */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#64748B] whitespace-nowrap">Employee:</label>
                <select
                  value={selectedEmployeeId}
                  onChange={handleEmployeeChange}
                  className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] min-w-[160px]"
                >
                  <option value="ALL" className="bg-white">All Employees</option>
                  {employeeOptions.length === 0 && !usersLoading && (
                    <option value="__none" disabled className="bg-white text-[#94A3B8]">No employees found</option>
                  )}
                  {employeeOptions.map((u) => (
                    <option key={u.id} value={u.id} className="bg-white">
                      {u.name} {u.role === "MANAGER" ? "(Manager)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* REPORTING MANAGER DROPDOWN */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#64748B] whitespace-nowrap">Reporting Manager:</label>
                <select
                  value={selectedReportingManagerId}
                  onChange={handleReportingManagerChange}
                  className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] min-w-[160px]"
                >
                  <option value="" className="bg-white">All Managers</option>
                  {managerOptions.length === 0 && !usersLoading && (
                    <option value="__none" disabled className="bg-white text-[#94A3B8]">No managers found</option>
                  )}
                  {managerOptions.map((u) => (
                    <option key={u.id} value={u.id} className="bg-white">{u.name}</option>
                  ))}
                </select>
              </div>

              {/* DYNAMIC DATE FILTER */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#64748B] whitespace-nowrap">Filter:</label>
                <select
                  value={dateFilter}
                  onChange={handleDateFilterChange}
                  className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] min-w-[140px]"
                >
                  {DATE_FILTERS.map((f) => (
                    <option key={f.value} value={f.value} className="bg-white">{f.label}</option>
                  ))}
                </select>
              </div>

              {/* CUSTOM MONTH PICKER */}
              {showCustomMonthPicker && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#64748B] whitespace-nowrap">Month:</label>
                  <input
                    type="month"
                    value={customMonth}
                    onChange={(e) => setCustomMonth(e.target.value)}
                    className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F]"
                  />
                </div>
              )}

              {/* CUSTOM RANGE PICKERS */}
              {showCustomRangePickers && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[#64748B] whitespace-nowrap">From:</label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[#64748B] whitespace-nowrap">To:</label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F]"
                    />
                  </div>
                </>
              )}

              {/* STATUS FILTER */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#64748B] whitespace-nowrap">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F]"
                >
                  <option value="ALL" className="bg-white">All Status</option>
                  <option value="SUBMITTED" className="bg-white">Submitted</option>
                  <option value="RESUBMITTED" className="bg-white">Re-Submitted</option>
                  <option value="APPROVED" className="bg-white">Approved</option>
                  <option value="REJECTED" className="bg-white">Rejected</option>
                </select>
              </div>

              {/* ACTIVE DATE RANGE INDICATOR */}
              {dateFilter !== "ALL" && (() => {
                const dr = computeDateRange(dateFilter, customMonth, customDateFrom, customDateTo);
                if (!dr.dateFrom) return null;
                return (
                  <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-md whitespace-nowrap">
                    {activeDateLabel}: {dr.dateFrom} {dr.dateTo !== dr.dateFrom ? `→ ${dr.dateTo}` : ""}
                  </span>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* ================= TIMESHEETS TABLE ================= */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center gap-2 text-[#64748B]">
                <Loader className="w-5 h-5 animate-spin" />
                Loading team timesheets...
              </div>
            </div>
          ) : timesheets.length === 0 ? (
            <CardContent className="py-8 text-center text-[#64748B]">
              No team timesheets found for the selected criteria.
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Employee</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Week Start</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Week End</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Total Hours</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Billable</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Non-Billable</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Missing</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[#64748B] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((ts) => (
                    <tr key={ts.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                      <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">
                        {ts.first_name} {ts.last_name}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{ts.week_start_date}</td>
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{ts.week_end_date}</td>
                      <td className="px-4 py-3 text-[#1E293B] font-medium whitespace-nowrap">
                        {formatHoursToHHMM(ts.total_minutes / 60)}
                      </td>
                      <td className="px-4 py-3 text-emerald-600 whitespace-nowrap">
                        {formatHoursToHHMM(ts.total_billable_minutes / 60)}
                      </td>
                      <td className="px-4 py-3 text-amber-600 whitespace-nowrap">
                        {formatHoursToHHMM(ts.total_non_billable_minutes / 60)}
                      </td>
                      <td className="px-4 py-3 text-red-600 whitespace-nowrap">
                        {ts.missing_hours > 0 ? formatHoursToHHMM(ts.missing_hours) : "-"}
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
                            className="p-1.5 rounded-md text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(ts.submission_status === "SUBMITTED" || ts.submission_status === "RESUBMITTED") && (
                            <>
                              <button
                                onClick={() => handleApprove(ts.id)}
                                className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectClick(ts.id)}
                                className="p-1.5 rounded-md text-red-600 hover:text-red-700 hover:bg-red-100 transition-colors"
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

      {/* ================= VIEW DETAILS MODAL ================= */}
      {showDetails && selectedTimesheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h3 className="text-lg font-semibold text-[#1E293B]">
                Timesheet Details - {selectedTimesheet.first_name} {selectedTimesheet.last_name}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1.5 rounded-md text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader className="w-5 h-5 animate-spin text-[#64748B]" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#64748B] uppercase tracking-wider">Employee</label>
                      <p className="text-[#1E293B] font-medium">{details.User?.name || `${selectedTimesheet.first_name} ${selectedTimesheet.last_name}`}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#64748B] uppercase tracking-wider">Status</label>
                      <p><span className={getStatusBadge(details.status || selectedTimesheet.submission_status)}>{details.status || selectedTimesheet.submission_status}</span></p>
                    </div>
                    <div>
                      <label className="text-xs text-[#64748B] uppercase tracking-wider">Week Start</label>
                      <p className="text-[#1E293B]">{details.weekStartDate || selectedTimesheet.week_start_date}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#64748B] uppercase tracking-wider">Week End</label>
                      <p className="text-[#1E293B]">{details.weekEndDate || selectedTimesheet.week_end_date}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#64748B] uppercase tracking-wider">Total Hours</label>
                      <p className="text-[#1E293B] font-mono">{formatHoursToHHMM(details.totalHours || selectedTimesheet.total_minutes / 60 || 0)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#64748B] uppercase tracking-wider">Billable Hours</label>
                      <p className="text-emerald-600 font-mono">{formatHoursToHHMM(details.billableHours || selectedTimesheet.total_billable_minutes / 60 || 0)}</p>
                    </div>
                  </div>

                  {details.TimeEntries && details.TimeEntries.length > 0 && (
                    <div>
                      <label className="text-xs text-[#64748B] uppercase tracking-wider mb-2 block">Time Entries</label>
                      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
                        <table className="w-full text-sm">
                          <thead className="bg-[#F8FAFC]">
                            <tr>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-[#64748B]">Date</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-[#64748B]">Project</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-[#64748B]">Task</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-[#64748B]">Hours</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-[#64748B]">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details.TimeEntries.map((entry) => (
                              <tr key={entry.id} className="border-t border-[#E2E8F0]">
                                <td className="px-3 py-2 text-[#1E293B]">{entry.entryDate}</td>
                                <td className="px-3 py-2 text-[#64748B]">{entry.project || "-"}</td>
                                <td className="px-3 py-2 text-[#64748B]">{entry.task || "-"}</td>
                                <td className="px-3 py-2 text-[#1E293B] font-mono">{formatHoursToHHMM(entry.hours || 0)}</td>
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
                      <label className="text-xs text-[#64748B] uppercase tracking-wider">Comment</label>
                      <p className="text-[#1E293B] bg-[#F8FAFC] rounded-lg p-3 mt-1">{details.comment}</p>
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
          <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-semibold text-[#1E293B]">Reject Timesheet</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1.5 rounded-md text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#64748B]">Please provide a reason for rejecting this timesheet.</p>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] resize-none"
              />
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
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
