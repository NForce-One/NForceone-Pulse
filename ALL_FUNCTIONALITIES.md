# NForce Pulse - Complete Functionalities Document

## 1. AUTHENTICATION MODULE (Public)

| Feature | Description |
|---------|-------------|
| **Login** | Email + password authentication with JWT token; role-based redirect (Admin → Dashboard, Manager → Approvals, Employee → Timesheet) |
| **Forgot Password** | Enter email to receive password reset link |
| **Reset Password** | Enter new password + confirm via token from email link |
| **Register** | (Admin only) Create a new user account |

---

## 2. ADMIN COMPONENT (Full Access)

### 2.1 Dashboard
| Feature | Description |
|---------|-------------|
| **Overview Stats** | Total Users, Active Projects, Active Clients (clickable cards open modals) |
| **Hour Metrics** | Total Hours Logged, Working Hours, Weekend Working Hours, Holiday Working Hours (clickable to drill down) |
| **Daily Summary Table** | Date, Day, Total Hours, Reported To, Status with project-level expand |
| **Filter Options** | Today/This Week/Last Week/This Month/Last Month/Next Month/This Year/Custom Month/Custom Range |
| **Metric Selector** | Filter by Total/Working/Weekend/Holiday hours |
| **Employee Multi-Select** | Filter dashboard by specific employees |

### 2.2 User Management (`/admin/users`)
| Feature | Description |
|---------|-------------|
| **View Users** | List all users with Employee ID, Name, Email, Role, Status |
| **Create User** | Name, Email, Password, Role (Employee/Manager/Admin), Auto-generated Employee ID |
| **Edit User** | Update name, email, role |
| **Toggle Status** | Activate/Deactivate user (Power button) |
| **Delete User** | Remove user from system |

### 2.3 Client Management (`/admin/clients`)
| Feature | Description |
|---------|-------------|
| **View Clients** | List all clients with Name and Status |
| **Create Client** | Name + Status (Active/Inactive) |
| **Edit Client** | Update name/status |
| **Delete Client** | Remove client |

### 2.4 Project Management (`/admin/projects`)
| Feature | Description |
|---------|-------------|
| **View Projects** | List all projects with Client, Project Name, Description, Status |
| **Create Project** | Name, Client, Status (Active/Inactive/Completed), Description |
| **Edit Project** | Update project details |
| **Delete Project** | Remove project |

### 2.5 Task Management (`/admin/tasks`)
| Feature | Description |
|---------|-------------|
| **View Tasks** | List all tasks with Title, Project, Category, Billable flag, Status |
| **Create Task** | Title, Project, Category, Billable/Non-Billable, Status (Pending/In Progress/Completed), Description |
| **Edit Task** | Update task details |
| **Delete Task** | Remove task |

### 2.6 Team Timesheets (`/manager/team-timesheets`) — Also accessible by Admin
| Feature | Description |
|---------|-------------|
| **View All Team Timesheets** | All employees' timesheets with date filters |
| **Date Filters** | All Dates/Today/This Week/Last Week/This Month/Last Month/Next Month/This Year/Custom Month/Custom Range |
| **Status Filters** | Filter by timesheet status |
| **Employee Filter** | View timesheets of specific employees |
| **Approve/Reject** | Approve or reject team timesheets |

### 2.7 Approvals (`/approvals`)
| Feature | Description |
|---------|-------------|
| **View Pending Approvals** | List of all submitted entries grouped by employee-week |
| **Status Filter Tabs** | Pending/Approved/Rejected/All with counts |
| **Approve Entries** | Approve all entries for an employee-week with optional comment |
| **Reject Entries** | Reject entries with optional comment |
| **View Details Drawer** | Daily timesheet grid showing hours per project per day |
| **Project Popover** | Quick view of projects in a submission |

### 2.8 Reports (`/reports`)
| Feature | Description |
|---------|-------------|
| **Employee Hours Report** | Employee, Project, Task, Date, Hours, Status |
| **Project Hours Report** | Project, Client, Employee, Date, Hours |
| **Utilization Report** | Employee, Department, Total Hours, Working, Extra, Utilization % |
| **Billing Summary** | Client, Project, Total Working Hours |
| **Date Range Filter** | Start/End date |
| **Client Multi-Select** | Filter by clients |
| **Project Multi-Select** | Filter by projects (dependent on client selection) |
| **Employee/Manager Multi-Select** | Filter by specific employees/managers |
| **Export CSV** | Download report as CSV file |

### 2.9 Notifications (`/notifications`)
| Feature | Description |
|---------|-------------|
| **View Notifications** | List all notifications with icons, titles, messages, timestamps |
| **Filter Tabs** | All/Unread/Read |
| **Mark as Read** | Single or Bulk (Mark All Read) |
| **Delete Notification** | Remove notification |
| **Auto-polling** | Checks for new notifications every 30s |
| **Notification Types** | Missing Entry, Pending Submission, Submitted, Approved, Rejected, Manager Reminder |

### 2.10 Profile (`/profile`)
| Feature | Description |
|---------|-------------|
| **View Profile** | Name, Email (read-only), Role (read-only), Department, Default Hours |
| **Update Profile** | Edit Name, Department, Default Hours |
| **Change Password** | Current Password, New Password, Confirm New Password |

---

## 3. MANAGER COMPONENT

*Inherits all Employee features below, plus:*

| Feature | Description |
|---------|-------------|
| **Self/Team Dashboard Toggle** | Switch between personal and team dashboard views |
| **Team Dashboard** | Team Overview table (Name, Email, Total Hours, Entries per member) |
| **Top 5 Employees by Hours** | Ranking of top performing employees |
| **Missing Time Detection** | Employees with missing time entries per week, with view details |
| **Top Projects by Hours** | Project-wise hour ranking |
| **Team Timesheets** | View team timesheets, approve/reject |
| **Approvals** | Approve/Reject submitted time entries from team members |
| **Reports (Team & Self)** | Generate reports for self or entire team with employee multi-select |
| **Manager Comment** | Add optional comments when approving/rejecting |

---

## 4. EMPLOYEE COMPONENT

### 4.1 Dashboard
| Feature | Description |
|---------|-------------|
| **Overview Stats** | Total Hours Logged, Working Hours, Weekend Working Hours, Holiday Working Hours |
| **Daily Summary Table** | Personal daily entries with Date, Day, Hours, Reported To, Status |
| **Filter Options** | Same as Admin filters |
| **Metric Selector** | Filter by hour type |

### 4.2 My Timesheet (`/timesheet` or `/employee/my-timesheet`) — Legacy Simple Timesheet
| Feature | Description |
|---------|-------------|
| **Log Time Form** | Client, Project (dependent on client), Task, Date, Hours, Description, Select Manager |
| **Create Entry** | Add a new time entry |
| **Edit Entry** | Edit project, description while in Draft status |
| **Submit Entry** | Send entry to manager for approval |
| **Delete Entry** | Remove draft entry |
| **View Entries Table** | Client, Date, Project, Task, Description, Hours, Status, Reported To, Manager Action, Manager Comment |
| **Cached Data** | Entries cached for performance |

### 4.3 Employee Time IQ (`/employee/my-timesheet`) — Advanced Weekly Timesheet
| Feature | Description |
|---------|-------------|
| **Weekly Timesheet View** | Day-by-day grid (Sun-Sat) with project rows |
| **Week Navigation** | Previous/Next week arrows |
| **Add Project Row** | Select Client → Project → Manager per project |
| **Enter Hours per Day** | Input hours for each project on each day |
| **Weekly Comment** | Add weekly comment/note |
| **Save Draft** | Save timesheet as draft |
| **Submit** | Submit entire weekly timesheet for approval |
| **Auto-save** | Auto-saves on week change |
| **Recall/Cancel** | Cancel and reset weekly timesheet |
| **Delete Project Row** | Remove a project row from timesheet |
| **View Manager Action/Comment** | See manager's approval/rejection and comment per timesheet |
| **Status Display** | Draft/Submitted/Approved/Rejected with visual badges |

### 4.4 Timer (`/timer`)
| Feature | Description |
|---------|-------------|
| **Start Timer** | Select Client, Project, Task, Description → Start tracking |
| **Pause/Resume** | Pause and resume timer |
| **Stop & Discard** | Stop timer without saving |
| **Stop & Add to Timesheet** | Convert timer entry to timesheet entry and redirect |
| **Auto-save** | Timer state saved every 30 seconds |
| **Timer Restoration** | Restore active timer on page reload |
| **Elapsed Time Display** | Real-time HH:MM:SS display |

### 4.5 Approvals View
| Feature | Description |
|---------|-------------|
| **View My Entries** | See status of submitted entries |
| **Manager Comment** | View manager's comment on approval/rejection |

### 4.6 Reports
| Feature | Description |
|---------|-------------|
| **View Reports** | Generate and view all report types for self |
| **Export CSV** | Download personal reports |

### 4.7 Notifications
| Feature | Description |
|---------|-------------|
| **Receive Notifications** | Get notified on timesheet status changes (Submitted, Approved, Rejected) |
| **Mark Read** | Mark individual or all notifications read |
| **Delete** | Delete notifications |

### 4.8 Profile
| Feature | Description |
|---------|-------------|
| **View/Edit Profile** | Name, Department, Default Hours |
| **Change Password** | Current + New Password |

---

## 5. SHARED / CROSS-CUTTING FEATURES

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Token-based auth with auto-redirect on 401 |
| **Role-Based Access Control** | Protected routes per role (Admin/Manager/Employee) |
| **Caching** | Frontend data caching with auto-refresh |
| **Notifications System** | Real-time notification polling (every 30s) with unread badge in sidebar |
| **CSV Export** | All reports exportable to CSV |
| **Responsive Layout** | Sidebar + Header + Content layout with role-based sidebar visibility |
| **Drill-down Modals** | Click on metric cards to see detailed hour entries |
| **Admin List Modals** | Click on stats cards to see user/project/client details |
| **Missing Time Modal** | View missing time details per employee |

---

## 6. BACKEND MODELS (Data Entities)

| Model | Purpose |
|-------|---------|
| **User** | Employees, Managers, Admins with roles, employee IDs, departments |
| **Client** | Client companies with Active/Inactive status |
| **Project** | Projects linked to clients with Active/Inactive/Completed status |
| **Task** | Tasks linked to projects with billable flag, category, Pending/In Progress/Completed |
| **TimeEntry** | Individual time log entries with hours, date, status (Draft/Submitted/Approved/Rejected), manager comment |
| **Timer** | Real-time timer tracking with start/pause/resume/stop |
| **Timesheet** | Weekly aggregated timesheets with approval workflow |
| **ApprovalHistory** | Audit trail of approval/rejection actions |
| **Notification** | System notifications with types (Missing Entry, Pending, Submitted, Approved, Rejected, Reminder) |
| **BillingRate** | Billing rates for clients/projects |
| **ProjectUser** | Many-to-many relationship between projects and users |
| **Holiday** | Holiday calendar for the organization |
| **Leave** | Leave management |
| **AuditLog** | Audit trail for system actions |

---

## 7. BACKEND API ENDPOINTS

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Forgot password |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/register` | Register user |
| GET | `/api/auth/managers` | Get managers list |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/me` | Get current user profile |
| GET | `/api/users/next-employee-id` | Get next auto-generated employee ID |
| GET | `/api/users/team-members` | Get team members |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| PUT | `/api/users/me/profile` | Update profile |
| PUT | `/api/users/me/change-password` | Change password |
| PUT | `/api/users/:id/toggle-status` | Toggle active/inactive |
| DELETE | `/api/users/:id` | Delete user |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Create client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

### Time Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/time-entries` | List entries (with `?for=approvals` for approval view) |
| POST | `/api/time-entries` | Create entry |
| PUT | `/api/time-entries/:id` | Update entry |
| PUT | `/api/time-entries/:id/submit` | Submit entry |
| PUT | `/api/time-entries/:id/approve` | Approve entry |
| PUT | `/api/time-entries/:id/reject` | Reject entry |
| PUT | `/api/time-entries/:id/comment` | Add comment |
| DELETE | `/api/time-entries/:id` | Delete entry |

### Timer
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timers/active` | Get active timer |
| POST | `/api/timers/start` | Start timer |
| PUT | `/api/timers/:id/pause` | Pause timer |
| PUT | `/api/timers/:id/resume` | Resume timer |
| PUT | `/api/timers/:id/stop` | Stop timer |
| PUT | `/api/timers/:id/save` | Save timer state |
| POST | `/api/timers/:id/convert` | Convert to time entry |

### Timesheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timesheets` | List timesheets |
| GET | `/api/timesheets/team` | Team timesheets (manager) |
| GET | `/api/timesheets/filtered-entries` | Filtered entries |
| GET | `/api/timesheets/:id` | Get timesheet by ID |
| GET | `/api/timesheets/:id/history` | Get approval history |
| POST | `/api/timesheets/generate` | Generate timesheet |
| PUT | `/api/timesheets/:id/submit` | Submit timesheet |
| PUT | `/api/timesheets/:id/approve` | Approve timesheet |
| PUT | `/api/timesheets/:id/reject` | Reject timesheet |
| PUT | `/api/timesheets/:id/comment` | Add comment |
| PUT | `/api/timesheets/:id/withdraw` | Withdraw timesheet |

### Employee Timesheet (Employee Time IQ)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employee-timesheet/clients` | Get clients for ET |
| GET | `/api/employee-timesheet/projects/:clientId` | Get projects by client |
| GET | `/api/employee-timesheet/managers/:projectId` | Get managers by project |
| GET | `/api/employee-timesheet/weekly` | Get weekly timesheet |
| POST | `/api/employee-timesheet/save` | Save draft |
| POST | `/api/employee-timesheet/submit` | Submit timesheet |
| PUT | `/api/employee-timesheet/update` | Update timesheet |
| POST | `/api/employee-timesheet/cancel` | Cancel timesheet |
| DELETE | `/api/employee-timesheet/project/:projectId/week/:weekStartDate` | Delete project entries |
| GET | `/api/employee-timesheet/manager-action/:timesheetId` | Get manager action |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Dashboard stats |
| GET | `/api/reports/dashboard/hour-details` | Hour details drill-down |
| GET | `/api/reports/dashboard/missing-time` | Missing time details |
| GET | `/api/reports/employee-hours` | Employee hours report |
| GET | `/api/reports/project-hours` | Project hours report |
| GET | `/api/reports/utilization` | Utilization report |
| GET | `/api/reports/billing-summary` | Billing summary |
| GET | `/api/reports/timesheet-status` | Timesheet status report |
| GET | `/api/reports/approved-employees` | Approved employees list |
| GET | `/api/reports/export` | Export CSV |
