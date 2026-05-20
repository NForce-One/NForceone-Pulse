import Holiday from "../models/holiday.model.js";

let HOLIDAY_MAP = new Map();
let IS_INITIALIZED = false;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toDateStrFromAny = (d) => {
  if (typeof d === 'string') return d.split('T')[0];
  if (d instanceof Date && !isNaN(d)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(d);
};

const toLocalDate = (dateStr) => {
  if (typeof dateStr !== 'string') return new Date(NaN);
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const getHolidayName = (dateStr) => {
  const key = toDateStrFromAny(dateStr);
  return HOLIDAY_MAP.get(key) || null;
};

export const isHoliday = (dateStr) => {
  const key = toDateStrFromAny(dateStr);
  return HOLIDAY_MAP.has(key);
};

export const isWeekend = (dateStr) => {
  const str = toDateStrFromAny(dateStr);
  const dt = toLocalDate(str);
  const day = dt.getDay();
  return day === 0 || day === 6;
};

const toDateStr = (d) => {
  if (typeof d === 'string') return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const initHolidays = async () => {
  try {
    const holidays = await Holiday.findAll({ attributes: ['date', 'name'] });
    HOLIDAY_MAP = new Map(holidays.map(h => [toDateStr(h.date), h.name]));
    IS_INITIALIZED = true;
    console.log(`[holidayConfig] Loaded ${HOLIDAY_MAP.size} holidays:`, [...HOLIDAY_MAP.keys()].join(', '));
  } catch (err) {
    console.error('[holidayConfig] Failed to load holidays:', err.message);
    HOLIDAY_MAP = new Map();
    IS_INITIALIZED = true;
  }
};

export const reloadHolidays = async () => {
  await initHolidays();
};

const DEFAULT_HOLIDAYS = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal' },
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-04', name: 'Holi' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi' },
  { date: '2026-10-02', name: 'Gandhi Jayanti' },
  { date: '2026-10-20', name: 'Dussehra' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-11-08', name: 'Diwali' },
  { date: '2026-03-21', name: 'Ramzan' },
];

export const seedDefaultHolidays = async () => {
  const count = await Holiday.count();
  if (count === 0) {
    await Holiday.bulkCreate(DEFAULT_HOLIDAYS);
  }
};

export const classifyEntry = (dateStr) => {
  if (isHoliday(dateStr)) return "holiday";
  if (isWeekend(dateStr)) return "weekend";
  return "working";
};

export const getDayName = (dateStr) => {
  const str = toDateStrFromAny(dateStr);
  const dt = toLocalDate(str);
  return DAY_NAMES[dt.getDay()] || "";
};

const HOLIDAY_TYPE = "HOLIDAY";
const WEEKEND_TYPE = "WEEKEND";
const REGULAR_TYPE = "REGULAR";

export const getDisplayName = (dateStr) => {
  const hName = getHolidayName(dateStr);
  if (hName) return hName;
  return getDayName(dateStr);
};

export const getExtraWorkType = (dateStr) => {
  const entryType = classifyEntry(dateStr);
  if (entryType === "holiday") return HOLIDAY_TYPE;
  if (entryType === "weekend") return WEEKEND_TYPE;
  return REGULAR_TYPE;
};


