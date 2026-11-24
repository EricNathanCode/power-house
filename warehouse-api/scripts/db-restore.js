/* npm run db:restore -- backups/power-house-2026-11-24-2130.json
   Puts a backup (from npm run db:backup) back into the database. It REPLACES what is there now,
   so it asks you to type RESTORE first. Logins stay working: password hashes are in the backup too. */
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { PrismaClient } = require("@prisma/client");
const { MODELS, AUTO_ID } = require("./db-models");

const file = process.argv[2];
if (!file) { console.error("Which backup? npm run db:restore -- backups/power-house-....json"); process.exit(1); }
const data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));
if (data.app !== "power-house" || !data.tables) { console.error("That file is not a Power House backup."); process.exit(1); }

const revive = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v && typeof v === "object" && v.$bytes !== undefined ? Buffer.from(v.$bytes, "base64") : v]));
const schema = new URL(process.env.DATABASE_URL).searchParams.get("schema") || "public";

async function restore() {
  const prisma = new PrismaClient();
  await prisma.$transaction(async (tx) => {
    for (const m of [...MODELS].reverse()) await tx[m].deleteMany();
    for (const m of MODELS) {
      const rows = (data.tables[m] || []).map(revive);
      for (let i = 0; i < rows.length; i += 200) await tx[m].createMany({ data: rows.slice(i, i + 200) });
    }
    for (const [m, table] of Object.entries(AUTO_ID)) { // next automatic id continues after the highest restored one
      await tx.$executeRawUnsafe(`select setval(pg_get_serial_sequence('"${schema}"."${table}"', 'id'), coalesce((select max(id) from "${schema}"."${table}"), 0) + 1, false)`);
    }
  }, { timeout: 120000, maxWait: 20000 });
  const counts = {};
  for (const m of MODELS) counts[m] = await prisma[m].count();
  await prisma.$disconnect();
  console.log(`Restored the backup from ${data.savedAt}:`);
  console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · "));
}

const products = (data.tables.product || []).length;
console.log(`Backup from ${data.savedAt}: ${products} products. This REPLACES everything now in the "${schema}" schema.`);
if (process.argv.includes("--yes")) restore().catch((e) => { console.error("Restore failed (nothing was changed):", e.message); process.exit(1); });
else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Type RESTORE to continue: ', (a) => {
    rl.close();
    if (a.trim() !== "RESTORE") { console.log("Stopped. Nothing was changed."); return; }
    restore().catch((e) => { console.error("Restore failed (nothing was changed):", e.message); process.exit(1); });
  });
}
