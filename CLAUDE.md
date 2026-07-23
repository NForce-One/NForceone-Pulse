# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NForce Pulse — a time-tracking web app (timesheets, approvals, reports) with three roles: ADMIN, MANAGER, EMPLOYEE. Two independent npm projects:

- `Backend/` — Express 5 + Sequelize (MySQL), ES modules, plain JavaScript.
- `Frontend/` — React 19 + Vite + Tailwind CSS 4, JSX (no TypeScript).

`ALL_FUNCTIONALITIES.md` at the repo root documents every feature per role and is the best functional reference.

## Commands

```bash
# Backend (runs on http://localhost:5000)
cd Backend && npm run dev        # nodemon
cd Backend && npm start          # node src/index.js

# Frontend (runs on http://localhost:5173)
cd Frontend && npm run dev
cd Frontend && npm run build
cd Frontend && npm run lint      # eslint (frontend only; backend has no linter)
```

`start-servers.bat` (run as Administrator) starts MySQL, writes `Backend/.env`, and launches both dev servers.

There are no tests in this repo.

Backend requires `Backend/.env`: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `PORT`, `JWT_SECRET`, plus `RESEND_API_KEY` / `FROM_EMAIL` for email and optional `CORS_ORIGINS`. Local MySQL convention: root/nforce123, database `nforce_timetracker`. Frontend uses `VITE_API_URL` (defaults to `http://localhost:5000/api`).

## Critical gotcha: duplicated backend code

The repo root contains `src/`, `api/`, `package.json`, `vercel.json` — a **stale copy of `Backend/`** kept for Vercel serverless deployment. The real backend lives in `Backend/src/`. Always edit `Backend/src/`; only touch the root copy if intentionally syncing for a Vercel deploy. Root `api/index.js` and `Backend/api/index.js` both re-export the Express app for serverless.

## Backend architecture

Layered per feature: `routes/*.routes.js` → `controllers/*.controller.js` → `services/*.service.js` → `models/*.model.js`. Business logic belongs in services; controllers are thin request/response wrappers.

**Two entry points that must be kept in sync:**
- `Backend/src/index.js` — local/Railway server. Defines all Sequelize associations, runs `sequelize.sync()`, ad-hoc migrations, and node-cron jobs (missing-entry reminders, weekly reminder emails, manager pending-approval nudges — all defined inline here or in `src/jobs/`).
- `Backend/src/app.js` — exported app for Vercel. Duplicates the same association definitions but has **no cron jobs** (serverless).

Model associations are NOT defined in the model files — they are defined centrally in both `index.js` and `app.js`. An association change must be made in both files.

**Schema management:** there are no migration files. `sequelize.sync()` runs at startup, plus hand-rolled column-add/dedup logic in `index.js`'s `startServer()`. Schema changes = edit the model + add safe idempotent startup logic if needed.

**Auth:** JWT via `middleware/auth.middleware.js` — `protect` verifies the token and sets `req.user`; `authorizeRoles("ADMIN", "MANAGER")` gates by role. Roles are the uppercase strings `ADMIN` / `MANAGER` / `EMPLOYEE`.

**Email:** Resend API (`services/email.service.js`), HTML built in `src/templates/*.template.js`.

**EmployeeTimeIQ** is the weekly-grid timesheet feature: backend at `/api/employee-timesheet` (`employeeTimesheet.*` files), frontend in `Frontend/src/components/EmployeeTimeIQ/`. Time entries have a uniqueness invariant of one row per (userId, entryDate, projectId), a 24h/day cap, and HH.MM input is interpreted as hours+minutes (e.g. 7.30 = 7h 30m) — displayed as `Xh XXm`.

**Holidays** are seeded/loaded at startup from `utils/holidayConfig.js` + `config/holidays.js` and factor into working/weekend/holiday hour metrics.

## Frontend architecture

- `src/routes/AppRoutes.jsx` — all routing; pages live in `src/pages/` (one per feature: Dashboard, MyTimesheet, Approvals, TeamTimesheets, Reports, Users, etc.).
- `src/context/AuthContext.jsx` — auth state; JWT + user stored in localStorage. `ThemeContext.jsx` for dark/light.
- `src/services/api.js` — the shared axios instance. It injects the Bearer token and force-logs-out on 401 only (deliberately NOT on 403/400 — don't "fix" that). `employeeTimeIQApi.js` wraps the EmployeeTimeIQ endpoints.
- `src/components/layout/` — DashboardLayout/Sidebar/Header shell; role-based redirect after login (Admin → Dashboard, Manager → Approvals, Employee → Timesheet).

## Other notes

- ~4000 `Backend/node_modules` files are historically tracked in git even though `node_modules/` is now gitignored — expect noisy `git status` after `npm install`; never stage `node_modules` changes alongside code.
- Utility scripts at `Backend/` root (`create_admin.js`, `seed_admin.js`, `check_users.js`, `check_tables.js`, `fix_managers.js`) are run directly with `node` against the configured DB.
- Deployment targets: Vercel (frontend + serverless backend copy) and Railway (`railway.json`, `Procfile` run the real `Backend`).
