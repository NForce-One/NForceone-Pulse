import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  UserCircle,
  Building,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "../../utils/twMerge";

const menuGroups = [
  {
    title: "Main Menu",
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      { name: "Team Timesheets", path: "/manager/team-timesheets", icon: Users },
      { name: "Projects", path: "/admin/projects", icon: FolderOpen },
      { name: "Tasks", path: "/admin/tasks", icon: CheckSquare },
    ],
  },
  {
    title: "Management",
    items: [
      { name: "Users", path: "/admin/users", icon: UserCircle },
      { name: "Clients", path: "/admin/clients", icon: Building },
      { name: "Reports", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      { name: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col w-64 sidebar-gradient h-full shrink-0 sidebar-glow">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06] shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-lg shadow-[#6366F1]/25">
            <div className="w-3 h-3 rounded-full bg-white" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse-dot shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-white tracking-tight leading-tight">
            NForce Pulse
          </span>
          <span className="text-[10px] font-medium text-[#94A3B8] tracking-wide">
            Enterprise Suite
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-none">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <div className="nav-section-title">{group.title}</div>
            {group.items.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "nav-item group",
                    active && "active"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                      active
                        ? "text-[#A5B4FC]"
                        : "text-[#94A3B8] group-hover:text-[#E2E8F0]"
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <Link
          to="/login"
          className="nav-item text-[#94A3B8] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]"
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span>Logout</span>
        </Link>
      </div>
    </div>
  );
};
