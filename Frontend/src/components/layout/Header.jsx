import React, { useState, useRef, useEffect } from "react";
import { Bell, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "../../utils/twMerge";

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = 3;
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "NF";

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
        <span className="text-sm font-semibold text-[#111827]">NForce Pulse Inc.</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-all duration-150"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center bg-[#EF4444] text-white text-[10px] font-bold rounded-full shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors duration-150"
          >
            <div className="avatar w-8 h-8 text-xs">{initials}</div>
            <div className="text-left">
              <div className="text-sm font-medium text-[#111827] leading-tight">
                {user?.name || "Admin User"}
              </div>
              <div className="text-[11px] text-[#6B7280] leading-tight">
                {user?.role || "Administrator"}
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-[#6B7280] transition-transform duration-200", showProfileMenu && "rotate-180")} />
          </button>
          {showProfileMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg border border-[#E5E7EB] shadow-lg shadow-black/5 animate-slide-down z-50">
              <div className="px-4 py-3 border-b border-[#F3F4F6]">
                <div className="text-sm font-medium text-[#111827]">{user?.name || "Admin User"}</div>
                <div className="text-xs text-[#6B7280]">{user?.email || "admin@nforcepulse.com"}</div>
              </div>
              <button
                onClick={() => { navigate("/profile"); setShowProfileMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
              >
                Profile Settings
              </button>
              <button
                onClick={() => { logout(); setShowProfileMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
