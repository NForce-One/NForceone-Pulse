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
    const interval = setInterval(loadUnreadCount, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center justify-between px-6 shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
      <div className="flex items-center">
        {/* Placeholder for left-side header content like mobile menu toggle */}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            navigate("/notifications");
            loadUnreadCount();
          }}
          className="relative p-2 text-[#a1a1aa] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-all duration-200"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#ff2d2d] text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(255,45,45,0.5)] animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 text-sm text-[#a1a1aa]">
          <div className="w-8 h-8 bg-[#ff2d2d]/10 rounded-full flex items-center justify-center text-[#ff2d2d] border border-[#ff2d2d]/20">
            <User className="w-4 h-4" />
          </div>
          <span className="font-medium text-white">{user?.name || user?.email || 'User'}</span>
          <span className="text-[#a1a1aa] capitalize bg-[#2a2a2a] px-2 py-0.5 rounded text-xs ml-2 border border-[#3a3a3a]">
            {user?.role || 'employee'}
          </span>
        </div>
        <div className="w-px h-6 bg-[#2a2a2a]"></div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-[#a1a1aa] hover:text-[#ff2d2d] gap-2 hover:bg-[#2a2a2a]">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};
