import React, { useState, useEffect } from "react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} from "../services/api";
import { useCachedData, clearPageCache } from "../hooks/useCachedData";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Bell, CheckCheck, Trash2, Clock, Check, X, Info, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

// Per-type visual theme used by the redesigned cards. Only presentation
// styling lives here — the notification data itself is never modified.
function getTypeTheme(type) {
  switch (type) {
    case "APPROVED":
      return {
        circle: "bg-green-100 text-green-600",
        dot: "bg-green-500",
        link: "text-green-600 hover:underline underline-offset-2",
      };
    case "REJECTED":
      return {
        circle: "bg-red-100 text-red-600",
        dot: "bg-red-500",
        link: "text-red-600 hover:underline underline-offset-2",
      };
    case "SUBMITTED":
    case "RESUBMITTED":
      return {
        circle: "bg-blue-100 text-blue-600",
        dot: "bg-blue-500",
        link: "text-blue-600 hover:underline underline-offset-2",
      };
    case "MISSING_ENTRY":
    case "PENDING_SUBMISSION":
    case "MANAGER_REMINDER":
      return {
        circle: "bg-orange-100 text-orange-600",
        dot: "bg-orange-500",
        link: "text-orange-600 hover:underline underline-offset-2",
      };
    default:
      return {
        circle: "bg-slate-100 text-slate-600",
        dot: "bg-slate-400",
        link: "text-slate-600 hover:underline underline-offset-2",
      };
  }
}

function getCircleIcon(type) {
  switch (type) {
    case "APPROVED":
      return <Check className="w-4 h-4" />;
    case "REJECTED":
      return <X className="w-4 h-4" />;
    case "SUBMITTED":
    case "RESUBMITTED":
      return <Info className="w-4 h-4" />;
    case "MISSING_ENTRY":
    case "PENDING_SUBMISSION":
    case "MANAGER_REMINDER":
      return <Bell className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
}

function getNotificationBg(type, isRead) {
  if (isRead) return "bg-[#F8FAFC] border-[#E2E8F0]";
  switch (type) {
    case "MISSING_ENTRY":
      return "bg-orange-50 border-orange-200";
    case "PENDING_SUBMISSION":
      return "bg-yellow-50 border-yellow-200";
    case "SUBMITTED":
      return "bg-blue-50 border-blue-200";
    case "RESUBMITTED":
      return "bg-amber-50 border-amber-200";
    case "APPROVED":
      return "bg-green-50 border-green-200";
    case "REJECTED":
      return "bg-red-50 border-red-200";
    case "MANAGER_REMINDER":
      return "bg-purple-50 border-purple-200";
    default:
      return "bg-[#F8FAFC] border-[#E2E8F0]";
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
    case "RESUBMITTED":
      return { label: "Re-Submitted", variant: "warning" };
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

function formatWeekRange(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s*[-–—]\s*(\d{4}-\d{2}-\d{2})$/);
  if (!match) return value;
  const parsePart = (p) => {
    const [y, m, d] = p.split("-");
    return {
      year: y,
      date: new Date(Number(y), Number(m) - 1, Number(d)),
    };
  };
  const monthDay = (date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const start = parsePart(match[1]);
  const end = parsePart(match[2]);
  if (start.year === end.year) {
    return `${monthDay(start.date)} – ${monthDay(end.date)}, ${start.year}`;
  }
  return `${monthDay(start.date)}, ${start.year} – ${monthDay(end.date)}, ${end.year}`;
}

// Splits an existing notification message into a short description and its
// labelled detail rows (Week, Approved By, Rejected By, Submitted To, ...).
// Only data already present in the message is used — nothing new is invented.
const DETAIL_LABELS = ["Week", "Approved By", "Rejected By", "Submitted To", "Reason"];

function parseNotificationMessage(message) {
  const descriptionLines = [];
  const details = [];
  let activeLabel = null;
  let currentDetail = null;

  for (const rawLine of (message || "").split("\n")) {
    const line = rawLine.trim();
    if (line === "") {
      activeLabel = null;
      currentDetail = null;
      continue;
    }
    const colonIndex = line.indexOf(":");
    const labelCandidate = colonIndex > 0 ? line.slice(0, colonIndex).trim() : "";
    if (DETAIL_LABELS.includes(labelCandidate)) {
      activeLabel = labelCandidate;
      currentDetail = { label: activeLabel, value: line.slice(colonIndex + 1).trim() };
      details.push(currentDetail);
      continue;
    }
    if (activeLabel && currentDetail) {
      currentDetail.value = currentDetail.value
        ? `${currentDetail.value} ${line}`
        : line;
    } else {
      descriptionLines.push(line);
    }
  }

  return {
    description: descriptionLines.join(" "),
    details: details.map((d) => ({
      label: d.label,
      value: d.label === "Week" ? formatWeekRange(d.value) : d.value,
    })),
  };
}

export const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");

  const {
    data: fetchedNotifications,
    isLoading,
  } = useCachedData("notifications", fetchNotifications);

  useEffect(() => {
    if (fetchedNotifications) {
      const sorted = (Array.isArray(fetchedNotifications) ? fetchedNotifications : []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setNotifications(sorted);
    }
  }, [fetchedNotifications]);

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetchNotifications();
        const sorted = (response?.data || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setNotifications(sorted);
        sessionStorage.setItem("c_notifications", JSON.stringify({ data: sorted, timestamp: Date.now() }));
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      clearPageCache("notifications");
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      clearPageCache("notifications");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      clearPageCache("notifications");
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
          <h1 className="text-[32px] font-bold text-[#1E293B] leading-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#B33A2F]" />
            Notifications
          </h1>
          <p className="text-[#64748B]">
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
              <Clock className="w-8 h-8 mx-auto text-[#64748B] animate-spin" />
              <p className="text-[#64748B] mt-2">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto mb-4 text-[#E2E8F0]" />
              <p className="text-[#64748B] text-lg">No notifications</p>
              <p className="text-[#64748B] text-sm mt-1">
                {filter === "all"
                  ? "You're all caught up!"
                  : `No ${filter} notifications`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => {
                const theme = getTypeTheme(n.type);
                const { description, details } = parseNotificationMessage(n.message);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-4 rounded-2xl border shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 ${getNotificationBg(
                      n.type,
                      n.isRead
                    )}`}
                    onClick={() => !n.isRead && handleMarkRead(n.id)}
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${theme.circle}`}>
                        {getCircleIcon(n.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-semibold leading-snug ${n.isRead ? "text-[#64748B]" : "text-[#1E293B]"}`}>
                          {n.title}
                        </h3>
                        {!n.isRead && <Badge variant="primary" className="animate-pulse">New</Badge>}
                        <Badge variant={getTypeBadge(n.type).variant}>
                          {getTypeBadge(n.type).label}
                        </Badge>
                        <div className="ml-auto flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-[#64748B] flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {timeAgo(n.createdAt)}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                          <button
                            type="button"
                            title="View Timesheet"
                            onClick={() =>
                              navigate(
                                n.weekStartDate
                                  ? `/employee/my-timesheet?weekStart=${n.weekStartDate}`
                                  : "/employee/my-timesheet"
                              )
                            }
                            className={`inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer ${theme.link}`}
                          >
                            View Timesheet
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {description && (
                        <p className={`text-[13px] leading-snug mt-1 ${n.isRead ? "text-[#64748B]" : "text-[#334155]"}`}>
                          {description}
                        </p>
                      )}

                      {details.length > 0 && (
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 mt-1.5 text-xs">
                          {details.map((d, idx) => (
                            <div key={idx} className="flex items-baseline gap-1">
                              <span className="font-medium text-[#64748B]">{d.label}:</span>
                              <span className="text-[#1E293B]">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-2">
                        {!n.isRead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(n.id);
                            }}
                            className="h-7 w-7 p-0 hover:scale-110 active:scale-95"
                            title="Mark as read"
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
                          className="h-7 w-7 p-0 hover:scale-110 active:scale-95 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
