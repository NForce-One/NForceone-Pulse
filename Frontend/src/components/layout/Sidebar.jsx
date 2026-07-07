import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Clock, CheckSquare, Users, Building, FolderOpen, BarChart3, Bell, User, Timer, FileText, Calendar } from "lucide-react";
import { cn } from "../../utils/twMerge";
import { fetchUnreadCount } from "../../services/api";
import logo from "../../assets/logo.png";

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [logoError, setLogoError] = useState(false);

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
    // { name: "My Timesheet", path: "/timesheet", icon: Clock, roles: ["EMPLOYEE", "MANAGER"] },
    { name: "Timesheets", path: "/employee/my-timesheet", icon: Calendar, roles: ["EMPLOYEE", "MANAGER"] },
    // { name: "Timer", path: "/timer", icon: Timer, roles: ["EMPLOYEE", "MANAGER"] },
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
    <div className="sidebar-container flex flex-col w-64 bg-[#0D0D0D] border-r border-[#1F2937] h-full shadow-[2px_0_10px_rgba(0,0,0,0.4)]">
      <div className="sidebar-logo-area h-16 flex items-center px-6 border-b border-[#1F2937] bg-[#0D0D0D]">
        <span className="text-xl font-bold text-white flex items-center gap-3 hover:text-[#DC2626] transition-colors">
          {logoError ? (
            <Clock className="w-6 h-6 text-[#DC2626] drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
          ) : (
            <img src={logo} alt="NForce" className="w-9 h-9 object-cover" onError={() => setLogoError(true)} />
          )}
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
                "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-base font-semibold transition-all duration-200",
                isActive
                  ? "bg-[#991B1B] text-white border-l-4 border-[#DC2626]"
                  : "text-[#CBD5E1] hover:bg-[#991B1B] hover:text-white hover:border-l-4 hover:border-[#DC2626]/50"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-[#64748B]")} />
                {item.name}
              </div>
              {item.path === "/notifications" && unreadCount > 0 && (
                <span className="bg-[#DC2626] text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {adminItems.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider border-t border-[#1F2937] mt-4">
              Admin
            </div>
            {adminItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-semibold transition-all duration-200",
                    isActive
                  ? "bg-[#991B1B] text-white border-l-4 border-[#DC2626]"
                  : "text-[#CBD5E1] hover:bg-[#991B1B] hover:text-white hover:border-l-4 hover:border-[#DC2626]/50"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-[#64748B]")} />
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
