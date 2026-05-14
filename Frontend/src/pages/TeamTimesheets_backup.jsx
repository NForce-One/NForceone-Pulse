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
