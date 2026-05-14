import React, { useEffect, useState, useCallback } from "react";
import { getDashboardStats, getHourDetails } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { DrillDownModal } from "../components/ui/DrillDownModal";
import { Clock, CheckCircle, AlertCircle, BarChart3, Users, FolderOpen, Building, TrendingUp, TrendingDown } from "lucide-react";
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

export const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    type: "",
    data: [],
    isLoading: false,
  });

  const openHourDetails = useCallback(async (title, type) => {
    setModalState({ isOpen: true, title, type, data: [], isLoading: true });
    try {
      const data = await getHourDetails(type);
      setModalState((prev) => ({ ...prev, data: Array.isArray(data) ? data : [], isLoading: false }));
    } catch {
      setModalState((prev) => ({ ...prev, data: [], isLoading: false }));
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

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
      title: "Total Hours This Week",
      value: `${stats.totalWeekHours || 0}h`,
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
      value: `${stats.billableWeekHours || 0}h`,
      icon: BarChart3,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
      shadowColor: "shadow-purple-500/20",
      clickable: true,
      onClick: () => openHourDetails("Working Hours", "working"),
    },
    {
      title: "Extra Hours",
      value: `${stats.nonBillableWeekHours || 0}h`,
      icon: Clock,
      color: "text-gray-400",
      bgColor: "bg-gray-500/20",
      borderColor: "border-gray-500/30",
      shadowColor: "shadow-gray-500/20",
      clickable: true,
      onClick: () => openHourDetails("Extra Working Hours", "extra"),
    },
  ];

  if (user?.role === "EMPLOYEE") {
    statCards.push({
      title: "Draft Entries",
      value: stats.draftEntries || 0,
      icon: AlertCircle,
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/30",
      shadowColor: "shadow-amber-500/20",
    });
  }

  if (isManagerOrAdmin) {
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

  if (user?.role === "MANAGER") {
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
      { title: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "text-indigo-400", bgColor: "bg-indigo-500/20", borderColor: "border-indigo-500/30", shadowColor: "shadow-indigo-500/20" },
      { title: "Active Projects", value: stats.totalProjects || 0, icon: FolderOpen, color: "text-teal-400", bgColor: "bg-teal-500/20", borderColor: "border-teal-500/30", shadowColor: "shadow-teal-500/20" },
      { title: "Active Clients", value: stats.totalClients || 0, icon: Building, color: "text-rose-400", bgColor: "bg-rose-500/20", borderColor: "border-rose-500/30", shadowColor: "shadow-rose-500/20" }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-[#a1a1aa]">Welcome back, {user?.name || "User"}!</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="animate-pulse border-[#2a2a2a] bg-[#1a1a1a]">
              <CardHeader className="flex justify-between pb-2">
                <div className="h-4 w-1/2 bg-[#2a2a2a] rounded"></div>
                <div className="h-4 w-4 bg-[#2a2a2a] rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-1/3 bg-[#2a2a2a] rounded mb-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <Card
              key={card.title}
              className={`border ${card.borderColor} hover:shadow-[0_0_20px_rgba(255,45,45,0.1)] hover:border-[#ff2d2d]/30 transition-all duration-300 hover:scale-[1.02] group ${card.clickable ? "cursor-pointer" : ""}`}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
              onClick={card.clickable ? card.onClick : undefined}
            >
              <CardHeader className="flex justify-between pb-2">
                <CardTitle className="text-sm text-[#a1a1aa] group-hover:text-white transition-colors">
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

      {isManagerOrAdmin && stats.teamData && stats.teamData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#ff2d2d]" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Week Hours</th>
                    <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.teamData.map((member) => (
                    <tr key={member.userId} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150">
                      <td className="px-4 py-3 text-white font-medium">{member.name}</td>
                      <td className="px-4 py-3 text-[#a1a1aa]">{member.email}</td>
                      <td className="px-4 py-3 text-white">{member.weekHours}h</td>
                      <td className="px-4 py-3 text-[#a1a1aa]">{member.entriesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === "MANAGER" && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Top 5 Employees by Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#a1a1aa]">Name</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa]">Hours</th>
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
                          <td colSpan={2} className="px-4 py-6 text-center text-[#a1a1aa]">
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
                    <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#a1a1aa]">Name</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa]">Hours Logged</th>
                        <th className="px-4 py-3 text-left text-[#a1a1aa]">Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.missingEmployees || []).length > 0 ? (
                        stats.missingEmployees.map((emp) => (
                          <tr key={emp.userId} className="border-b border-[#2a2a2a]">
                            <td className="px-4 py-3 text-white">{emp.name}</td>
                            <td className="px-4 py-3 text-white">{emp.weekHours}h</td>
                            <td className="px-4 py-3 text-red-400">{emp.missingHours}h</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-[#a1a1aa]">
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
                  <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[#a1a1aa]">Project</th>
                      <th className="px-4 py-3 text-left text-[#a1a1aa]">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.topProjects || []).length > 0 ? (
                      stats.topProjects.map((proj, idx) => (
                        <tr key={idx} className="border-b border-[#2a2a2a]">
                          <td className="px-4 py-3 text-white">{proj.name}</td>
                          <td className="px-4 py-3 text-white">{proj.hours}h</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-[#a1a1aa]">
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
                  <div className="flex h-[300px] items-center justify-center text-[#a1a1aa]">
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
                  <div className="flex h-[300px] items-center justify-center text-[#a1a1aa]">
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
                <div className="flex h-[300px] items-center justify-center text-[#a1a1aa]">
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
        isLoading={modalState.isLoading}
      />
    </div>
  );
};
