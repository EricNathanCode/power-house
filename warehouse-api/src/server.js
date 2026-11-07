/* Start the API: npm start   (or npm run dev to restart on every file save) */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true }); // works from any folder
const { createApp } = require("./app");
const { prisma } = require("./db");

const port = Number(process.env.PORT) || 4000;
const app = createApp();
const server = app.listen(port, () => {
  const db = (() => { try { return new URL(process.env.DATABASE_URL).hostname.includes("neon.tech") ? "Neon (online)" : "local PostgreSQL (offline)"; } catch { return "?"; } })();
  console.log(`Power House API on http://localhost:${port}  ·  database: ${db}`);
  console.log(`Store: http://localhost:${port}/store-web/index.html  ·  Staff: http://localhost:${port}/staff-dashboard/login.html`);
});

// close cleanly on Ctrl+C
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => server.close(() => prisma.$disconnect().finally(() => process.exit(0))));
}
