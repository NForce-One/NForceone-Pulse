export const missingTimesheetReminderTemplate = ({
  employeeName = "Employee",
  weekStart = "",
  weekEnd = "",
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reminder: Submit Your Weekly Timesheet</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F4F8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;border:1px solid #D0D7DE;box-shadow:0 1px 3px rgba(27,31,35,0.04),0 8px 24px rgba(27,31,35,0.06);">
          <!-- HEADER -->
          <tr>
            <td style="padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:24px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="left" style="vertical-align:middle;">
                          <span style="font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:0.3px;">NForce Pulse</span>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="font-size:13px;font-weight:600;color:#9CA3AF;">Timesheet Reminder</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#B33A2F;height:4px;">
                <tr>
                  <td style="height:4px;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 0 8px 0;text-align:center;">
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td align="center">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#B33A2F" stroke-width="2"/>
                            <path d="M12 8V12M12 16H12.01" stroke="#B33A2F" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:20px 0 0 0;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.3px;line-height:1.3;">
                      Timesheet Reminder
                    </h1>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px 0 0 0;">
                    <p style="margin:0;font-size:16px;color:#111827;line-height:1.7;">Hello <strong style="font-weight:600;">${employeeName}</strong>,</p>
                    <p style="margin:12px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Our records indicate that your weekly timesheet for this week has not yet been submitted.</p>
                    <p style="margin:12px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Please complete and submit your timesheet before the end of the day.</p>
                  </td>
                </tr>
              </table>
              <!-- WEEK INFO -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0 0;border:1px solid #E2E8F0;border-radius:10px;background-color:#F8FAFC;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;">
                    <span style="font-size:11px;color:#64748B;display:block;line-height:1.4;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Current Week</span>
                    <span style="font-size:15px;font-weight:700;color:#0F172A;display:block;line-height:1.4;margin-top:6px;">${formatDate(weekStart)} &ndash; ${formatDate(weekEnd)}</span>
                  </td>
                </tr>
              </table>
              <!-- BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="background-color:#B33A2F;border-radius:8px;">
                          <a href="#" style="display:inline-block;width:240px;padding:14px 0;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#B33A2F;text-align:center;">Open Timesheet</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- FOOTER -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:36px 0 0 0;background-color:#111827;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:24px 20px;text-align:center;">
                    <p style="margin:0 0 4px 0;font-size:14px;color:#F8FAFC;font-weight:500;line-height:1.6;">Thank you,</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#FFFFFF;line-height:1.6;">NForce Pulse Team</p>
                    <p style="margin:12px 0 0 0;font-size:12px;color:#94A3B8;line-height:1.5;">This is an automated email. Please do not reply.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:16px;">
          <tr>
            <td align="center" style="padding:0 16px;">
              <p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.5;">&copy; ${new Date().getFullYear()} NForce Pulse. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
