/* Power House warehouse REST API (Express). All endpoints are under /api and speak JSON.
   The same server also hands out the website files, so the whole demo runs from one address. */
const path = require("path");
const express = require("express");
const session = require("express-session");
const PgStore = require("connect-pg-simple")(session);
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { prisma } = require("./db");
const { ApiError, route, errorHandler } = require("./lib/errors");

function createApp() {
  const secret = process.env.SESSION_SECRET || "";
  if (secret.length < 32 || secret.startsWith("change-me")) throw new Error("Set SESSION_SECRET in .env to a long random value (see .env.example).");

  const app = express();
  app.disable("x-powered-by");

  // security headers. The website pages use small inline scripts, so the strict content policy is off for now.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } }));

  // the website on another local port (e.g. Live Server / python on 5500) may call the API with its login cookie
  const origins = (process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500").split(",").map((s) => s.trim()).filter(Boolean);
  app.use("/api", cors({ origin: origins, credentials: true }));

  app.use(express.json({ limit: "100kb" }));

  // logins: a signed, httpOnly cookie; the session itself is saved in the database ("session" table)
  app.use(session({
    name: "ph.sid",
    secret,
    // verify-full = check Neon's certificate too (stricter than "require"); local Plan B has no sslmode, so nothing changes there
    store: new PgStore({ conString: String(process.env.DATABASE_URL).replace("sslmode=require", "sslmode=verify-full"), tableName: "session", createTableIfMissing: false, pruneSessionInterval: 60 * 60 }),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 3600e3 }
  }));

  // slow down password guessing: 20 login tries per 10 minutes per address (LOGIN_RATE_LIMIT changes it, e.g. for tests)
  const loginLimit = rateLimit({
    windowMs: 10 * 60e3, limit: Number(process.env.LOGIN_RATE_LIMIT) || 20, standardHeaders: "draft-8", legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: "TOO_MANY_TRIES", message: "Too many login tries. Wait a few minutes and try again." } })
  });
  app.use(["/api/auth/login", "/api/auth/signup", "/api/staff/login"], loginLimit);

  /* GET /api/health  -> is the API up and can it reach the database? */
  app.get("/api/health", route(async (req, res) => {
    const t = Date.now();
    await prisma.$queryRaw`select 1`;
    res.json({ ok: true, database: "up", ms: Date.now() - t });
  }));

  app.use("/api", require("./routes/public"));
  app.use("/api", require("./routes/customer"));
  app.use("/api/staff", require("./routes/staff"));

  /* POST /api/demo/reset  -> sample data back (only when ALLOW_DEMO_RESET=true in .env; never on a real store) */
  app.post("/api/demo/reset", route(async (req, res) => {
    if (process.env.ALLOW_DEMO_RESET !== "true") throw new ApiError(403, "RESET_OFF", "Demo reset is turned off on this server.");
    const { seed } = require("../prisma/seed");
    await seed(prisma);
    res.json({ ok: true });
  }));

  app.use("/api", (req, res) => res.status(404).json({ error: { code: "NO_ENDPOINT", message: `No endpoint ${req.method} ${req.originalUrl}` } }));

  // the website (store, staff dashboard, shared files) from the repo folder
  const site = path.join(__dirname, "..", "..");
  for (const dir of ["store-web", "staff-dashboard", "shared"]) app.use("/" + dir, express.static(path.join(site, dir)));
  app.get("/", (req, res) => res.redirect("/store-web/index.html"));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
