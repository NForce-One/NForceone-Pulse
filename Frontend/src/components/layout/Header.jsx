import React, { useState, useEffect, useRef } from "react";
import { LogOut, User, Bell, ChevronDown, Monitor, Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { fetchUnreadCount } from "../../services/api";
import { useTheme } from "../../hooks/useTheme";

const modeIcons = {
  auto: Monitor,
  light: Sun,
  dark: Moon,
};

const modeLabels = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

const HeaderDropdown = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const ModeIcon = modeIcons[theme] || Monitor;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-200 hover:text-gray-100 bg-white/5 hover:bg-white/10 rounded-md transition-all cursor-pointer"
      >
        <ModeIcon className="w-3.5 h-3.5" />
        <span>Display Mode</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-1 z-50">
          {["auto", "light", "dark"].map((mode) => {
            const Icon = modeIcons[mode];
            return (
              <button
                key={mode}
                onClick={() => { setTheme(mode); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#64748B]" />
                  <span>{modeLabels[mode]}</span>
                </span>
                {theme === mode && (
                  <svg className="w-4 h-4 text-[#B33A2F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white border border-white/20">
            <User className="w-4 h-4" />
          </div>
          <span className="font-medium text-white">{user?.name || user?.email || 'User'}</span>

          <HeaderDropdown />

          <span className="text-gray-200 hover:text-gray-100 capitalize bg-black/20 px-2 py-0.5 rounded text-xs border border-white/10">
            {user?.role || 'employee'}
          </span>
        </div>

        <div className="w-px h-6 bg-white/20"></div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-gray-200 hover:text-gray-100 gap-2 hover:bg-white/10">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};
