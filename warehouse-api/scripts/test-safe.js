/* npm run test:safe
   Runs the API tests in a separate "test" schema of the same database, so the real products, orders and photos
   (in the normal "public" schema) are never reset. The first run creates the test tables. */
require("dotenv").config({ quiet: true });
const { execSync } = require("child_process");

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is missing in .env"); process.exit(1); }
const inTestSchema = (u) => { const url = new URL(u); url.searchParams.set("schema", "test"); return url.toString(); };
const env = { ...process.env, DATABASE_URL: inTestSchema(process.env.DATABASE_URL), DIRECT_URL: inTestSchema(process.env.DIRECT_URL || process.env.DATABASE_URL) };

console.log('Tests run in the "test" schema; your real data is not touched.');
execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
execSync('node --test --test-concurrency=1 "tests/*.test.js"', { env, stdio: "inherit" });
