import React, { useState, useEffect } from "react";
import { LogOut, User, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { fetchUnreadCount } from "../../services/api";

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    try {
      const response = await fetchUnreadCount();
      setUnreadCount(response?.data?.count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count", error);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center">
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            navigate("/notifications");
            loadUnreadCount();
          }}
          className="relative p-2 text-[#64748B] hover:text-[#5B3CC4] hover:bg-[#F1F5F9] rounded-lg transition-all duration-200"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#5B3CC4] text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(91,60,196,0.5)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <div className="w-8 h-8 bg-[#5B3CC4]/10 rounded-full flex items-center justify-center text-[#5B3CC4] border border-[#5B3CC4]/20">
            <User className="w-4 h-4" />
          </div>
          <span className="font-medium text-[#1E293B]">{user?.name || user?.email || 'User'}</span>
          <span className="text-[#64748B] capitalize bg-[#F1F5F9] px-2 py-0.5 rounded text-xs ml-2 border border-[#E2E8F0]">
            {user?.role || 'employee'}
          </span>
        </div>
        <div className="w-px h-6 bg-[#E2E8F0]"></div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-[#64748B] hover:text-[#EF4444] gap-2 hover:bg-[#F1F5F9]">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};
