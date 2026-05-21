import React, { useEffect, useState } from "react";
import { getDashboardStats } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  Clock,
  CheckCircle,
  FolderOpen,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { cn } from "../utils/twMerge";

const monthlyData = [
  { month: "Jan", hours: 1240, billable: 980 },
  { month: "Feb", hours: 1380, billable: 1120 },
  { month: "Mar", hours: 1520, billable: 1250 },
  { month: "Apr", hours: 1480, billable: 1210 },
  { month: "May", hours: 1650, billable: 1380 },
  { month: "Jun", hours: 1720, billable: 1450 },
  { month: "Jul", hours: 1580, billable: 1320 },
  { month: "Aug", hours: 1840, billable: 1560 },
  { month: "Sep", hours: 1920, billable: 1620 },
  { month: "Oct", hours: 1780, billable: 1490 },
  { month: "Nov", hours: 2100, billable: 1780 },
  { month: "Dec", hours: 1950, billable: 1650 },
];

const topProjects = [
  { name: "NForce Mobile App", hours: 342, total: 400, color: "#6366F1" },
  { name: "Cloud Migration", hours: 285, total: 400, color: "#10B981" },
  { name: "Data Analytics Platform", hours: 221, total: 400, color: "#F59E0B" },
  { name: "Security Audit Q4", hours: 178, total: 200, color: "#EF4444" },
  { name: "Client Portal Redesign", hours: 145, total: 300, color: "#3B82F6" },
];

const departments = [
  { name: "Engineering", employees: 45, hours: 1280, utilization: 94, projects: 8 },
  { name: "Design", employees: 12, hours: 340, utilization: 88, projects: 5 },
  { name: "Marketing", employees: 8, hours: 210, utilization: 72, projects: 3 },
  { name: "Operations", employees: 15, hours: 420, utilization: 85, projects: 4 },
  { name: "Sales", employees: 10, hours: 290, utilization: 78, projects: 6 },
];

const recentActivities = [
  { user: "Sarah Chen", action: "submitted timesheet for", target: "Engineering Week 42", time: "5 min ago", type: "submitted" },
  { user: "Marcus Johnson", action: "approved", target: "Design Team Timesheet", time: "18 min ago", type: "approved" },
  { user: "Emily Rodriguez", action: "logged 8h on", target: "NForce Mobile App", time: "1 hour ago", type: "logged" },
  { user: "David Kim", action: "created project", target: "Q1 2026 Planning", time: "2 hours ago", type: "created" },
  { user: "Lisa Wang", action: "completed task", target: "Database Optimization", time: "3 hours ago", type: "completed" },
  { user: "James Wilson", action: "submitted timesheet for", target: "Operations Week 42", time: "4 hours ago", type: "submitted" },
  { user: "Amanda Lee", action: "requested time off", target: "Dec 24 - Jan 2", time: "5 hours ago", type: "requested" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-lg px-3 py-2 text-sm">
        <p className="font-medium text-[#111827] mb-1">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }} className="text-xs font-medium">
            {entry.name}: {entry.value.toLocaleString()}h
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await getDashboardStats();
        setStats(response || {});
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  const statCards = [
    {
      title: "Total Employees",
      value: isAdmin ? (stats.totalUsers || 0) : "—",
      icon: Users,
      trend: "+12%",
      trendUp: true,
      color: "from-[#6366F1] to-[#818CF8]",
      bgLight: "bg-[#EEF2FF]",
      iconColor: "text-[#6366F1]",
    },
    {
      title: "Total Hours This Week",
      value: `${stats.totalWeekHours || 0}h`,
      icon: Clock,
      trend: "+8%",
      trendUp: true,
      color: "from-[#3B82F6] to-[#60A5FA]",
      bgLight: "bg-[#EFF6FF]",
      iconColor: "text-[#3B82F6]",
    },
    {
      title: "Pending Approvals",
      value: isManagerOrAdmin ? (stats.pendingApprovals || 0) : "—",
      icon: CheckCircle,
      trend: "3 urgent",
      trendUp: false,
      color: "from-[#F59E0B] to-[#FBBF24]",
      bgLight: "bg-[#FFFBEB]",
      iconColor: "text-[#F59E0B]",
    },
    {
      title: "Active Projects",
      value: isAdmin ? (stats.totalProjects || 0) : "—",
      icon: FolderOpen,
      trend: "+2 this month",
      trendUp: true,
      color: "from-[#10B981] to-[#34D399]",
      bgLight: "bg-[#ECFDF5]",
      iconColor: "text-[#10B981]",
    },
    {
      title: "Billable This Month",
      value: `$${stats.billableMonthHours ? (stats.billableMonthHours * 150).toLocaleString() : "—"}`,
      icon: DollarSign,
      trend: "+18%",
      trendUp: true,
      color: "from-[#8B5CF6] to-[#A78BFA]",
      bgLight: "bg-[#F5F3FF]",
      iconColor: "text-[#8B5CF6]",
    },
  ].filter(
    (card) =>
      !(
        (card.title === "Total Employees" && !isAdmin) ||
        (card.title === "Active Projects" && !isAdmin) ||
        (card.title === "Pending Approvals" && !isManagerOrAdmin)
      )
  );

  const StatCardSkeleton = () => (
    <div className="stat-card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-[#F3F4F6] rounded" />
          <div className="h-7 w-20 bg-[#F3F4F6] rounded" />
        </div>
        <div className="w-10 h-10 rounded-lg bg-[#F3F4F6]" />
      </div>
      <div className="h-3 w-16 bg-[#F3F4F6] rounded" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Welcome back, {user?.name || "User"}! Here&apos;s your company overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280] bg-[#F9FAFB] px-3 py-1.5 rounded-lg border border-[#E5E7EB]">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].slice(0, statCards.length || 5).map((n) => (
            <StatCardSkeleton key={n} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((card) => (
            <div key={card.title} className="stat-card p-5 group cursor-default">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
                    {card.value}
                  </p>
                </div>
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center stat-icon shrink-0", card.bgLight)}>
                  <card.icon className={cn("w-5 h-5", card.iconColor)} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  card.trendUp ? "text-[#10B981]" : "text-[#EF4444]"
                )}>
                  {card.trendUp ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {card.trend}
                </span>
                <span className="text-xs text-[#9CA3AF]">vs last week</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Company Overview Chart + Top Projects */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Company Overview Line Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Company Overview</CardTitle>
                <p className="text-sm text-[#6B7280] mt-0.5">Total hours tracked this year</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
                  <span className="text-xs text-[#6B7280]">Total Hours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
                  <span className="text-xs text-[#6B7280]">Billable</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: "#6366F1", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="billable"
                      stroke="#A78BFA"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#A78BFA", stroke: "#fff", strokeWidth: 2 }}
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Projects */}
        <div>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Projects</CardTitle>
                <p className="text-sm text-[#6B7280] mt-0.5">Hours tracked this month</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {topProjects.map((project) => (
                  <div key={project.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                        <span className="text-sm font-medium text-[#374151]">{project.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#111827]">{project.hours}h</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${(project.hours / project.total) * 100}%`, backgroundColor: project.color }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[11px] text-[#9CA3AF]">
                        {Math.round((project.hours / project.total) * 100)}% complete
                      </span>
                      <span className="text-[11px] text-[#9CA3AF]">Target: {project.total}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Department Summary + Recent Activities */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Department Summary Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Department Summary</CardTitle>
                <p className="text-sm text-[#6B7280] mt-0.5">Current period overview</p>
              </div>
              <button className="text-xs font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors">
                View All
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="table-dashboard">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Employees</th>
                      <th>Hours</th>
                      <th>Utilization</th>
                      <th>Projects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => (
                      <tr key={dept.name}>
                        <td className="font-medium text-[#111827]">{dept.name}</td>
                        <td className="text-[#6B7280]">{dept.employees}</td>
                        <td className="text-[#6B7280]">{dept.hours}h</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[80px]">
                              <div className="progress-bar">
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${dept.utilization}%`,
                                    backgroundColor: dept.utilization >= 85 ? "#10B981" : dept.utilization >= 75 ? "#F59E0B" : "#EF4444",
                                  }}
                                />
                              </div>
                            </div>
                            <span className={cn(
                              "text-xs font-medium",
                              dept.utilization >= 85 ? "text-[#10B981]" : dept.utilization >= 75 ? "text-[#F59E0B]" : "text-[#EF4444]"
                            )}>
                              {dept.utilization}%
                            </span>
                          </div>
                        </td>
                        <td className="text-[#6B7280]">{dept.projects}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <p className="text-sm text-[#6B7280] mt-0.5">Latest team updates</p>
              </div>
              <Activity className="w-4 h-4 text-[#9CA3AF]" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="activity-timeline px-5 py-1">
                {recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex gap-3 py-3 activity-item relative">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                        activity.type === "submitted" && "bg-[#6366F1]",
                        activity.type === "approved" && "bg-[#10B981]",
                        activity.type === "logged" && "bg-[#3B82F6]",
                        activity.type === "created" && "bg-[#F59E0B]",
                        activity.type === "completed" && "bg-[#8B5CF6]",
                        activity.type === "requested" && "bg-[#EF4444]",
                      )}>
                        {activity.user.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#374151]">
                        <span className="font-medium text-[#111827]">{activity.user}</span>{" "}
                        {activity.action}{" "}
                        <span className="font-medium text-[#111827]">{activity.target}</span>
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
