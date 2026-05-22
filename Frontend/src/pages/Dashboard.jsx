import React, { useEffect, useState, useCallback } from "react";
import { getDashboardStats, getHourDetails, fetchAllUsers, fetchAllProjects, fetchAllClients } from "../services/api";
import { AdminListModal } from "../components/ui/AdminListModal";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { DrillDownModal } from "../components/ui/DrillDownModal";
import { Clock, CheckCircle, AlertCircle, BarChart3, Users, FolderOpen, Building, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
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
              u.role === "ADMIN" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
              u.role === "MANAGER" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
              "bg-[#2a2a2a] text-[#a1a1aa] border border-[#3a3a3a]"
            }`}>{u.role}</span>
          )
        },
        { key: "email", label: "Email" },
        {
          key: "isActive", label: "Status",
          render: (u) => (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              u.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
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
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {c.status}
            </span>
          )
        },
        {
          key: "projectCount", label: "Related Projects",
          render: (c) => (
            <span className="text-[#a1a1aa]">{c.projectCount} project{c.projectCount !== 1 ? "s" : ""}</span>
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

  const statCards = [
    {
      title: "Total Working Hours",
      value: `${(stats.totalWeekHours || 0).toFixed(2)}h`,
      icon: Clock,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
      shadowColor: "shadow-blue-500/20",
      clickable: true,
      onClick: () => openHourDetails("Total Working Hours", "total"),
    },
    {
      title: "Working Hours",
      value: `${(stats.normalHours || 0).toFixed(2)}h`,
      icon: BarChart3,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
      shadowColor: "shadow-purple-500/20",
      clickable: true,
      onClick: () => openHourDetails("Working Hours", "working"),
    },
    {
      title: "Extra Working Hours on Weekends",
      value: `${(stats.weekendHours || 0).toFixed(2)}h`,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/30",
      shadowColor: "shadow-amber-500/20",
      clickable: true,
      onClick: () => openHourDetails("Extra Working Hours on Weekends", "weekend"),
    },
    {
      title: "Extra Working Hours on Holidays",
      value: `${(stats.holidayHours || 0).toFixed(2)}h`,
      icon: Clock,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500/30",
      shadowColor: "shadow-emerald-500/20",
      clickable: true,
      onClick: () => openHourDetails("Extra Working Hours on Holidays", "holiday"),
    },
  ];

  if (user?.role === "EMPLOYEE" || (user?.role === "MANAGER" && dashboardView === "self")) {
    statCards.push({
      title: "Draft Entries",
      value: stats.draftEntries || 0,
      icon: AlertCircle,
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/30",
      shadowColor: "shadow-amber-500/20",
      clickable: true,
      onClick: () => openHourDetails("Draft Entries", "draft"),
    });
  }

  if (isAdmin || (user?.role === "MANAGER" && dashboardView === "team")) {
    statCards.push({
      title: "Pending Approvals",
      value: stats.pendingApprovals || 0,
      icon: CheckCircle,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500/30",
      shadowColor: "shadow-emerald-500/20",
    });
  }

  if (user?.role === "MANAGER" && dashboardView === "team") {
    statCards.push(
      {
        title: "Missing Hours",
        value: `${stats.missingHours || 0}h`,
        icon: TrendingDown,
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        borderColor: "border-red-500/30",
        shadowColor: "shadow-red-500/20",
      },
      {
        title: "Utilization %",
        value: `${stats.utilization || 0}%`,
        icon: TrendingUp,
        color: "text-cyan-400",
        bgColor: "bg-cyan-500/20",
        borderColor: "border-cyan-500/30",
        shadowColor: "shadow-cyan-500/20",
      }
    );
  }

  if (isAdmin) {
    statCards.push(
      { title: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "text-indigo-400", bgColor: "bg-indigo-500/20", borderColor: "border-indigo-500/30", shadowColor: "shadow-indigo-500/20", clickable: true, onClick: openUsersModal },
      { title: "Active Projects", value: stats.totalProjects || 0, icon: FolderOpen, color: "text-teal-400", bgColor: "bg-teal-500/20", borderColor: "border-teal-500/30", shadowColor: "shadow-teal-500/20", clickable: true, onClick: openProjectsModal },
      { title: "Active Clients", value: stats.totalClients || 0, icon: Building, color: "text-rose-400", bgColor: "bg-rose-500/20", borderColor: "border-rose-500/30", shadowColor: "shadow-rose-500/20", clickable: true, onClick: openClientsModal }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Dashboard</h1>
          <p className="text-[#6b7280]">Welcome back, {user?.name || "User"}!</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
      {user?.role === "MANAGER" && (
            <div className="relative">
              <select
                value={dashboardView}
                onChange={(e) => setDashboardView(e.target.value)}
                className="appearance-none bg-white border border-[#d1d5db] text-[#111827] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 cursor-pointer hover:border-[#9ca3af] transition-colors"
              >
                <option value="self">Self Dashboard</option>
                <option value="team">Team Dashboard</option>
              </select>
      <ChevronDown className="w-4 h-4 text-[#6b7280] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
          <div className="relative">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="appearance-none bg-white border border-[#d1d5db] text-[#111827] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 cursor-pointer hover:border-[#9ca3af] transition-colors"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#6b7280] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {filterPeriod === "customMonth" && (
            <>
              <select
                value={customMonth}
                onChange={(e) => setCustomMonth(Number(e.target.value))}
                className="bg-white border border-[#d1d5db] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#22c55e]/50 cursor-pointer hover:border-[#9ca3af] transition-colors"
              >
                {MONTHS.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
              <select
                value={customYear}
                onChange={(e) => setCustomYear(Number(e.target.value))}
                className="bg-white border border-[#d1d5db] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#22c55e]/50 cursor-pointer hover:border-[#9ca3af] transition-colors"
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
                <span className="text-xs text-[#6b7280]">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white border border-[#d1d5db] text-[#111827] text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-[#22c55e]/50 cursor-pointer hover:border-[#9ca3af] transition-colors w-[140px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#6b7280]">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white border border-[#d1d5db] text-[#111827] text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-[#22c55e]/50 cursor-pointer hover:border-[#9ca3af] transition-colors w-[140px]"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="animate-pulse border-[#e5e7eb] bg-white">
              <CardHeader className="flex justify-between pb-2">
                <div className="h-4 w-1/2 bg-[#e5e7eb] rounded"></div>
                <div className="h-4 w-4 bg-[#e5e7eb] rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-1/3 bg-[#e5e7eb] rounded mb-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <Card
              key={card.title}
              className={`border ${card.borderColor} hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] hover:border-[#22c55e]/30 transition-all duration-300 hover:scale-[1.02] group ${card.clickable ? "cursor-pointer" : ""}`}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
              onClick={card.clickable ? card.onClick : undefined}
            >
              <CardHeader className="flex justify-between pb-2">
                <CardTitle className="text-sm text-[#6b7280] group-hover:text-[#111827] transition-colors">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${card.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <card.icon className={`w-4 h-4 ${card.color} drop-shadow-[0_0_8px_currentColor]`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${card.color} drop-shadow-[0_0_10px_currentColor] font-mono`}>
                  {card.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {user?.role === "MANAGER" && dashboardView === "team" && stats.teamData && stats.teamData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-[#111827] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#22c55e]" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#6b7280] font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-[#6b7280] font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-[#6b7280] font-medium">Week Hours</th>
                    <th className="px-4 py-3 text-left text-[#6b7280] font-medium">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.teamData.map((member) => (
                    <tr key={member.userId} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors duration-150">
                      <td className="px-4 py-3 text-[#111827] font-medium">{member.name}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{member.email}</td>
                      <td className="px-4 py-3 text-[#111827]">{member.weekHours}h</td>
                      <td className="px-4 py-3 text-[#6b7280]">{member.entriesCount}</td>
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
                <CardTitle className="text-[#111827]">Top 5 Employees by Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#6b7280]">Name</th>
                        <th className="px-4 py-3 text-left text-[#6b7280]">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.topEmployees || []).length > 0 ? (
                        stats.topEmployees.map((emp) => (
                          <tr key={emp.userId} className="border-b border-[#2a2a2a]">
                            <td className="px-4 py-3 text-white">{emp.name}</td>
                            <td className="px-4 py-3 text-white">{emp.weekHours}h</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-[#6b7280]">
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
                <CardTitle className="text-[#111827]">Employees with Missing Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#6b7280]">Name</th>
                        <th className="px-4 py-3 text-left text-[#6b7280]">Hours Logged</th>
                        <th className="px-4 py-3 text-left text-[#6b7280]">Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.missingEmployees || []).length > 0 ? (
                        stats.missingEmployees.map((emp) => (
                          <tr key={emp.userId} className="border-b border-[#e5e7eb]">
                            <td className="px-4 py-3 text-[#111827]">{emp.name}</td>
                            <td className="px-4 py-3 text-[#111827]">{emp.weekHours}h</td>
                            <td className="px-4 py-3 text-red-400">{emp.missingHours}h</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-[#6b7280]">
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
              <CardTitle className="text-[#111827]">Top Projects by Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                     <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#6b7280]">Name</th>
                        <th className="px-4 py-3 text-left text-[#6b7280]">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.topProjects || []).length > 0 ? (
                      stats.topProjects.map((proj, idx) => (
                         <tr key={idx} className="border-b border-[#e5e7eb]">
                           <td className="px-4 py-3 text-[#111827]">{proj.name}</td>
                           <td className="px-4 py-3 text-[#111827]">{proj.hours}h</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-[#6b7280]">
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
                <CardTitle className="text-[#111827]">Working vs Extra</CardTitle>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#111827" }} />
                      <Legend />
                      <Bar dataKey="billable" fill="#a855f7" name="Working" />
                      <Bar dataKey="nonBillable" fill="#6b7280" name="Extra" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-[#6b7280]">
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
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#111827" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-[#6b7280]">
                    No project distribution data available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#111827]">Weekly Trend (Last 4 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              {(stats.weeklyTrend || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#111827" }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalHours" stroke="#3b82f6" name="Total Hours" />
                    <Line type="monotone" dataKey="billableHours" stroke="#a855f7" name="Working Hours" />
                    <Line type="monotone" dataKey="nonBillableHours" stroke="#6b7280" name="Extra Hours" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                  <div className="flex h-[300px] items-center justify-center text-[#6b7280]">
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
