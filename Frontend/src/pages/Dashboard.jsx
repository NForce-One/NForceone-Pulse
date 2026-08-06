import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getDashboardStats, getHourDetails, getMissingTimeDetails } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCachedData } from "../hooks/useCachedData";
import { formatHoursToHHMM } from "../utils/timeFormat";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { DrillDownModal } from "../components/ui/DrillDownModal";
import { MissingTimeModal } from "../components/ui/MissingTimeModal";
import { Users, ChevronDown, Clock, Eye, Send, Hourglass, XCircle } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027];
const FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "nextMonth", label: "Next Month" },
  { value: "thisYear", label: "This Year" },
  { value: "customMonth", label: "Custom Month" },
  { value: "customRange", label: "Custom Range" },
];
const METRIC_OPTIONS = [
  { value: "total", label: "Total Hours" },
  { value: "working", label: "Working Hours" },
  { value: "weekend", label: "Weekend Working Hours" },
  { value: "holiday", label: "Holiday Working Hours" },
];

const Sparkline = ({ data }) => {
  const values = Array.isArray(data) ? data.filter((v) => typeof v === "number" && !Number.isNaN(v)) : [];
  if (values.length === 0) {
    return (
      <svg viewBox="0 0 100 24" className="w-full h-6" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 18 L100 18" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  if (values.length === 1) {
    const y = 22 - ((values[0] - min) / range) * 18;
    return (
      <svg viewBox="0 0 100 24" className="w-full h-6" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="50" cy={y} r="2" fill="#9CA3AF" />
      </svg>
    );
  }
  const stepX = 100 / (values.length - 1);
  const points = values.map((v, i) => {
    const x = (i * stepX).toFixed(2);
    const y = (22 - ((v - min) / range) * 18).toFixed(2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox="0 0 100 24" className="w-full h-6" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points.join(" ")} stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const KpiCard = ({ title, value, unit, description, trend, footer }) => (
  <Card className="rounded-[12px] border border-[#B33A2F]/30 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-[200px]">
    <div className="px-4 py-2.5 flex flex-col h-full">
      <p className="text-sm uppercase text-[#374151]">{title}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-2xl leading-none font-bold text-[#1F2937] whitespace-nowrap">{value}</span>
        {unit && <span className="text-sm text-[#6B7280]">{unit}</span>}
      </div>
      <p className="mt-0.5 text-sm text-[#6B7280]">{description}</p>
      <div className="mt-auto pt-2.5">
        <Sparkline data={trend} />
        <p className="mt-1 text-xs font-medium tracking-wide text-[#9CA3AF]">{footer}</p>
      </div>
    </div>
  </Card>
);

const ExtraHoursCard = ({ total, weekdayValue, weekdayPct, weekendValue, weekendPct, holidayValue, holidayPct }) => (
  <Card className="rounded-[12px] border border-[#B33A2F]/30 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-[200px]">
    <div className="px-4 py-2.5 flex flex-col h-full">
      <p className="text-sm uppercase text-[#374151]">Extra Hours Worked</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-2xl leading-none font-bold text-[#B33A2F] whitespace-nowrap">{total}</span>
      </div>
      <p className="mt-0.5 text-sm text-[#6B7280]">hrs beyond 40 hr week</p>
      <div className="mt-auto pt-2 space-y-1">
        <ProgressRow label="Weekday OT" value={weekdayValue} pct={weekdayPct} />
        <ProgressRow label="Weekend" value={weekendValue} pct={weekendPct} />
        <ProgressRow label="Holiday" value={holidayValue} pct={holidayPct} />
      </div>
    </div>
  </Card>
);

const ProgressRow = ({ label, value, pct }) => (
  <div>
    <div className="flex items-center justify-between mb-0.5">
      <span className="text-xs font-medium text-[#111827]">{label}</span>
      <span className="text-xs font-semibold text-[#111827]">{value}</span>
    </div>
    <div className="h-0.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
      <div className="h-full rounded-full bg-[#B33A2F] transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  </div>
);

const DASHBOARD_CARD_CLASS =
  "rounded-[16px] border border-[#B33A2F]/20 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-[300px] overflow-hidden";

const DOUGHNUT_SIZE = 120;
const DOUGHNUT_RADIUS = 45;
const DOUGHNUT_STROKE_WIDTH = 14;
const DOUGHNUT_CIRCUMFERENCE = 2 * Math.PI * DOUGHNUT_RADIUS;

const SubmissionStatusCard = ({ data = [], submittedPct = 0, bottomStats = [] }) => {
  const segments = data.map((seg, idx) => {
    const start = data.slice(0, idx).reduce(
      (sum, s) => sum + (s.pct / 100) * DOUGHNUT_CIRCUMFERENCE,
      0
    );
    const len = (seg.pct / 100) * DOUGHNUT_CIRCUMFERENCE;
    return { ...seg, start, len };
  });

  return (
    <Card className={DASHBOARD_CARD_CLASS}>
      <div className="p-[18px] flex flex-col h-full">
        <h2 className="text-[20px] font-bold leading-none text-[#1F2937]">Submission Status</h2>
        <p className="mt-1 text-[12px] text-[#6B7280]">Where all timesheets stand right now</p>

        <div className="flex items-center gap-5 mt-4">
          <div className="relative flex-shrink-0">
            <svg width={DOUGHNUT_SIZE} height={DOUGHNUT_SIZE} viewBox={`0 0 ${DOUGHNUT_SIZE} ${DOUGHNUT_SIZE}`}>
              <circle
                cx={DOUGHNUT_SIZE / 2}
                cy={DOUGHNUT_SIZE / 2}
                r={DOUGHNUT_RADIUS}
                fill="none"
                stroke="#F4F4F5"
                strokeWidth={DOUGHNUT_STROKE_WIDTH}
              />
              {segments.map((seg) => (
                <circle
                  key={seg.label}
                  cx={DOUGHNUT_SIZE / 2}
                  cy={DOUGHNUT_SIZE / 2}
                  r={DOUGHNUT_RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={DOUGHNUT_STROKE_WIDTH}
                  strokeDasharray={`${seg.len} ${DOUGHNUT_CIRCUMFERENCE}`}
                  strokeDashoffset={-seg.start}
                  transform={`rotate(-90 ${DOUGHNUT_SIZE / 2} ${DOUGHNUT_SIZE / 2})`}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[26px] font-bold leading-none text-[#111827]">{submittedPct}%</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[1.5px] text-[#6B7280]">Submitted</p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            {data.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="text-[12px] text-[#374151] truncate">{row.label}</span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[12px] font-bold text-[#111827]">{row.count}</span>
                  <span className="text-[12px] text-[#9CA3AF] w-8 text-right">{row.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="border-t border-[#E5E7EB] pt-3 grid grid-cols-3 divide-x divide-[#E5E7EB]">
            {bottomStats.map((col) => (
              <div key={col.label} className="px-3 text-center first:pl-0 last:pr-0">
                <p className="text-[24px] font-bold leading-none text-[#111827]">{col.value}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">{col.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const DAILY_HOURS_BARS = [
  { day: "Mon", hours: 8, overtime: false },
  { day: "Tue", hours: 9, overtime: true },
  { day: "Wed", hours: 8, overtime: false },
  { day: "Thu", hours: 7, overtime: false },
  { day: "Fri", hours: 8, overtime: false },
  { day: "Sat", hours: 4, overtime: true },
  { day: "Sun", hours: 0, overtime: false },
];

const HoursLoggedPerDayCard = () => {
  const maxHours = Math.max(...DAILY_HOURS_BARS.map((d) => d.hours), 1);
  return (
  <Card className={DASHBOARD_CARD_CLASS}>
    <div className="p-[18px] flex flex-col h-full">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#111827]">Hours Logged Per Day</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#6B7280]">
              <span className="w-2 h-2 rounded-full bg-[#1F2937]"></span>Working
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#6B7280]">
              <span className="w-2 h-2 rounded-full bg-[#B33A2F]"></span>Overtime
            </span>
          </div>
      </div>
      <div className="flex items-end justify-between gap-2 flex-1 pt-5 pb-1">
        {DAILY_HOURS_BARS.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1 h-full">
            <span className="text-[10px] font-semibold text-[#6B7280]">{d.hours > 0 ? d.hours : ""}</span>
            <div className="w-full max-w-[26px] flex-1 min-h-[40px] rounded-[6px] bg-[#F1F5F9] overflow-hidden flex items-end">
              <div
                className={`w-full rounded-[6px] ${d.overtime ? "bg-[#B33A2F]" : "bg-[#1F2937]"}`}
                style={{ height: `${(d.hours / maxHours) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-[#6B7280]">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  </Card>
);
};

const HoursByClientCard = ({ data = [] }) => (
  <Card className={DASHBOARD_CARD_CLASS}>
    <div className="p-[18px] flex flex-col h-full">
      <p className="text-sm font-semibold text-[#111827]">Hours by Client</p>
      <div className="flex-1 flex flex-col justify-between pt-4">
        {data.length > 0 ? (
          data.map((c) => (
            <ProgressRow key={c.label} label={c.label} value={c.value} pct={c.pct} />
          ))
        ) : (
          <p className="text-xs text-[#9CA3AF] text-center py-6">
            No client hours found for the selected period.
          </p>
        )}
      </div>
    </div>
  </Card>
);

const APPROVAL_QUEUE_MANAGERS = [
  { name: "Alex Morgan", days: 3, count: 5 },
  { name: "Priya Sharma", days: 5, count: 2 },
  { name: "David Kim", days: 1, count: 1 },
];

const ApprovalQueueCard = () => (
  <Card className={DASHBOARD_CARD_CLASS}>
    <div className="p-[18px] flex flex-col h-full">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#111827]">Approval Queue by Manager</p>
        <span className="text-xs font-semibold text-[#B33A2F]">8 pending</span>
      </div>
      <div className="flex-1 flex flex-col justify-between pt-4">
        {APPROVAL_QUEUE_MANAGERS.map((m) => (
          <div key={m.name}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium text-[#111827]">{m.name}</span>
              <span className="text-xs font-semibold text-[#B33A2F]">{m.days}d waiting</span>
            </div>
            <div className="h-0.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
              <div className="h-full rounded-full bg-[#B33A2F]" style={{ width: `${Math.min(m.days * 15, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const ProjectHoursBurnCard = ({ data = [] }) => (
  <Card className={DASHBOARD_CARD_CLASS}>
    <div className="p-[18px] flex flex-col h-full">
      <p className="text-sm font-semibold text-[#111827]">Project Hours Burn</p>
      <div className="flex-1 flex flex-col justify-between pt-4">
        {data.length > 0 ? (
          data.map((p) => (
            <div key={p.name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-[#111827]">{p.name}</span>
                <span className="text-xs font-semibold text-[#111827]">{p.pct}%</span>
              </div>
              <div className="h-0.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                <div className="h-full rounded-full bg-[#1F2937]" style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-[#9CA3AF] text-center py-6">
            No project hours found for the selected period.
          </p>
        )}
      </div>
    </div>
  </Card>
);

const LEAVE_TAKEN = [
  { name: "Ravi Kumar", days: 3 },
  { name: "Sarah Lee", days: 2 },
  { name: "Mike Chen", days: 1 },
];

const LeaveTakenCard = () => (
  <Card className={DASHBOARD_CARD_CLASS}>
    <div className="p-[18px] flex flex-col h-full">
      <p className="text-sm font-semibold text-[#111827]">Leave Taken</p>
      <div className="flex-1 flex flex-col justify-between pt-4">
        {LEAVE_TAKEN.map((l) => (
          <div key={l.name} className="flex items-center gap-3">
            <span className="w-32 flex-shrink-0 text-xs font-medium text-[#111827]">{l.name}</span>
            <div className="flex-1 h-1 rounded-full bg-[#F1F5F9] overflow-hidden">
              <div className="h-full rounded-full bg-[#B33A2F]" style={{ width: `${l.days * 25}%` }} />
            </div>
            <span className="w-7 text-right text-xs font-semibold text-[#111827]">{l.days}d</span>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const QUEUE_TABS = [
  { value: "missing", label: "Missing Timesheets" },
  { value: "stuck", label: "Stuck in Approval" },
  { value: "overtime", label: "Overtime Watchlist" },
];

const QUEUE_ROWS = {
  missing: [
    { employee: "Ananya Rao", team: "Engineering", approver: "Alex Morgan", daysLate: 4, hoursLogged: "—" },
    { employee: "Tom Becker", team: "Design", approver: "Priya Sharma", daysLate: 2, hoursLogged: "—" },
    { employee: "Lena Ortiz", team: "Marketing", approver: "David Kim", daysLate: 1, hoursLogged: "—" },
  ],
  stuck: [
    { employee: "Noah Grant", team: "Engineering", approver: "Alex Morgan", daysLate: 6, hoursLogged: "36h" },
    { employee: "Emma Lawson", team: "Sales", approver: "Priya Sharma", daysLate: 3, hoursLogged: "21h" },
    { employee: "Ivy Chen", team: "Finance", approver: "David Kim", daysLate: 2, hoursLogged: "14h" },
  ],
  overtime: [
    { employee: "Ravi Kumar", team: "Engineering", approver: "Alex Morgan", daysLate: 0, hoursLogged: "52h" },
    { employee: "Maya Patel", team: "Design", approver: "Priya Sharma", daysLate: 0, hoursLogged: "49h" },
    { employee: "Omar Haddad", team: "Sales", approver: "David Kim", daysLate: 0, hoursLogged: "47h" },
  ],
};

const AdminQueueTable = ({ activeTab, onTabChange }) => (
  <Card className="rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
    <div className="px-5 pt-4">
      <p className="text-sm font-semibold text-[#111827]">Timesheet Queues</p>
    </div>
    <div className="px-5 flex items-center gap-6 mt-3 border-b border-[#F1F5F9]">
      {QUEUE_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`-mb-px px-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === tab.value
              ? "text-[#B33A2F] border-[#B33A2F]"
              : "text-[#6B7280] border-transparent hover:text-[#111827]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280] whitespace-nowrap">Employee</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280] whitespace-nowrap">Team</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280] whitespace-nowrap">Approver</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280] whitespace-nowrap">Days Late</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280] whitespace-nowrap">Hours Logged</th>
          </tr>
        </thead>
        <tbody>
          {QUEUE_ROWS[activeTab].map((row) => (
            <tr key={row.employee} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
              <td className="px-5 py-3 text-[#111827] font-medium whitespace-nowrap">{row.employee}</td>
              <td className="px-5 py-3 text-[#374151]">{row.team}</td>
              <td className="px-5 py-3 text-[#374151]">{row.approver}</td>
              <td className="px-5 py-3">
                {row.daysLate > 0 ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    {row.daysLate} days
                  </span>
                ) : (
                  <span className="text-[#6B7280]">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-[#374151]">{row.hoursLogged}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const dt = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return dateStr;
  return `${String(dt.getDate()).padStart(2, "0")} ${SHORT_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

export const Dashboard = () => {
  const { user } = useAuth();

  const [filterPeriod, setFilterPeriod] = useState("thisMonth");
  const [customMonth, setCustomMonth] = useState(new Date().getMonth());
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dashboardView, setDashboardView] = useState("self");
  const [selectedMetric, setSelectedMetric] = useState("total");
  const [activeQueueTab, setActiveQueueTab] = useState("missing");

  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    type: "",
    data: [],
    totals: { normalHours: 0, weekendHours: 0, holidayHours: 0, totalExtraHours: 0 },
    isLoading: false,
    date: "",
  });

  const [missingTime, setMissingTime] = useState({ employees: [], totalCount: 0 });
  const [missingTimeModal, setMissingTimeModal] = useState({ isOpen: false, employee: null });

  const getFilterDateRange = useCallback(() => {
    const now = new Date();
    let start, end;

    switch (filterPeriod) {
      case "today": {
        const today = toDateStr(now);
        return { startDate: today, endDate: today };
      }
      case "thisWeek": {
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "lastWeek": {
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "thisMonth": {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "lastMonth": {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "nextMonth": {
        start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "thisYear": {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "customMonth": {
        start = new Date(customYear, customMonth, 1);
        end = new Date(customYear, customMonth + 1, 0);
        return { startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      case "customRange": {
        return { startDate: fromDate, endDate: toDate };
      }
      default:
        return { startDate: "", endDate: "" };
    }
  }, [filterPeriod, customMonth, customYear, fromDate, toDate]);

  const buildParams = () => {
    const { startDate, endDate } = getFilterDateRange();
    const p = {};
    if (startDate && endDate) { p.startDate = startDate; p.endDate = endDate; }
    if (user?.role === "MANAGER" && dashboardView === "self") p.self = true;
    return p;
  };

  const DASHBOARD_CACHE_VERSION = "v2";
  const filterKey = `${DASHBOARD_CACHE_VERSION}-${filterPeriod}-${customMonth}-${customYear}-${fromDate}-${toDate}-${dashboardView}`;
  const filterParams = useMemo(() => buildParams(), [filterKey]);
  const { data: rawStats, isLoading, silentRefresh } = useCachedData(`dashboard_${filterKey}`, () => getDashboardStats(filterParams));
  const stats = rawStats ?? {};

  const openHourDetails = async (title, type, date = "") => {
    const entries = stats?.dashboardEntries;
    if (Array.isArray(entries) && entries.length > 0 && !date) {
      let filteredEntries = [];
      if (type === "total") {
        filteredEntries = entries;
      } else if (type === "working") {
        filteredEntries = entries.filter(e => e.type === "working");
      } else if (type === "weekend") {
        filteredEntries = entries.filter(e => e.type === "weekend");
      } else if (type === "holiday") {
        filteredEntries = entries.filter(e => e.type === "holiday");
      } else if (type === "draft") {
        filteredEntries = entries.filter(e => e.approvalStatus === "DRAFT");
      }
      const nHours = filteredEntries.filter(e => e.type === "working").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      const wHours = filteredEntries.filter(e => e.type === "weekend").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      const hHours = filteredEntries.filter(e => e.type === "holiday").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      setModalState({
        isOpen: true, title, type,
        data: filteredEntries,
        totals: { normalHours: nHours, weekendHours: wHours, holidayHours: hHours, totalExtraHours: wHours + hHours },
        isLoading: false, date,
      });
      return;
    }
    setModalState({ isOpen: true, title, type, data: [], totals: { normalHours: 0, weekendHours: 0, holidayHours: 0, totalExtraHours: 0 }, isLoading: true, date });
    try {
      let startDate, endDate;
      if (date) {
        startDate = date;
        endDate = date;
      } else {
        const range = getFilterDateRange();
        startDate = range.startDate;
        endDate = range.endDate;
      }
      const params = { type, startDate, endDate };
      if (user?.role === "MANAGER" && dashboardView === "self") {
        params.self = true;
      }
      if (!startDate || !endDate) {
        setModalState((prev) => ({ ...prev, data: [], isLoading: false }));
        return;
      }
      const response = await getHourDetails(params);
      if (!response || typeof response !== "object") {
        setModalState((prev) => ({ ...prev, data: [], isLoading: false }));
        return;
      }
      const respEntries = response?.entries ?? (Array.isArray(response) ? response : []);
      const totals = {
        normalHours: response?.normalHours ?? 0,
        weekendHours: response?.weekendHours ?? 0,
        holidayHours: response?.holidayHours ?? 0,
        totalExtraHours: response?.totalExtraHours ?? 0,
      };
      setModalState((prev) => ({ ...prev, data: Array.isArray(respEntries) ? respEntries : [], totals, isLoading: false }));
    } catch (err) {
      console.error("Failed to load hour details:", err);
      setModalState((prev) => ({ ...prev, data: [], isLoading: false }));
    }
  };

  const handleDateChange = (date) => {
    if (modalState.isOpen) {
      openHourDetails(modalState.title, modalState.type, date);
    }
  };

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const openMissingTimeModal = useCallback((employee) => {
    setMissingTimeModal({ isOpen: true, employee });
  }, []);

  const closeMissingTimeModal = useCallback(() => {
    setMissingTimeModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => silentRefresh(), 30000);
    const handleFocus = () => silentRefresh();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [silentRefresh]);

  useEffect(() => {
    if (user?.role === "MANAGER" && dashboardView === "team") {
      const { startDate, endDate } = getFilterDateRange();
      if (startDate && endDate) {
        getMissingTimeDetails({ startDate, endDate })
          .then((res) => {
            if (res && res.employees) {
              setMissingTime(res);
            }
          })
          .catch(() => setMissingTime({ employees: [], totalCount: 0 }));
      }
    } else {
      setMissingTime({ employees: [], totalCount: 0 });
    }
  }, [filterKey, user, dashboardView, getFilterDateRange]);

  const [expandedDates, setExpandedDates] = useState(new Set());

  const toggleExpand = (rawDate) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(rawDate)) next.delete(rawDate);
      else next.add(rawDate);
      return next;
    });
  };

  const filteredDashboardData = useMemo(() => {
    const entries = Array.isArray(stats?.dailySummary) ? stats.dailySummary : [];
    let filtered = [];
    if (selectedMetric === "total") {
      filtered = entries;
    } else if (selectedMetric === "working") {
      filtered = entries.filter(e => e.type === "working");
    } else if (selectedMetric === "weekend") {
      filtered = entries.filter(e => e.isWeekend);
    } else if (selectedMetric === "holiday") {
      filtered = entries.filter(e => e.isHoliday);
    }
    const totalHours = filtered.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    return {
      entries: filtered,
      totals: { totalHours },
    };
  }, [stats?.dailySummary, selectedMetric]);

  const weekendExtraVal = Number(stats.weekendHours || 0);
  const holidayExtraVal = Number(stats.holidayHours || 0);
  const extraMaxVal = Math.max(weekendExtraVal, holidayExtraVal, 1);
  const weekendExtraPct = Math.round((weekendExtraVal / extraMaxVal) * 100);
  const holidayExtraPct = Math.round((holidayExtraVal / extraMaxVal) * 100);

  const kpiEntries = Array.isArray(stats?.dashboardEntries) ? stats.dashboardEntries : [];
  const submittedCount = kpiEntries.filter((e) => e.approvalStatus === "SUBMITTED").length;
  const rejectedCount = kpiEntries.filter((e) => e.approvalStatus === "REJECTED").length;
  const pendingApprovals = Number(stats.pendingApprovals || 0);
  const hoursLogged =
    selectedMetric === "working"
      ? Number(stats.normalHours || 0)
      : selectedMetric === "weekend"
        ? Number(stats.weekendHours || 0)
        : selectedMetric === "holiday"
          ? Number(stats.holidayHours || 0)
          : Number(stats.totalWeekHours || 0);

  const trendData = Array.isArray(stats?.dailySummary)
    ? stats.dailySummary.map((d) => Number(d.totalHours || 0))
    : [];

  const getFilterLabel = () => {
    switch (filterPeriod) {
      case "today": return "Today";
      case "thisWeek": return "This Week";
      case "lastWeek": return "Last Week";
      case "thisMonth": return "This Month";
      case "lastMonth": return "Last Month";
      case "nextMonth": return "Next Month";
      case "thisYear": return "This Year";
      case "customMonth": return `${MONTHS[customMonth]} ${customYear}`;
      case "customRange": {
        const fromLabel = formatDisplayDate(fromDate);
        const toLabel = formatDisplayDate(toDate);
        if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
        return fromLabel || toLabel || "Custom Range";
      }
      default: return "";
    }
  };
  const filterLabel = getFilterLabel();

  const submissionStatusData = (() => {
    const entries = Array.isArray(stats?.dashboardEntries) ? stats.dashboardEntries : [];
    let approved = 0;
    let pending = 0;
    let draft = 0;
    let rejected = 0;
    const usersWithEntries = new Set();
    entries.forEach((e) => {
      if (e.userName) usersWithEntries.add(e.userName);
      if (e.approvalStatus === "APPROVED") approved += 1;
      else if (e.approvalStatus === "SUBMITTED") pending += 1;
      else if (e.approvalStatus === "DRAFT") draft += 1;
      else if (e.approvalStatus === "REJECTED") rejected += 1;
    });
    const neverStarted = Math.max(Number(stats.totalUsers || 0) - usersWithEntries.size, 0);
    const statuses = [
      { label: "Approved", count: approved, color: "#3F3F46" },
      { label: "Pending Approval", count: pending, color: "#9CA3AF" },
      { label: "Draft", count: draft, color: "#D1D5DB" },
      { label: "Never Started", count: neverStarted, color: "#DC2626" },
      { label: "Rejected / Returned", count: rejected, color: "#EAB308" },
    ];
    const total = statuses.reduce((sum, s) => sum + s.count, 0);
    return {
      data: statuses.map((s) => ({
        ...s,
        pct: total > 0 ? Math.round((s.count / total) * 100) : 0,
      })),
      submittedPct: total > 0 ? Math.round(((approved + pending + rejected) / total) * 100) : 0,
    };
  })();

  const submissionBottomStats = [
    { label: "Total Users", value: String(stats.totalUsers || 0) },
    { label: "Active Projects", value: String(stats.totalProjects || 0) },
    { label: "Active Clients", value: String(stats.totalClients || 0) },
  ];

  const clientHoursData = (() => {
    const entries = Array.isArray(stats?.dashboardEntries) ? stats.dashboardEntries : [];
    const clientHoursMap = new Map();
    let totalHours = 0;
    entries.forEach((e) => {
      const client = e.clientWorked && e.clientWorked !== "-" ? e.clientWorked : "Unknown";
      const hours = Number(e.hoursWorked || 0);
      clientHoursMap.set(client, (clientHoursMap.get(client) || 0) + hours);
      totalHours += hours;
    });
    return [...clientHoursMap.entries()]
      .map(([label, hours]) => ({
        label,
        value: formatHoursToHHMM(hours),
        pct: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  })();

  const projectBurnData = (() => {
    const entries = Array.isArray(stats?.dashboardEntries) ? stats.dashboardEntries : [];
    const projectHoursMap = new Map();
    let totalHours = 0;
    entries.forEach((e) => {
      const project = e.projectWorked && e.projectWorked !== "-" ? e.projectWorked : "Unknown";
      const hours = Number(e.hoursWorked || 0);
      projectHoursMap.set(project, (projectHoursMap.get(project) || 0) + hours);
      totalHours += hours;
    });
    return [...projectHoursMap.entries()]
      .map(([name, hours]) => ({
        name,
        pct: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  })();

  const filterSelectClass =
    "appearance-none bg-white border border-[#E5E7EB] text-sm text-[#111827] h-10 rounded-[10px] pl-3 pr-9 focus:outline-none focus:border-[#B33A2F]/50 focus:ring-2 focus:ring-[#B33A2F]/15 cursor-pointer hover:border-[#B33A2F]/30 transition-colors";
  const filterInputClass =
    "bg-white border border-[#E5E7EB] text-sm text-[#111827] h-10 rounded-[10px] px-2.5 focus:outline-none focus:border-[#B33A2F]/50 focus:ring-2 focus:ring-[#B33A2F]/15 cursor-pointer hover:border-[#B33A2F]/30 transition-colors";

  const detailsThClass = isAdmin
    ? "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280] whitespace-nowrap"
    : "px-4 py-3 text-left text-sm font-semibold text-[#374151] whitespace-nowrap";
  const detailsTdClass = isAdmin ? "px-5 py-3.5" : "px-4 py-3";

  return (
    <div className={isAdmin ? "space-y-8" : "space-y-6"}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {isAdmin && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B33A2F] mb-1.5">Admin Overview</p>
          )}
          <h1 className={isAdmin ? "text-[32px] font-bold tracking-tight text-[#111827] leading-none" : "text-2xl font-bold text-[#1E293B]"}>
            Dashboard
          </h1>
          <p className="mt-3 text-sm text-[#6B7280]">Welcome back, {user?.name || "User"}!</p>
          {isAdmin && (
            <p className="mt-1 text-[13px] font-medium text-[#6B7280]">
              <span className="font-semibold text-[#111827]">{stats.totalUsers || 0}</span> Users
              <span className="mx-2 text-[#D1D5DB]">&bull;</span>
              <span className="font-semibold text-[#111827]">{stats.totalProjects || 0}</span> Projects
              <span className="mx-2 text-[#D1D5DB]">&bull;</span>
              <span className="font-semibold text-[#111827]">{stats.totalClients || 0}</span> Clients
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end">
      {user?.role === "MANAGER" && (
            <div className="relative">
              <select
                value={dashboardView}
                onChange={(e) => setDashboardView(e.target.value)}
                className={filterSelectClass}
              >
                <option value="self">Self Dashboard</option>
                <option value="team">Team Dashboard</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
          <div className="relative">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className={filterSelectClass}
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className={filterSelectClass}
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {filterPeriod === "customMonth" && (
            <>
              <select
                value={customMonth}
                onChange={(e) => setCustomMonth(Number(e.target.value))}
                className={filterSelectClass}
              >
                {MONTHS.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
              <select
                value={customYear}
                onChange={(e) => setCustomYear(Number(e.target.value))}
                className={filterSelectClass}
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </>
          )}
          {filterPeriod === "customRange" && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#6B7280]">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={filterInputClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#6B7280]">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={filterInputClass}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      {isLoading ? (
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Card key={n} className="animate-pulse border-[#E2E8F0] bg-white rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.06)]">
              <div className="p-6 space-y-3">
                <div className="h-3 w-2/3 bg-[#E2E8F0] rounded"></div>
                <div className="h-8 w-1/3 bg-[#E2E8F0] rounded"></div>
                <div className="h-3 w-1/2 bg-[#E2E8F0] rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : isAdmin ? (
        <>
          <div className="grid gap-5 grid-cols-2 lg:grid-cols-5">
            <KpiCard
              title="Hours Logged"
              value={Math.round(hoursLogged)}
              unit="hrs"
              description="Average hours per employee"
              trend={trendData}
              footer={filterLabel}
            />
            <KpiCard
              title="Submitted"
              value={submittedCount}
              description="Submitted timesheets"
              trend={trendData}
              footer={filterLabel}
            />
            <KpiCard
              title="Awaiting Approval"
              value={pendingApprovals > 0 ? pendingApprovals : submittedCount}
              description="Awaiting manager approval"
              trend={trendData}
              footer={filterLabel}
            />
            <KpiCard
              title="Rejected"
              value={rejectedCount}
              description="Needs employee rework"
              trend={trendData}
              footer={filterLabel}
            />
            <ExtraHoursCard
              total={formatHoursToHHMM(stats.totalExtraHours || 0)}
              weekdayValue="—"
              weekdayPct={0}
              weekendValue={formatHoursToHHMM(stats.weekendHours || 0)}
              weekendPct={weekendExtraPct}
              holidayValue={formatHoursToHHMM(stats.holidayHours || 0)}
              holidayPct={holidayExtraPct}
            />
          </div>
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Total Hours", type: "total", value: stats.totalWeekHours || 0 },
            { title: "Working Hours", type: "working", value: stats.normalHours || 0 },
            { title: "Weekend Working Hours", type: "weekend", value: stats.weekendHours || 0 },
            { title: "Holiday Working Hours", type: "holiday", value: stats.holidayHours || 0 },
            ].map((card, index) => (
            <Card
              key={card.title}
              className="border border-[#B33A2F]/30 hover:shadow-[0_0_20px_rgba(179,58,47,0.08)] hover:border-[#B33A2F]/30 transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => openHourDetails(card.title, card.type)}
            >
              <div className="flex items-center justify-between p-6 pb-2">
                <span className="text-sm text-[#374151] transition-colors">
                  {card.title}
                </span>
              </div>
              <div className="p-6 pt-0">
                <div className="text-2xl font-bold text-[#1F2937]">
                  {formatHoursToHHMM(card.value)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (isAdmin ? (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <SubmissionStatusCard
              data={submissionStatusData.data}
              submittedPct={submissionStatusData.submittedPct}
              bottomStats={submissionBottomStats}
            />
            <HoursLoggedPerDayCard />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <HoursByClientCard data={clientHoursData} />
            <ProjectHoursBurnCard data={projectBurnData} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <ApprovalQueueCard />
            <LeaveTakenCard />
          </div>
          <div>
            <AdminQueueTable activeTab={activeQueueTab} onTabChange={setActiveQueueTab} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card
            className={
              isAdmin
                ? "rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)] overflow-hidden"
                : ""
            }
          >
            <CardHeader
              className={
                isAdmin
                  ? "flex flex-row items-center justify-between gap-4 px-6 py-5 border-b border-[#E5E7EB]"
                  : ""
              }
            >
              <CardTitle className={isAdmin ? "text-[15px] font-semibold tracking-tight text-[#111827]" : "text-[#1E293B]"}>
                {METRIC_OPTIONS.find(m => m.value === selectedMetric)?.label || "Dashboard"} Details
              </CardTitle>
              {isAdmin && (
                <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] whitespace-nowrap">
                  {filteredDashboardData.entries.length} days &middot; {formatHoursToHHMM(filteredDashboardData.totals.totalHours)} logged
                </span>
              )}
            </CardHeader>
            <CardContent className={isAdmin ? "p-0" : ""}>
              {filteredDashboardData.entries.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-[#374151]">
                  No entries found for the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={isAdmin ? "bg-[#F9FAFB] border-b border-[#E5E7EB]" : "bg-[#F8FAFC] border-b border-[#E2E8F0]"}>
                      <tr>
                        {(user?.role === "MANAGER" && dashboardView === "team") && (
                          <th className={detailsThClass}>Employee Name</th>
                        )}
                        <th className={detailsThClass}>Date</th>
                        <th className={detailsThClass}>Day</th>
                        <th className={detailsThClass}>Total Hours</th>
                        <th className={detailsThClass}>Reported To</th>
                        <th className={detailsThClass}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDashboardData.entries.map((day, idx) => (
                        <React.Fragment key={day.rawDate || idx}>
                          <tr
                            className={`border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150 ${day.isWeekend || day.isHoliday ? "bg-amber-50 border-l-4 border-l-amber-500" : ""}`}
                          >
                            {(user?.role === "MANAGER" && dashboardView === "team") && (
                              <td className={`${detailsTdClass} text-[#111827] whitespace-nowrap font-medium`}>{day.userName || "-"}</td>
                            )}
                            <td className={`${detailsTdClass} text-[#111827] whitespace-nowrap`}>
                              <div className="flex items-center gap-2">
                                {day.projectCount > 1 && (
                                  <button
                                    onClick={() => toggleExpand(day.rawDate)}
                                    className="w-4 h-4 flex items-center justify-center text-[#6B7280] hover:text-[#111827] transition-colors"
                                  >
                                    <ChevronDown
                                      className={`w-4 h-4 transition-transform duration-200 ${expandedDates.has(day.rawDate) ? "rotate-0" : "-rotate-90"}`}
                                    />
                                  </button>
                                )}
                                {day.projectCount <= 1 && <span className="w-4" />}
                                <span>{day.date || day.rawDate || "-"}</span>
                              </div>
                            </td>
                            <td className={`${detailsTdClass} text-[#111827] whitespace-nowrap`}>{day.day || "-"}</td>
                            {day.isMissing ? (
                              <>
                                <td className={`${detailsTdClass} text-[#9CA3AF]`}>No Entries Logged</td>
                                <td className={detailsTdClass}></td>
                                <td className={detailsTdClass}></td>
                              </>
                            ) : (
                              <td className={`${detailsTdClass} text-[#111827] whitespace-nowrap font-semibold`}>{formatHoursToHHMM(day.totalHours)}</td>
                            )}
                            {!day.isMissing && <td className={`${detailsTdClass} text-[#111827] whitespace-nowrap`}>{day.reportedTo || "-"}</td>}
                            {!day.isMissing && (
                              <td className={`${detailsTdClass} whitespace-nowrap`}>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  day.status === "APPROVED" ? "bg-green-50 text-green-700 border border-green-200" :
                                  day.status === "SUBMITTED" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                  day.status === "REJECTED" ? "bg-red-50 text-red-700 border border-red-200" :
                                  day.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                  "bg-gray-50 text-gray-600 border border-gray-200"
                                }`}>
                                  {day.status === "APPROVED" ? "Approved" :
                                   day.status === "SUBMITTED" ? "Submitted" :
                                   day.status === "REJECTED" ? "Rejected" :
                                   day.status === "PENDING" ? "Pending" :
                                   "Draft"}
                                </span>
                              </td>
                            )}
                          </tr>
                          {expandedDates.has(day.rawDate) && (
                            <tr>
                              <td colSpan={user?.role === "MANAGER" && dashboardView === "team" ? 6 : 5} className="px-0 py-0">
                                <div className="bg-[#FAFBFC]">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-[#E2E8F0]">
                                        <th className="px-4 py-2 text-left font-semibold text-[#374151] pl-12">Project Name</th>
                                        <th className="px-4 py-2 text-left font-semibold text-[#374151]">Client</th>
                                        <th className="px-4 py-2 text-left font-semibold text-[#374151]">Hours</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {day.projects.map((proj, pIdx) => (
                                        <tr key={pIdx} className="border-b border-[#E2E8F0]">
                                          <td className="px-4 py-2 text-[#1E293B] pl-12">{proj.projectWorked}</td>
                                          <td className="px-4 py-2 text-[#1E293B]">{proj.clientWorked}</td>
                                          <td className="px-4 py-2 text-[#1E293B] font-medium">{formatHoursToHHMM(proj.hoursWorked)}</td>
                                        </tr>
                                      ))}
                                      <tr className="bg-[#F1F5F9]">
                                        <td colSpan={2} className="px-4 py-2 text-[#1E293B] font-semibold pl-12">Total</td>
                                        <td className="px-4 py-2 text-[#1E293B] font-semibold">{formatHoursToHHMM(day.totalHours)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}

      {user?.role === "MANAGER" && dashboardView === "team" && stats.teamData && stats.teamData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-[#1E293B] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#B33A2F]" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151]">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151]">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151]">Total Hours</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151]">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.teamData.map((member) => (
                    <tr key={member.userId} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                      <td className="px-4 py-3 text-[#1E293B] font-medium">{member.name}</td>
                      <td className="px-4 py-3 text-[#374151]">{member.email}</td>
                      <td className="px-4 py-3 text-[#1E293B]">{formatHoursToHHMM(member.weekHours)}</td>
                      <td className="px-4 py-3 text-[#374151]">{member.entriesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === "MANAGER" && dashboardView === "team" && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#1E293B]">Top 5 Employees by Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151]">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151]">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.topEmployees || []).length > 0 ? (
                        stats.topEmployees.map((emp) => (
                          <tr key={emp.userId} className="border-b border-[#E2E8F0]">
                            <td className="px-4 py-3 text-[#1E293B]">{emp.name}</td>
                            <td className="px-4 py-3 text-[#1E293B]">{formatHoursToHHMM(emp.weekHours)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-[#374151]">
                            No employee hours available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1E293B]">Employees with Missing Time</CardTitle>
                  {missingTime.totalCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      {missingTime.totalCount} Employee{missingTime.totalCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151] whitespace-nowrap">Employee</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151] whitespace-nowrap">Week</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151] whitespace-nowrap">Missing Days</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151] whitespace-nowrap">View Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingTime.employees.length > 0 ? (
                        missingTime.employees.map((emp) => (
                          <tr key={emp.userId} className="border-b border-[#E2E8F0]">
                            <td className="px-4 py-3 text-[#1E293B] font-medium whitespace-nowrap">{emp.name}</td>
                            <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{emp.week}</td>
                            <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{emp.missingDays} Day{emp.missingDays !== 1 ? "s" : ""}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button
                                onClick={() => openMissingTimeModal(emp)}
                                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#B33A2F] hover:bg-[#F1F5F9] transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-[#374151]">
                            No missing time entries found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E293B]">Top Projects by Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151]">Project</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#374151]">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.topProjects || []).length > 0 ? (
                      stats.topProjects.map((proj, idx) => (
                        <tr key={idx} className="border-b border-[#E2E8F0]">
                          <td className="px-4 py-3 text-[#1E293B]">{proj.name}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{formatHoursToHHMM(proj.hours)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-[#374151]">
                          No project hours data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>


        </>
      )}

      <DrillDownModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        type={modalState.type}
        data={modalState.data}
        totals={modalState.totals}
        isLoading={modalState.isLoading}
        userRole={user?.role}
        date={modalState.date}
        onDateChange={handleDateChange}
      />

      <MissingTimeModal
        isOpen={missingTimeModal.isOpen}
        onClose={closeMissingTimeModal}
        employee={missingTimeModal.employee}
        dateRange={`${getFilterDateRange().startDate} to ${getFilterDateRange().endDate}`}
      />
    </div>
  );
};
