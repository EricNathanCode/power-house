/* Quick check that the API can reach the database in .env (Neon or local). Prints no passwords. */
require("dotenv").config({ quiet: true });
const { Client } = require("pg");

(async () => {
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const url = process.env[key];
    if (!url) { console.log(`${key}: not set`); continue; }
    const host = new URL(url).host;
    const client = new Client({ connectionString: url.replace("sslmode=require", "sslmode=verify-full") });
    const t = Date.now();
    try {
      await client.connect();
      const r = await client.query("select current_database() as db, version() as v");
      console.log(`${key}: OK in ${Date.now() - t} ms -> ${host} / database "${r.rows[0].db}" / ${r.rows[0].v.split(" on ")[0]}`);
    } catch (e) {
      console.log(`${key}: FAILED -> ${host}: ${e.message}`);
      process.exitCode = 1;
    } finally {
      await client.end().catch(() => {});
    }
  }
})();
