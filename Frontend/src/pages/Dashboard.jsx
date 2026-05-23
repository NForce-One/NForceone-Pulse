import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getDashboardStats, getHourDetails, fetchAllUsers, fetchAllProjects, fetchAllClients } from "../services/api";
import { AdminListModal } from "../components/ui/AdminListModal";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { DrillDownModal } from "../components/ui/DrillDownModal";
import { Users, FolderOpen, Building, ChevronDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027];
const FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "customMonth", label: "Custom Month" },
  { value: "customRange", label: "Custom Range" },
];
const METRIC_OPTIONS = [
  { value: "total", label: "Total Working Hours" },
  { value: "working", label: "Working Hours" },
  { value: "weekend", label: "Extra Working Hours on Weekends" },
  { value: "holiday", label: "Extra Working Hours on Holidays" },
];

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const [filterPeriod, setFilterPeriod] = useState("thisMonth");
  const [customMonth, setCustomMonth] = useState(new Date().getMonth());
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dashboardView, setDashboardView] = useState("self");
  const [selectedMetric, setSelectedMetric] = useState("total");

  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    type: "",
    data: [],
    totals: { normalHours: 0, weekendHours: 0, holidayHours: 0, totalExtraHours: 0 },
    isLoading: false,
    date: "",
  });

  const [adminModal, setAdminModal] = useState({
    isOpen: false,
    title: "",
    columns: [],
    data: [],
    isLoading: false,
  });

  const getFilterDateRange = useCallback(() => {
    const now = new Date();
    let start, end;

    switch (filterPeriod) {
      case "today": {
        const today = toDateStr(now);
        return { startDate: today, endDate: today };
      }
      case "thisWeek": {
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "lastWeek": {
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "thisMonth": {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "lastMonth": {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "thisYear": {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "customMonth": {
        start = new Date(customYear, customMonth, 1);
        end = new Date(customYear, customMonth + 1, 0);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "customRange": {
        return { startDate: fromDate, endDate: toDate };
      }
      default:
        return { startDate: "", endDate: "" };
    }
  }, [filterPeriod, customMonth, customYear, fromDate, toDate]);

  const openHourDetails = async (title, type, date = "") => {
    const entries = stats?.dashboardEntries;
    console.log(`[DEBUG] openHourDetails invoked: title="${title}" type="${type}" date="${date}" entries=${Array.isArray(entries) ? entries.length : typeof entries} statsKeys=${Object.keys(stats).join(',')}`);
    if (Array.isArray(entries) && entries.length > 0 && !date) {
      let filteredEntries = [];
      if (type === "total") {
        filteredEntries = entries;
      } else if (type === "working") {
        filteredEntries = entries.filter(e => e.type === "working");
      } else if (type === "weekend") {
        filteredEntries = entries.filter(e => e.type === "weekend");
      } else if (type === "holiday") {
        filteredEntries = entries.filter(e => e.type === "holiday");
      } else if (type === "draft") {
        filteredEntries = entries.filter(e => e.approvalStatus === "DRAFT");
      }
      const totalHours = filteredEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      const nHours = filteredEntries.filter(e => e.type === "working").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      const wHours = filteredEntries.filter(e => e.type === "weekend").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      const hHours = filteredEntries.filter(e => e.type === "holiday").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      console.log(`[DEBUG Dashboard] Modal "${title}" (${type}): ${filteredEntries.length} entries, ${totalHours.toFixed(2)}h from dashboardEntries`);
      setModalState({
        isOpen: true, title, type,
        data: filteredEntries,
        totals: { normalHours: nHours, weekendHours: wHours, holidayHours: hHours, totalExtraHours: wHours + hHours },
        isLoading: false, date,
      });
      return;
    }
    setModalState({ isOpen: true, title, type, data: [], totals: { normalHours: 0, weekendHours: 0, holidayHours: 0, totalExtraHours: 0 }, isLoading: true, date });
    try {
      let startDate, endDate;
      if (date) {
        startDate = date;
        endDate = date;
      } else {
        const range = getFilterDateRange();
        startDate = range.startDate;
        endDate = range.endDate;
      }
      const params = { type, startDate, endDate };
      if (user?.role === "MANAGER" && dashboardView === "self") {
        params.self = true;
      }
      if (!startDate || !endDate) {
        setModalState((prev) => ({ ...prev, data: [], isLoading: false }));
        return;
      }
      const response = await getHourDetails(params);
      if (!response || typeof response !== "object") {
        setModalState((prev) => ({ ...prev, data: [], isLoading: false }));
        return;
      }
      const respEntries = response?.entries ?? (Array.isArray(response) ? response : []);
      console.log(`[DEBUG Dashboard] Fetched ${respEntries.length} entries from API for "${title}" (${type})`);
      const totals = {
        normalHours: response?.normalHours ?? 0,
        weekendHours: response?.weekendHours ?? 0,
        holidayHours: response?.holidayHours ?? 0,
        totalExtraHours: response?.totalExtraHours ?? 0,
      };
      setModalState((prev) => ({ ...prev, data: Array.isArray(respEntries) ? respEntries : [], totals, isLoading: false }));
    } catch (err) {
      console.error("Failed to load hour details:", err);
      setModalState((prev) => ({ ...prev, data: [], isLoading: false }));
    }
  };

  const handleDateChange = (date) => {
    if (modalState.isOpen) {
      openHourDetails(modalState.title, modalState.type, date);
    }
  };

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const closeAdminModal = useCallback(() => {
    setAdminModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const openUsersModal = useCallback(async () => {
    setAdminModal({ isOpen: true, title: "Total Users", columns: [], data: [], isLoading: true });
    try {
      const users = await fetchAllUsers();
      const cols = [
        { key: "name", label: "Employee Name" },
        {
          key: "role", label: "Role",
          render: (u) => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              u.role === "ADMIN" ? "bg-purple-100 text-purple-700 border border-purple-200" :
              u.role === "MANAGER" ? "bg-blue-100 text-blue-700 border border-blue-200" :
              "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
            }`}>{u.role}</span>
          )
        },
        { key: "email", label: "Email" },
        {
          key: "isActive", label: "Status",
          render: (u) => (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              u.isActive ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-red-100 text-red-700 border border-red-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-red-400"}`}></span>
              {u.isActive ? "Active" : "Inactive"}
            </span>
          )
        },
      ];
      setAdminModal({ isOpen: true, title: "Total Users", columns: cols, data: Array.isArray(users) ? users : [], isLoading: false });
    } catch {
      setAdminModal((prev) => ({ ...prev, data: [], isLoading: false }));
    }
  }, []);

  const openProjectsModal = useCallback(async () => {
    setAdminModal({ isOpen: true, title: "Active Projects", columns: [], data: [], isLoading: true });
    try {
      const projects = await fetchAllProjects();
      const activeProjects = (Array.isArray(projects) ? projects : []).filter((p) => p.status === "ACTIVE");
      const cols = [
        { key: "name", label: "Project Name" },
        { key: "clientWorked", label: "Client Name", render: (p) => p.Client?.name || "-" },
        {
          key: "status", label: "Status",
          render: (p) => (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
              {p.status}
            </span>
          )
        },
      ];
      setAdminModal({ isOpen: true, title: "Active Projects", columns: cols, data: activeProjects, isLoading: false });
    } catch {
      setAdminModal((prev) => ({ ...prev, data: [], isLoading: false }));
    }
  }, []);

  const openClientsModal = useCallback(async () => {
    setAdminModal({ isOpen: true, title: "Active Clients", columns: [], data: [], isLoading: true });
    try {
      const [clients, projects] = await Promise.all([fetchAllClients(), fetchAllProjects()]);
      const activeClients = (Array.isArray(clients) ? clients : []).filter((c) => c.status === "ACTIVE");
      const projectList = Array.isArray(projects) ? projects : [];
      const projectCountMap = {};
      projectList.forEach((p) => {
        if (p.clientId) {
          projectCountMap[p.clientId] = (projectCountMap[p.clientId] || 0) + 1;
        }
      });
      const clientData = activeClients.map((c) => ({
        ...c,
        projectCount: projectCountMap[c.id] || 0,
      }));
      const cols = [
        { key: "name", label: "Client Name" },
        {
          key: "status", label: "Status",
          render: (c) => (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
              {c.status}
            </span>
          )
        },
        {
          key: "projectCount", label: "Related Projects",
          render: (c) => (
            <span className="text-[#64748B]">{c.projectCount} project{c.projectCount !== 1 ? "s" : ""}</span>
          )
        },
      ];
      setAdminModal({ isOpen: true, title: "Active Clients", columns: cols, data: clientData, isLoading: false });
    } catch {
      setAdminModal((prev) => ({ ...prev, data: [], isLoading: false }));
    }
  }, []);

  const loadStats = useCallback(async (startDate, endDate) => {
    try {
      setIsLoading(true);
      const params = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (user?.role === "MANAGER" && dashboardView === "self") {
        params.self = true;
      }
      const response = await getDashboardStats(params);
      setStats(response || {});
      console.log(`[DEBUG Dashboard] Stats loaded. totalWeekHours=${response?.totalWeekHours}, normalHours=${response?.normalHours}, dashboardEntries count=${Array.isArray(response?.dashboardEntries) ? response.dashboardEntries.length : 'N/A'}`);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  }, [dashboardView, user?.role]);

  useEffect(() => {
    const { startDate, endDate } = getFilterDateRange();
    loadStats(startDate, endDate);

    const interval = setInterval(() => {
      const { startDate: sd, endDate: ed } = getFilterDateRange();
      loadStats(sd, ed);
    }, 30000);

    const handleFocus = () => {
      const { startDate: sd, endDate: ed } = getFilterDateRange();
      loadStats(sd, ed);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [getFilterDateRange, loadStats]);

  const filteredDashboardData = useMemo(() => {
    const entries = Array.isArray(stats?.dashboardEntries) ? stats.dashboardEntries : [];
    let filtered = [];
    if (selectedMetric === "total") {
      filtered = entries;
    } else if (selectedMetric === "working") {
      filtered = entries.filter(e => e.type === "working");
    } else if (selectedMetric === "weekend") {
      filtered = entries.filter(e => e.type === "weekend");
    } else if (selectedMetric === "holiday") {
      filtered = entries.filter(e => e.type === "holiday");
    }
    const totalHours = filtered.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
    const normalHours = filtered.filter(e => e.type === "working").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
    const weekendHours = filtered.filter(e => e.type === "weekend").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
    const holidayHours = filtered.filter(e => e.type === "holiday").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
    return {
      entries: filtered,
      totals: { normalHours, weekendHours, holidayHours, totalExtraHours: weekendHours + holidayHours, totalHours },
    };
  }, [stats?.dashboardEntries, selectedMetric]);

  const statCards = [];

  if (isAdmin) {
    statCards.push(
      { title: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "text-indigo-600", bgColor: "bg-indigo-500/20", borderColor: "border-indigo-500/30", shadowColor: "shadow-indigo-500/20", clickable: true, onClick: openUsersModal },
      { title: "Active Projects", value: stats.totalProjects || 0, icon: FolderOpen, color: "text-teal-600", bgColor: "bg-teal-500/20", borderColor: "border-teal-500/30", shadowColor: "shadow-teal-500/20", clickable: true, onClick: openProjectsModal },
      { title: "Active Clients", value: stats.totalClients || 0, icon: Building, color: "text-rose-600", bgColor: "bg-rose-500/20", borderColor: "border-rose-500/30", shadowColor: "shadow-rose-500/20", clickable: true, onClick: openClientsModal }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Dashboard</h1>
          <p className="text-[#64748B]">Welcome back, {user?.name || "User"}!</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
      {user?.role === "MANAGER" && (
            <div className="relative">
              <select
                value={dashboardView}
                onChange={(e) => setDashboardView(e.target.value)}
                className="appearance-none bg-white border border-[#E2E8F0] text-[#1E293B] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#5B3CC4]/50 focus:ring-1 focus:ring-[#5B3CC4]/20 cursor-pointer hover:border-[#5B3CC4]/30 transition-colors"
              >
                <option value="self">Self Dashboard</option>
                <option value="team">Team Dashboard</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
          <div className="relative">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="appearance-none bg-white border border-[#E2E8F0] text-[#1E293B] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#5B3CC4]/50 focus:ring-1 focus:ring-[#5B3CC4]/20 cursor-pointer hover:border-[#5B3CC4]/30 transition-colors"
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="appearance-none bg-white border border-[#E2E8F0] text-[#1E293B] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#5B3CC4]/50 focus:ring-1 focus:ring-[#5B3CC4]/20 cursor-pointer hover:border-[#5B3CC4]/30 transition-colors"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {filterPeriod === "customMonth" && (
            <>
              <select
                value={customMonth}
                onChange={(e) => setCustomMonth(Number(e.target.value))}
                className="bg-white border border-[#E2E8F0] text-[#1E293B] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#5B3CC4]/50 cursor-pointer hover:border-[#5B3CC4]/30 transition-colors"
              >
                {MONTHS.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
              <select
                value={customYear}
                onChange={(e) => setCustomYear(Number(e.target.value))}
                className="bg-white border border-[#E2E8F0] text-[#1E293B] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#5B3CC4]/50 cursor-pointer hover:border-[#5B3CC4]/30 transition-colors"
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </>
          )}
          {filterPeriod === "customRange" && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#64748B]">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white border border-[#E2E8F0] text-[#1E293B] text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-[#5B3CC4]/50 cursor-pointer hover:border-[#5B3CC4]/30 transition-colors w-[140px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#64748B]">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white border border-[#E2E8F0] text-[#1E293B] text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-[#5B3CC4]/50 cursor-pointer hover:border-[#5B3CC4]/30 transition-colors w-[140px]"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {statCards.length > 0 && (isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="animate-pulse border-[#E2E8F0] bg-white">
              <CardHeader className="flex justify-between pb-2">
                <div className="h-4 w-1/2 bg-[#E2E8F0] rounded"></div>
                <div className="h-4 w-4 bg-[#E2E8F0] rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-1/3 bg-[#E2E8F0] rounded mb-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <Card
              key={card.title}
              className={`border ${card.borderColor} hover:shadow-[0_0_20px_rgba(91,60,196,0.08)] hover:border-[#5B3CC4]/30 transition-all duration-300 hover:scale-[1.02] group ${card.clickable ? "cursor-pointer" : ""}`}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
              onClick={card.clickable ? card.onClick : undefined}
            >
              <CardHeader className="flex justify-between pb-2">
                <CardTitle className="text-sm text-[#64748B] group-hover:text-white transition-colors">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${card.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${card.color} font-mono`}>
                  {card.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {!isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">
                {METRIC_OPTIONS.find(m => m.value === selectedMetric)?.label || "Dashboard"} Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDashboardData.entries.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-[#64748B]">
                  No entries found for the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Date</th>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Day</th>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Work Type</th>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Holiday Name</th>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Client</th>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Project</th>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Task</th>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDashboardData.entries.map((entry, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150 ${entry.type === "holiday" ? "bg-emerald-50 border-l-4 border-l-emerald-500" : entry.type === "weekend" ? "bg-amber-50 border-l-4 border-l-amber-500" : ""}`}
                        >
                          <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{entry.entryDate || entry.rawDate || "-"}</td>
                          <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{entry.day || "-"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {entry.type === "holiday" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Holiday</span>
                            ) : entry.type === "weekend" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Weekend</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Regular</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{entry.displayName || "-"}</td>
                          <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{entry.clientWorked || "-"}</td>
                          <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{entry.projectWorked || "-"}</td>
                          <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{entry.taskWorked || "-"}</td>
                          <td className="px-4 py-3 text-[#64748B] whitespace-nowrap max-w-[200px] truncate">{entry.description || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === "MANAGER" && dashboardView === "team" && stats.teamData && stats.teamData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5B3CC4]" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Week Hours</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.teamData.map((member) => (
                    <tr key={member.userId} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                      <td className="px-4 py-3 text-[#1E293B] font-medium">{member.name}</td>
                      <td className="px-4 py-3 text-[#64748B]">{member.email}</td>
                      <td className="px-4 py-3 text-[#1E293B]">{member.weekHours}h</td>
                      <td className="px-4 py-3 text-[#64748B]">{member.entriesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === "MANAGER" && dashboardView === "team" && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Top 5 Employees by Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#64748B]">Name</th>
                        <th className="px-4 py-3 text-left text-[#64748B]">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.topEmployees || []).length > 0 ? (
                        stats.topEmployees.map((emp) => (
                          <tr key={emp.userId} className="border-b border-[#E2E8F0]">
                            <td className="px-4 py-3 text-[#1E293B]">{emp.name}</td>
                            <td className="px-4 py-3 text-[#1E293B]">{emp.weekHours}h</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-[#64748B]">
                            No employee hours available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-white">Employees with Missing Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#64748B]">Name</th>
                        <th className="px-4 py-3 text-left text-[#64748B]">Hours Logged</th>
                        <th className="px-4 py-3 text-left text-[#64748B]">Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.missingEmployees || []).length > 0 ? (
                        stats.missingEmployees.map((emp) => (
                          <tr key={emp.userId} className="border-b border-[#E2E8F0]">
                            <td className="px-4 py-3 text-[#1E293B]">{emp.name}</td>
                            <td className="px-4 py-3 text-[#1E293B]">{emp.weekHours}h</td>
                            <td className="px-4 py-3 text-red-400">{emp.missingHours}h</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-[#64748B]">
                            No missing time records available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Top Projects by Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[#64748B]">Project</th>
                      <th className="px-4 py-3 text-left text-[#64748B]">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.topProjects || []).length > 0 ? (
                      stats.topProjects.map((proj, idx) => (
                        <tr key={idx} className="border-b border-[#E2E8F0]">
                          <td className="px-4 py-3 text-[#1E293B]">{proj.name}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{proj.hours}h</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-[#64748B]">
                          No project hours data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Working vs Extra</CardTitle>
              </CardHeader>
              <CardContent>
                {((stats.billableWeekHours || 0) > 0 || (stats.nonBillableWeekHours || 0) > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[{
                        name: "This Week",
                        billable: stats.billableWeekHours || 0,
                        nonBillable: stats.nonBillableWeekHours || 0,
                      }]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis dataKey="name" stroke="#a1a1aa" />
                      <YAxis stroke="#a1a1aa" />
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }} />
                      <Legend />
                      <Bar dataKey="billable" fill="#a855f7" name="Working" />
                      <Bar dataKey="nonBillable" fill="#6b7280" name="Extra" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-[#64748B]">
                    No working/extra data available yet.
                  </div>
                )}
              </CardContent>
              <CardContent>
                {(stats.projectDistribution || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.projectDistribution}
                        dataKey="hours"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.projectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={["#a855f7", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e"][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-[#64748B]">
                    No project distribution data available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Weekly Trend (Last 4 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              {(stats.weeklyTrend || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="week" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalHours" stroke="#3b82f6" name="Total Hours" />
                    <Line type="monotone" dataKey="billableHours" stroke="#a855f7" name="Working Hours" />
                    <Line type="monotone" dataKey="nonBillableHours" stroke="#6b7280" name="Extra Hours" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-[#64748B]">
                  No weekly trend data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <DrillDownModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        type={modalState.type}
        data={modalState.data}
        totals={modalState.totals}
        isLoading={modalState.isLoading}
        userRole={user?.role}
        date={modalState.date}
        onDateChange={handleDateChange}
      />

      <AdminListModal
        isOpen={adminModal.isOpen}
        onClose={closeAdminModal}
        title={adminModal.title}
        columns={adminModal.columns}
        data={adminModal.data}
        isLoading={adminModal.isLoading}
      />
    </div>
  );
};
