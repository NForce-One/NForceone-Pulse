import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Clock, CheckSquare, Users, Building, FolderOpen, BarChart3, Bell, User, Timer, FileText, Calendar } from "lucide-react";
import { cn } from "../../utils/twMerge";
import { fetchUnreadCount } from "../../services/api";

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetchUnreadCount();
        setUnreadCount(res?.data?.count || 0);
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const role = user?.role?.toUpperCase() || "EMPLOYEE";

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "My Timesheet", path: "/timesheet", icon: Clock, roles: ["EMPLOYEE", "MANAGER"] },
    { name: "TimeIQ", path: "/employee/my-timesheet", icon: Calendar, roles: ["EMPLOYEE", "MANAGER"] },
    { name: "Timer", path: "/timer", icon: Timer, roles: ["EMPLOYEE", "MANAGER"] },
    { name: "Team Timesheets", path: "/manager/team-timesheets", icon: FileText, roles: ["ADMIN"] },
    { name: "Approvals", path: "/approvals", icon: CheckSquare, roles: ["MANAGER", "ADMIN"] },
    { name: "Reports", path: "/reports", icon: BarChart3, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "Notifications", path: "/notifications", icon: Bell, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "Profile", path: "/profile", icon: User, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "Users", path: "/admin/users", icon: Users, roles: ["ADMIN"] },
    { name: "Clients", path: "/admin/clients", icon: Building, roles: ["ADMIN"] },
    { name: "Projects", path: "/admin/projects", icon: FolderOpen, roles: ["ADMIN"] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  const adminItems = visibleItems.filter((item) => item.path.startsWith("/admin"));
  const mainItems = visibleItems.filter((item) => !item.path.startsWith("/admin"));

  return (
    <div className="flex flex-col w-64 bg-[#0B1F3A] border-r border-[#1A4A7A] h-full shadow-[2px_0_10px_rgba(0,0,0,0.2)]">
      <div className="h-16 flex items-center px-6 border-b border-[#1A4A7A] bg-[#0B1F3A]">
        <span className="text-xl font-bold text-white flex items-center gap-2 hover:text-[#8B6EF3] transition-colors">
          <Clock className="w-6 h-6 text-[#5B3CC4] drop-shadow-[0_0_8px_rgba(91,60,196,0.5)]" />
          <span className="text-white font-extrabold">
            NForce Pulse
          </span>
        </span>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {mainItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[#103B63] text-white border-l-4 border-[#5B3CC4]"
                  : "text-[#94A3B8] hover:bg-[#103B63] hover:text-white hover:border-l-4 hover:border-[#5B3CC4]/50"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-[#8B6EF3]" : "text-[#64748B]")} />
                {item.name}
              </div>
              {item.path === "/notifications" && unreadCount > 0 && (
                <span className="bg-[#5B3CC4] text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-[0_0_10px_rgba(91,60,196,0.5)]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {adminItems.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider border-t border-[#1A4A7A] mt-4">
              Admin
            </div>
            {adminItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#103B63] text-white border-l-4 border-[#5B3CC4]"
                      : "text-[#94A3B8] hover:bg-[#103B63] hover:text-white hover:border-l-4 hover:border-[#5B3CC4]/50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-[#8B6EF3]" : "text-[#64748B]")} />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
