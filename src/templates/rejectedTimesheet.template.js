const formatDate = (dateStr) => {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDayHeader = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()] || "";
};

const getDayNumber = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.getDate() || "";
};

const summaryTable = (entries = [], weekStart, weekEnd) => {
  if (!entries || entries.length === 0) return "";

  const weekDates = [];
  let cursor = new Date(weekStart + "T00:00:00");
  const end = new Date(weekEnd + "T00:00:00");
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    weekDates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  const projects = {};
  const dayTotals = {};
  let grandTotal = 0;

  weekDates.forEach((d) => { dayTotals[d] = 0; });

  entries.forEach((e) => {
    const p = e.project || "General";
    if (!projects[p]) projects[p] = {};
    weekDates.forEach((d) => {
      if (!projects[p][d]) projects[p][d] = 0;
    });
    const h = parseFloat(e.hours) || 0;
    if (weekDates.includes(e.entryDate)) {
      projects[p][e.entryDate] = (projects[p][e.entryDate] || 0) + h;
      dayTotals[e.entryDate] = (dayTotals[e.entryDate] || 0) + h;
      grandTotal += h;
    }
  });

  let table = `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0 0;border:1px solid #E5E7EB;border-radius:8px;">
    <tr>
      <td style="padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 20px;background-color:#F8FAFC;border-bottom:1px solid #E5E7EB;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;letter-spacing:0.4px;text-transform:uppercase;">Timesheet Summary</p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td width="100" style="padding:10px 14px;border-bottom:2px solid #D1D5DB;background-color:#F9FAFB;">
              <span style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.3px;">Project</span>
            </td>
            ${weekDates.map((d) => `
            <td width="42" style="padding:10px 4px;border-bottom:2px solid #D1D5DB;background-color:#F9FAFB;text-align:center;">
              <span style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.2px;display:block;">${getDayHeader(d)}</span>
              <span style="font-size:9px;color:#9CA3AF;display:block;">${getDayNumber(d)}</span>
            </td>`).join("")}
            <td width="55" style="padding:10px 8px;border-bottom:2px solid #D1D5DB;background-color:#F9FAFB;text-align:right;">
              <span style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.2px;">Week Total</span>
            </td>
          </tr>
          ${Object.keys(projects).map((proj) => {
            const rowTotal = weekDates.reduce((s, d) => s + (projects[proj][d] || 0), 0);
            return `<tr>
            <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;">
              <span style="font-size:13px;font-weight:600;color:#111827;">${proj}</span>
            </td>
            ${weekDates.map((d) => `
            <td style="padding:10px 4px;border-bottom:1px solid #E5E7EB;text-align:center;">
              <span style="font-size:13px;color:#111827;">${(projects[proj][d] || 0).toFixed(1)}</span>
            </td>`).join("")}
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#111827;">${rowTotal.toFixed(1)}</span>
            </td>
          </tr>`;
          }).join("")}
          <tr>
            <td style="padding:10px 14px;background-color:#F9FAFB;border-bottom:1px solid #D1D5DB;">
              <span style="font-size:12px;font-weight:700;color:#111827;">Daily Totals</span>
            </td>
            ${weekDates.map((d) => `
            <td style="padding:10px 4px;background-color:#F9FAFB;border-bottom:1px solid #D1D5DB;text-align:center;">
              <span style="font-size:13px;font-weight:700;color:#111827;">${(dayTotals[d] || 0).toFixed(1)}</span>
            </td>`).join("")}
            <td style="padding:10px 8px;background-color:#F9FAFB;border-bottom:1px solid #D1D5DB;text-align:right;">
              <span style="font-size:14px;font-weight:700;color:#111827;">${grandTotal.toFixed(1)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return table;
};

export const rejectedTimesheetTemplate = ({
  employeeName = "Employee",
  employeeId = "",
  weekStart = "",
  weekEnd = "",
  totalHours = 0,
  managerName = "Manager",
  comment = null,
  rejectionDate = "",
  submittedOn = "",
  entries = [],
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Timesheet Requires Changes</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F4F8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#FFFFFF;border-radius:12px;border:1px solid #D0D7DE;box-shadow:0 1px 3px rgba(27,31,35,0.04),0 8px 24px rgba(27,31,35,0.06);">
          <tr>
            <td style="padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:24px 36px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="left" style="vertical-align:middle;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;">
                                <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="28" height="28" rx="6" fill="#CF222E"/>
                                  <path d="M14 10V14M14 18H14.01" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                              </td>
                              <td style="padding-left:12px;vertical-align:middle;">
                                <span style="font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:0.3px;">NForce Pulse</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="font-size:14px;font-weight:600;color:#9CA3AF;">Timesheet Update</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#CF222E;height:4px;">
                <tr>
                  <td style="height:4px;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:48px 0 16px 0;text-align:center;">
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="background-color:#FFEBE9;border-radius:50%;width:88px;height:88px;">
                          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#CF222E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:24px 0 0 0;font-size:30px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1.3;">
                      Your Timesheet Has Been<br/>
                      <span style="color:#CF222E;">REJECTED!</span>
                    </h1>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px 0 0 0;">
                    <p style="margin:0;font-size:16px;color:#111827;line-height:1.6;">Hi <strong style="font-weight:600;">${employeeName}</strong>,</p>
                    <p style="margin:10px 0 0 0;font-size:16px;color:#6B7280;line-height:1.6;">Your weekly timesheet has been reviewed and requires changes.</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0 0;border:1px solid #E5E7EB;border-radius:12px;background-color:#F8FAFC;">
                <tr>
                  <td style="padding:24px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="25%" style="padding:0 8px 0 0;vertical-align:top;text-align:center;">
                          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                            <tr>
                              <td style="text-align:center;padding-bottom:8px;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#6B7280" stroke-width="1.5"/>
                                  <path d="M3 10H21" stroke="#6B7280" stroke-width="1.5"/>
                                  <path d="M8 2V6" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round"/>
                                  <path d="M16 2V6" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                              </td>
                            </tr>
                          </table>
                          <span style="font-size:11px;color:#6B7280;display:block;line-height:1.4;text-transform:uppercase;letter-spacing:0.3px;">Week</span>
                          <span style="font-size:13px;font-weight:600;color:#111827;display:block;line-height:1.4;margin-top:4px;">${formatDate(weekStart)} &ndash; ${formatDate(weekEnd)}</span>
                        </td>
                        <td width="25%" style="padding:0 8px 0 0;vertical-align:top;text-align:center;">
                          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                            <tr>
                              <td style="text-align:center;padding-bottom:8px;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17 21V19C17 16.7909 15.2091 15 13 15H11C8.79086 15 7 16.7909 7 19V21" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round"/>
                                  <circle cx="12" cy="7" r="4" stroke="#6B7280" stroke-width="1.5"/>
                                </svg>
                              </td>
                            </tr>
                          </table>
                          <span style="font-size:11px;color:#6B7280;display:block;line-height:1.4;text-transform:uppercase;letter-spacing:0.3px;">Reviewed By</span>
                          <span style="font-size:13px;font-weight:600;color:#111827;display:block;line-height:1.4;margin-top:4px;">${managerName}</span>
                        </td>
                        <td width="25%" style="padding:0 8px 0 0;vertical-align:top;text-align:center;">
                          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                            <tr>
                              <td style="text-align:center;padding-bottom:8px;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="9" stroke="#6B7280" stroke-width="1.5"/>
                                  <path d="M12 7V12L15 15" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                              </td>
                            </tr>
                          </table>
                          <span style="font-size:11px;color:#6B7280;display:block;line-height:1.4;text-transform:uppercase;letter-spacing:0.3px;">Reviewed On</span>
                          <span style="font-size:13px;font-weight:600;color:#111827;display:block;line-height:1.4;margin-top:4px;">${formatDate(rejectionDate)}</span>
                        </td>
                        <td width="25%" style="padding:0 0 0 0;vertical-align:top;text-align:center;">
                          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                            <tr>
                              <td style="text-align:center;padding-bottom:8px;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="9" stroke="#6B7280" stroke-width="1.5"/>
                                  <path d="M12 6V12L16 14" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                              </td>
                            </tr>
                          </table>
                          <span style="font-size:11px;color:#6B7280;display:block;line-height:1.4;text-transform:uppercase;letter-spacing:0.3px;">Total Hours</span>
                          <span style="font-size:13px;font-weight:700;color:#111827;display:block;line-height:1.4;margin-top:4px;">${totalHours} hrs</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${summaryTable(entries, weekStart, weekEnd)}
              ${comment ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0 0;background-color:#FEF2F2;border:1px solid #FECACA;border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" style="vertical-align:top;padding:2px 14px 0 0;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#CF222E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                        <td style="vertical-align:top;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#CF222E;letter-spacing:0.3px;text-transform:uppercase;">Reason / Message from ${managerName}</p>
                          <p style="margin:8px 0 0 0;font-size:14px;color:#7F1D1D;line-height:1.6;">${comment}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ""}
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:36px 0 0 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="background-color:#CF222E;border-radius:8px;">
                          <a href="#" style="display:inline-block;width:280px;padding:14px 0;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#CF222E;text-align:center;">Update &amp; Resubmit Timesheet &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:40px 0 0 0;background-color:#111827;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 24px;text-align:center;">
                    <p style="margin:0 0 4px 0;font-size:14px;color:#F9FAFB;font-weight:500;line-height:1.5;">Thank you,</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#FFFFFF;line-height:1.5;">NForce Pulse Team</p>
                    <p style="margin:12px 0 0 0;font-size:12px;color:#9CA3AF;line-height:1.5;">This is an automated email. Please do not reply.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin-top:16px;">
          <tr>
            <td align="center" style="padding:0 16px;">
              <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.5;">&copy; ${new Date().getFullYear()} NForce Pulse. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
