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
    <header className="h-16 flex items-center justify-between px-6 shadow-sm" style={{ background: "linear-gradient(90deg, #0D0D0D 0%, #0D0D0D 15%, #1A0000 22%, #3A0000 32%, #6B0000 45%, #8B1212 58%, #B91C1C 75%, #DC2626 100%)" }}>
      <div className="flex items-center">
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            navigate("/notifications");
            loadUnreadCount();
          }}
          className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 text-sm text-white/80">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white border border-white/20">
            <User className="w-4 h-4" />
          </div>
          <span className="font-medium text-white">{user?.name || user?.email || 'User'}</span>
          <span className="text-white/70 capitalize bg-black/20 px-2 py-0.5 rounded text-xs ml-2 border border-white/10">
            {user?.role || 'employee'}
          </span>
        </div>
        <div className="w-px h-6 bg-white/20"></div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-white/70 hover:text-white gap-2 hover:bg-white/10">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};
