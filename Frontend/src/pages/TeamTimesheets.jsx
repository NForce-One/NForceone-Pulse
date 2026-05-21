import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  fetchTeamTimesheets,
  approveTimesheet,
  rejectTimesheet,
  fetchTimesheetById,
  fetchTeamMembers,
} from "../services/api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";

import { Eye, Check, X, Filter } from "lucide-react";

export const TeamTimesheets = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);

  // filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectTimesheetId, setRejectTimesheetId] = useState(null);

  // Employees list for filter
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  // Load employees for dropdown
  useEffect(() => {
    let isMounted = true;

    const loadEmployees = async () => {
      try {
        setEmployeesLoading(true);
        const result = await fetchTeamMembers();
        if (!isMounted) return;

        const users = result?.data || result || [];
        setEmployees(Array.isArray(users) ? users : []);
      } catch (error) {
        console.error("Error loading employees:", error);
        if (isMounted) setEmployees([]);
      } finally {
        if (isMounted) setEmployeesLoading(false);
      }
    };

    loadEmployees();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load team timesheets
  const loadTeamTimesheets = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters = {};

      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (employeeFilter !== "ALL") filters.employeeId = employeeFilter;

      const result = await fetchTeamTimesheets(filters);
      const data = result?.data || result || [];
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading team timesheets:", error);
      setTimesheets([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, employeeFilter]);

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

      if (selectedTimesheet?.id === id) {
        setSelectedTimesheet({ ...selectedTimesheet, status: "APPROVED" });
      }
    } catch {
      alert("Failed to approve timesheet");
    }
  };

  const openRejectModal = (id) => {
    setRejectTimesheetId(id);
    setRejectComment("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      await rejectTimesheet(rejectTimesheetId, rejectComment);
      setShowRejectModal(false);
      setRejectComment("");
      setRejectTimesheetId(null);
      await loadTeamTimesheets();

      if (selectedTimesheet?.id === rejectTimesheetId) {
        setSelectedTimesheet({ ...selectedTimesheet, status: "REJECTED" });
      }
    } catch {
      alert("Failed to reject timesheet");
    }
  };

  const getStatusBadgeVariant = (status) => {
    return {
      DRAFT: "default",
      SUBMITTED: "warning",
      APPROVED: "success",
      REJECTED: "danger",
    }[status] || "default";
  };

  const formatWeekRange = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";
    return `${format(new Date(startDate), "MMM dd")} - ${format(new Date(endDate), "MMM dd, yyyy")}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#111827]">Team Timesheets</h1>

      {/* filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date From */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#6B7280]">From:</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-auto"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#6B7280]">To:</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-auto"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="ALL" className="bg-white">All Status</option>
              <option value="DRAFT" className="bg-white">Draft</option>
              <option value="SUBMITTED" className="bg-white">Submitted</option>
              <option value="APPROVED" className="bg-white">Approved</option>
              <option value="REJECTED" className="bg-white">Rejected</option>
            </select>

            {/* Employee Filter */}
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-10 rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="ALL" className="bg-white">All Employees</option>
              {employeesLoading ? (
                <option disabled className="bg-white">Loading...</option>
              ) : (
                employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-white">
                    {emp.name || `Employee ${emp.id}`}
                  </option>
                ))
              )}
            </select>

            {/* Apply filters Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadTeamTimesheets}
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MAIN TABLE */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="p-3 text-left text-[#6B7280] font-medium">Employee</th>
                <th className="p-3 text-left text-[#6B7280] font-medium">Week Range</th>
                <th className="p-3 text-left text-[#6B7280] font-medium">Total Hours</th>
                <th className="p-3 text-left text-[#6B7280] font-medium">Working Hours</th>
                <th className="p-3 text-left text-[#6B7280] font-medium">Missing Hours</th>
                <th className="p-3 text-left text-[#6B7280] font-medium">Status</th>
                <th className="p-3 text-left text-[#6B7280] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-[#6B7280]">
                    Loading...
                  </td>
                </tr>
              ) : timesheets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-[#6B7280]">
                    No timesheets found for your team.
                  </td>
                </tr>
              ) : (
                timesheets.map((ts) => (
                  <tr key={ts.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                    <td className="p-3 text-[#111827]">
                      {ts.User?.name || `${ts.first_name || ""} ${ts.last_name || ""}`.trim() || "-"}
                    </td>
                    <td className="p-3 text-[#6B7280]">
                      {formatWeekRange(ts.week_start_date || ts.weekStartDate, ts.week_end_date || ts.weekEndDate)}
                    </td>
                    <td className="p-3 text-[#111827] font-medium">
                      {((ts.total_minutes || (ts.totalHours || 0) * 60) / 60).toFixed(2)} h
                    </td>
                    <td className="p-3 text-[#111827]">
                      {((ts.total_billable_minutes || (ts.billableHours || 0) * 60) / 60).toFixed(2)} h
                    </td>
                    <td className="p-3 text-[#6B7280]">
                      {(ts.missing_hours || 0).toFixed(2)} h
                    </td>
                    <td className="p-3">
                      <Badge variant={getStatusBadgeVariant(ts.submission_status || ts.status)}>
                        {ts.submission_status || ts.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(ts)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {(ts.submission_status || ts.status) === "SUBMITTED" && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleApprove(ts.id)}
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openRejectModal(ts.id)}
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DETAILS MODAL */}
      {showDetails && selectedTimesheet && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111827]">
                Timesheet Details - {selectedTimesheet.User?.name || "Employee"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDetails(false);
                  setSelectedTimesheet(null);
                  setDetails(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {detailsLoading ? (
                <div className="text-center text-[#6B7280] py-8">Loading details...</div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-4">
                    <Badge variant={getStatusBadgeVariant(selectedTimesheet.submission_status || selectedTimesheet.status)}>
                      {selectedTimesheet.submission_status || selectedTimesheet.status}
                    </Badge>
                    <span className="text-[#6B7280]">
                      Week: {formatWeekRange(
                        selectedTimesheet.week_start_date || selectedTimesheet.weekStartDate,
                        selectedTimesheet.week_end_date || selectedTimesheet.weekEndDate
                      )}
                    </span>
                  </div>

                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="p-3 text-left text-[#6B7280]">Date</th>
                        <th className="p-3 text-left text-[#6B7280]">Client</th>
                        <th className="p-3 text-left text-[#6B7280]">Project</th>
                        <th className="p-3 text-left text-[#6B7280]">Task</th>
                        <th className="p-3 text-left text-[#6B7280]">Description</th>
                        <th className="p-3 text-left text-[#6B7280]">Hours</th>
                        <th className="p-3 text-left text-[#6B7280]">Working</th>
                        <th className="p-3 text-left text-[#6B7280]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details?.TimeEntries?.length > 0 ? (
                        details.TimeEntries.map((entry) => (
                          <tr key={entry.id} className="border-b border-[#E5E7EB]">
                            <td className="p-3 text-[#6B7280]">
                              {format(new Date(entry.entryDate), "MMM dd, yyyy")}
                            </td>
                            <td className="p-3 text-[#111827]">{entry.client || "-"}</td>
                            <td className="p-3 text-[#111827]">{entry.project}</td>
                            <td className="p-3 text-[#111827]">{entry.task}</td>
                            <td className="p-3 text-[#6B7280]">{entry.description || "-"}</td>
                            <td className="p-3 text-[#111827] font-medium">{entry.hours} h</td>
                            <td className="p-3 text-[#6B7280]">
                              {entry.isBillable ? "Yes" : "No"}
                            </td>
                            <td className="p-3">
                              <Badge variant={getStatusBadgeVariant(entry.status)}>
                                {entry.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="p-4 text-center text-[#6B7280]">
                            No entries found for this timesheet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-[#111827] mb-4">Reject Timesheet</h2>
            <p className="text-[#6B7280] mb-4">
              Please provide a reason for rejection:
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              className="w-full h-32 rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
              placeholder="Enter rejection reason..."
            />
            <div className="flex items-center gap-3 mt-4">
              <Button variant="danger" onClick={handleReject} className="flex-1">
                Reject
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComment("");
                  setRejectTimesheetId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
