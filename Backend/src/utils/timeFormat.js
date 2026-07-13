export const formatHoursToHHMM = (hours) => {
  if (!hours && hours !== 0) return "0h 00m";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};
