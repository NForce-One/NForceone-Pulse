import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Clock, CheckSquare, Users, Building, FolderOpen, ListTodo, BarChart3, Bell, User, Timer, FileText } from "lucide-react";
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
    { name: "My Timesheet", path: "/timesheet", icon: Clock, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "Timer", path: "/timer", icon: Timer, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "Team Timesheets", path: "/manager/team-timesheets", icon: FileText, roles: ["MANAGER", "ADMIN"] },
    { name: "Approvals", path: "/approvals", icon: CheckSquare, roles: ["MANAGER", "ADMIN"] },
    { name: "Reports", path: "/reports", icon: BarChart3, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "Notifications", path: "/notifications", icon: Bell, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "Profile", path: "/profile", icon: User, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { name: "Users", path: "/admin/users", icon: Users, roles: ["ADMIN"] },
    { name: "Clients", path: "/admin/clients", icon: Building, roles: ["ADMIN"] },
    { name: "Projects", path: "/admin/projects", icon: FolderOpen, roles: ["ADMIN"] },
    { name: "Tasks", path: "/admin/tasks", icon: ListTodo, roles: ["ADMIN"] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  const adminItems = visibleItems.filter((item) => item.path.startsWith("/admin"));
  const mainItems = visibleItems.filter((item) => !item.path.startsWith("/admin"));

  return (
    <div className="flex flex-col w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] h-full shadow-[2px_0_10px_rgba(0,0,0,0.3)]">
      <div className="h-16 flex items-center px-6 border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <span className="text-xl font-bold text-[#ff2d2d] flex items-center gap-2 hover:text-[#ff4444] transition-colors">
          <Clock className="w-6 h-6 text-[#ff2d2d] drop-shadow-[0_0_8px_rgba(255,45,45,0.5)]" />
          <span className="bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b] bg-clip-text text-transparent font-extrabold">
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
                  ? "bg-[#ff2d2d]/10 text-[#ff2d2d] border-l-4 border-[#ff2d2d] shadow-[inset_0_0_10px_rgba(255,45,45,0.1)]"
                  : "text-[#a1a1aa] hover:bg-[#2a2a2a] hover:text-white hover:border-l-4 hover:border-[#ff2d2d]/50"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-[#ff2d2d] drop-shadow-[0_0_5px_rgba(255,45,45,0.5)]" : "text-[#a1a1aa]")} />
                {item.name}
              </div>
              {item.path === "/notifications" && unreadCount > 0 && (
                <span className="bg-[#ff2d2d] text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-[0_0_10px_rgba(255,45,45,0.5)] animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {adminItems.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider border-t border-[#2a2a2a] mt-4">
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
                      ? "bg-[#ff2d2d]/10 text-[#ff2d2d] border-l-4 border-[#ff2d2d] shadow-[inset_0_0_10px_rgba(255,45,45,0.1)]"
                      : "text-[#a1a1aa] hover:bg-[#2a2a2a] hover:text-white hover:border-l-4 hover:border-[#ff2d2d]/50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-[#ff2d2d]" : "text-[#a1a1aa]")} />
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
