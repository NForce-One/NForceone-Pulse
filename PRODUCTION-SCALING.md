# Production Scaling Guide — 1000+ Concurrent Users

## 1. Database Connection Pooling

**File: `src/config/db.js`**

Increase pool from `max: 2` to handle concurrent requests:

```js
const sequelize = new Sequelize(..., {
  pool: {
    max: 25,          // Increased from 2 — handles concurrent queries
    min: 5,           // Keep warm connections ready
    acquire: 30000,   // 30s timeout (was 15s)
    idle: 10000,      // 10s idle before release
  },
});
```

Also add connection retry logic to handle transient DB failures under load.

---

## 2. Add Redis Caching Layer

**Install:** `npm install ioredis`

Create `src/config/redis.js`:

```js
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

export default redis;
```

**Cache these high-traffic endpoints** (dashboard, reports, project lists):

Create `src/middleware/cache.middleware.js`:

```js
import redis from "../config/redis.js";

export const cacheResponse = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl || req.url}`;
    try {
      const cached = await redis.get(key);
      if (cached) return res.json(JSON.parse(cached));
      res.originalJson = res.json.bind(res);
      res.json = (body) => {
        redis.setex(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
        res.originalJson(body);
      };
      next();
    } catch {
      next();
    }
  };
};
```

Apply to report routes (`src/routes/report.routes.js`):

```js
router.get("/dashboard", protect, cacheResponse(60), getDashboardStats);
router.get("/summary", protect, cacheResponse(120), getSummary);
```

**Cache invalidation** — clear relevant keys when data changes (time entry create/update/delete):

```js
import redis from "../config/redis.js";
export const invalidateDashboardCache = async () => {
  const keys = await redis.keys("cache:/api/reports/*");
  if (keys.length) await redis.del(keys);
};
```

---

## 3. Rate Limiting

**Install:** `npm install express-rate-limit`

Create `src/middleware/rateLimiter.middleware.js`:

```js
import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                   // Strict limit on auth endpoints
  message: { success: false, message: "Too many login attempts, please try again later." },
});
```

Apply in `src/app.js`:

```js
import { globalLimiter, authLimiter } from "./middleware/rateLimiter.middleware.js";
app.use(globalLimiter);
app.use("/api/auth", authLimiter);
```

---

## 4. Add Compression

**Install:** `npm install compression`

In `src/app.js`:

```js
import compression from "compression";

app.use(compression({
  level: 6,               // Balanced compression level
  threshold: 1024,        // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
}));
```

---

## 5. Add Helmet Security Headers

**Install:** `npm install helmet`

In `src/app.js`:

```js
import helmet from "helmet";

app.use(helmet({
  contentSecurityPolicy: false,    // Disable if your frontend uses inline scripts
  crossOriginEmbedderPolicy: false, // Disable if loading cross-origin resources
}));
```

---

## 6. Cluster with PM2

**Install globally:** `npm install -g pm2`

Create `ecosystem.config.js`:

```js
export default {
  apps: [{
    name: "nforce-backend",
    script: "src/index.js",
    instances: "max",          // One worker per CPU core
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
    },
    max_memory_restart: "1G",  // Restart if memory exceeds 1GB
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    watch: false,
    max_restarts: 5,
    restart_delay: 4000,
  }],
};
```

Update `package.json` scripts:

```json
{
  "scripts": {
    "start": "pm2-runtime ecosystem.config.js",
    "start:cluster": "pm2 start ecosystem.config.js",
    "stop": "pm2 stop ecosystem.config.js",
    "monit": "pm2 monit"
  }
}
```

Update `Procfile`:

```
web: npm run start
```

---

## 7. Database Query Optimization

### Add Missing Indexes

Create a migration script `scripts/add-indexes.js`:

```sql
-- Run these on TiDB:

CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX idx_time_entries_project ON time_entries(project_id, date);
CREATE INDEX idx_time_entries_status ON time_entries(status, user_id);
CREATE INDEX idx_timesheets_user_period ON timesheets(user_id, week_start, week_end);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_approval_history_timesheet ON approval_history(timesheet_id, created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
```

### Add Pagination to All List Endpoints

Example for `user.controller.js`:

```js
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where: buildUserFilter(req.query),
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password"] },
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## 8. Add Request Body Size Limiting

In `src/app.js`:

```js
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
```

---

## 9. JWT with Refresh Tokens

**Install:** `npm install @fastify/cookie` or handle via headers

Update `src/services/auth.service.js`:

```js
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role };
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "-refresh",
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "-refresh");
};
```

Add refresh endpoint in `auth.controller.js`:

```js
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: "Refresh token required" });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findByPk(decoded.id, { attributes: ["id", "role"] });
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const tokens = generateTokens(user);
    res.json({ success: true, data: tokens });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};
```

---

## 10. Fix CORS Configuration Bug

In `src/app.js`, the callback always allows — fix it:

```js
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
```

---

## 11. Graceful Shutdown & Error Recovery

Update `src/index.js`:

```js
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} 🚀`);
});

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    sequelize.close().then(() => {
      console.log("Database connections closed.");
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error("Forced shutdown after 30s timeout.");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  process.exit(1); // Exit to avoid undefined state
});
```

---

## 12. Move Hardcoded Config to Environment Variables

Add to `.env`:

```env
# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_REFRESH_SECRET=your-refresh-secret-key

# Email (Mailtrap or production SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300

# Node Env
NODE_ENV=production
```

Update email config in `notification.service.js` to use env vars instead of hardcoded Mailtrap credentials.

---

## 13. Frontend Performance Optimizations

### Code Splitting in `Frontend/src/routes/AppRoutes.jsx`:

```jsx
import { lazy, Suspense } from "react";
const Dashboard = lazy(() => import("../pages/Dashboard"));
const TeamTimesheets = lazy(() => import("../pages/TeamTimesheets"));

// Wrap routes in Suspense
<Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/team-timesheets" element={<TeamTimesheets />} />
    {/* ... other lazy routes */}
  </Routes>
</Suspense>
```

### Add `Cache-Control` headers on the backend for API responses:

```js
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  next();
});
```

For public/static responses, use:

```js
res.set("Cache-Control", "public, max-age=300");
```

---

## 14. Monitoring & Logging

**Install:** `npm install winston`

Create `src/config/logger.js`:

```js
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "./logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "./logs/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

export default logger;
```

Replace `console.log`/`console.error` with `logger.info`/`logger.error` throughout the app.

---

## 15. Database Read Replicas (Optional but Recommended)

If TiDB supports read replicas, configure Sequelize to use replication:

```js
const sequelize = new Sequelize({
  dialect: "mysql",
  replication: {
    read: [
      { host: process.env.DB_READ_HOST_1, username, password, database },
      { host: process.env.DB_READ_HOST_2, username, password, database },
    ],
    write: { host: process.env.DB_HOST, username, password, database },
  },
  pool: {
    max: 25,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
});
```

---

## Summary of Packages to Install

```bash
npm install ioredis compression helmet express-rate-limit winston
npm install --save-dev pm2
```

## Estimated Capacity Improvements

| Change | Impact |
|---|---|
| Pool 2 → 25 | 10-15x more concurrent DB queries |
| Redis caching | 50-80% reduction in DB load for reports |
| PM2 clustering (4-8 workers) | 4-8x request throughput |
| Compression | 60-80% smaller response payloads |
| Pagination | Prevents OOM on large datasets |
| Rate limiting | Prevents abuse and DoS |
| Indexes | 10-100x faster queries on large tables |
