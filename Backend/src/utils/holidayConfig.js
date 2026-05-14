const HOLIDAYS_2026 = [
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

const HOLIDAY_MAP = new Map(HOLIDAYS_2026.map(h => [h.date, h.name]));

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const getHolidayName = (dateStr) => {
  return HOLIDAY_MAP.get(dateStr) || null;
};

export const isHoliday = (dateStr) => {
  return HOLIDAY_MAP.has(dateStr);
};

export const isWeekend = (dateStr) => {
  const dt = toLocalDate(dateStr);
  const day = dt.getDay();
  return day === 0 || day === 6;
};

export const isWeekday = (dateStr) => {
  return !isWeekend(dateStr) && !isHoliday(dateStr);
};

export const getDayName = (dateStr) => {
  const dt = toLocalDate(dateStr);
  return DAY_NAMES[dt.getDay()];
};

export const classifyEntry = (dateStr) => {
  if (isHoliday(dateStr)) return 'holiday';
  if (isWeekend(dateStr)) return 'weekend';
  return 'working';
};

export const getDisplayName = (dateStr) => {
  const holidayName = getHolidayName(dateStr);
  if (holidayName) return holidayName;
  if (isWeekend(dateStr)) return getDayName(dateStr);
  return null;
};
