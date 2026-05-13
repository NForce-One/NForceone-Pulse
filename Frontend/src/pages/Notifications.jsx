import React, { useState, useEffect } from "react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Bell, CheckCheck, Trash2, Clock, AlertTriangle, Send, CheckCircle, XCircle, Timer } from "lucide-react";

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";

  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return mins === 1 ? "1 min ago" : `${mins} min ago`;
  }

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  const days = Math.floor(seconds / 86400);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function getNotificationIcon(type) {
  switch (type) {
    case "MISSING_ENTRY":
      return <AlertTriangle className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />;
    case "PENDING_SUBMISSION":
      return <Timer className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />;
    case "SUBMITTED":
      return <Send className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />;
    case "APPROVED":
      return <CheckCircle className="w-5 h-5 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />;
    case "REJECTED":
      return <XCircle className="w-5 h-5 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />;
    case "MANAGER_REMINDER":
      return <Bell className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" />;
    default:
      return <Bell className="w-5 h-5 text-gray-400 drop-shadow-[0_0_8px_rgba(156,163,175,0.5)]" />;
  }
}

function getNotificationBg(type, isRead) {
  if (isRead) return "bg-[#1a1a1a] border-[#2a2a2a]";
  switch (type) {
    case "MISSING_ENTRY":
      return "bg-orange-500/10 border-orange-500/30";
    case "PENDING_SUBMISSION":
      return "bg-yellow-500/10 border-yellow-500/30";
    case "SUBMITTED":
      return "bg-blue-500/10 border-blue-500/30";
    case "APPROVED":
      return "bg-green-500/10 border-green-500/30";
    case "REJECTED":
      return "bg-red-500/10 border-red-500/30";
    case "MANAGER_REMINDER":
      return "bg-purple-500/10 border-purple-500/30";
    default:
      return "bg-[#1a1a1a] border-[#2a2a2a]";
  }
}

function getTypeBadge(type) {
  switch (type) {
    case "MISSING_ENTRY":
      return { label: "Missing Entry", variant: "warning" };
    case "PENDING_SUBMISSION":
      return { label: "Pending", variant: "warning" };
    case "SUBMITTED":
      return { label: "Submitted", variant: "info" };
    case "APPROVED":
      return { label: "Approved", variant: "success" };
    case "REJECTED":
      return { label: "Rejected", variant: "danger" };
    case "MANAGER_REMINDER":
      return { label: "Reminder", variant: "default" };
    default:
      return { label: "Info", variant: "default" };
  }
}

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadNotifications = async (silent = false) => {
    try {
      const response = await fetchNotifications();
      const sorted = (response?.data || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setNotifications(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => loadNotifications(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#ff2d2d] drop-shadow-[0_0_10px_rgba(255,45,45,0.5)]" />
            Notifications
          </h1>
          <p className="text-[#a1a1aa]">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} className="hover:scale-105 active:scale-95">
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "secondary"}
          onClick={() => setFilter("all")}
          className="rounded-full hover:scale-105 active:scale-95"
        >
          All ({notifications.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "unread" ? "primary" : "secondary"}
          onClick={() => setFilter("unread")}
          className="rounded-full hover:scale-105 active:scale-95"
        >
          Unread ({unreadCount})
        </Button>
        <Button
          size="sm"
          variant={filter === "read" ? "primary" : "secondary"}
          onClick={() => setFilter("read")}
          className="rounded-full hover:scale-105 active:scale-95"
        >
          Read ({notifications.length - unreadCount})
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Clock className="w-8 h-8 mx-auto text-[#a1a1aa] animate-spin" />
              <p className="text-[#a1a1aa] mt-2">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto mb-4 text-[#2a2a2a]" />
              <p className="text-[#a1a1aa] text-lg">No notifications</p>
              <p className="text-[#a1a1aa] text-sm mt-1">
                {filter === "all"
                  ? "You're all caught up!"
                  : `No ${filter} notifications`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-[0_0_15px_rgba(255,45,45,0.1)] ${getNotificationBg(
                    n.type,
                    n.isRead
                  )}`}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                >
                  <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium text-sm ${n.isRead ? "text-[#a1a1aa]" : "text-white"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && <Badge variant="primary" className="animate-pulse">New</Badge>}
                      <Badge variant={getTypeBadge(n.type).variant}>
                        {getTypeBadge(n.type).label}
                      </Badge>
                      <span className="text-xs text-[#a1a1aa] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${n.isRead ? "text-[#a1a1aa]" : "text-white"}`}>{n.message}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(n.id);
                        }}
                        className="hover:scale-110 active:scale-95"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(n.id);
                      }}
                      className="hover:scale-110 active:scale-95 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
