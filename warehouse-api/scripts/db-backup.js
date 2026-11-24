/* npm run db:backup
   Saves EVERYTHING in the database (products, photos, specs, prices, customers, orders, trade-ins...) to one file:
   backups/power-house-2026-11-24-2130.json  (in the repo folder; never committed: it has customer data and password hashes)
   Put it back with: npm run db:restore -- backups/<file>.json */
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { MODELS } = require("./db-models");

(async () => {
  const prisma = new PrismaClient();
  const out = { app: "power-house", version: 1, savedAt: new Date().toISOString(), tables: {} };
  for (const m of MODELS) {
    const rows = await prisma[m].findMany();
    // photos are bytes: save them as base64 text so the file is plain JSON
    out.tables[m] = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Buffer.isBuffer(v) || v instanceof Uint8Array ? { $bytes: Buffer.from(v).toString("base64") } : v])));
  }
  await prisma.$disconnect();
  const dir = path.join(__dirname, "..", "..", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 16).replace("T", "-").replace(":", ""); // PH time
  const file = path.join(dir, `power-house-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(out));
  const size = (fs.statSync(file).size / 1048576).toFixed(1);
  console.log(`Backup saved: ${path.relative(process.cwd(), file)} (${size} MB)`);
  console.log(Object.entries(out.tables).map(([k, v]) => `${k} ${v.length}`).join(" · "));
  console.log("Keep a copy somewhere safe (e.g. the group's Google Drive). It has customer data: don't post it publicly.");
})().catch((e) => { console.error("Backup failed:", e.message); process.exit(1); });
