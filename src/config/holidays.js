export const HOLIDAYS = [
  { name: "New Year's Day", date: "2026-01-01" },
  { name: "Makar Sankranti / Pongal", date: "2026-01-14" },
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Good Friday", date: "2026-04-03" },
  { name: "Labour Day", date: "2026-05-01" },
  { name: "Ramzan", date: "2026-03-21" },
  { name: "Ganesh Chaturthi", date: "2026-09-14" },
  { name: "Gandhi Jayanti", date: "2026-10-02" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Christmas Day", date: "2026-12-25" },
];

export function isHoliday(dateStr) {
  return HOLIDAYS.find((h) => h.date === dateStr);
}

export function isWeekend(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function getHolidayName(dateStr) {
  const holiday = isHoliday(dateStr);
  return holiday ? holiday.name : null;
}
