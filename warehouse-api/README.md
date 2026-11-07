# Power House warehouse API

The warehouse side of Power House: the database and the REST API that the store and the staff dashboard use.
Node.js + Prisma + PostgreSQL (Neon online, local PostgreSQL 18 offline). **Sample data only.**

## First-time setup
1. Install **Node.js LTS** (20 or newer).
2. In this folder: `npm install`
3. Copy `.env.example` to `.env` and paste the two Neon addresses (ask the leader; never put them on GitHub or in the group chat).
4. `npm run db:check` → both lines should say **OK**.

## Commands
| Command | What it does |
|---|---|
| `npm start` | Runs the API **and** the website at http://localhost:4000 |
| `npm run dev` | Same, but restarts by itself when you save a file |
| `npm test` | 18 automatic tests of every endpoint and rule (⚠️ resets the data: not during a demo) |
| `npm run db:check` | Tests the connection to the database in `.env` |
| `npm run db:deploy` | Creates or updates the tables from `prisma/migrations` (use this on a new database, e.g. offline Plan B) |
| `npm run db:seed` | **Wipes the data** and loads the sample data again (same data as `shared/js/data.js`) |
| `npm run db:verify` | Checks the sample data (passwords hashed, low stock, next IDs, foreign keys) |
| `npm run db:studio` | Opens Prisma Studio, a table viewer in the browser |
| `npm run db:migrate -- --name what-changed` | After editing `prisma/schema.prisma`: makes a new migration (leader / database lead only) |

## Files
- `prisma/schema.prisma`: every table, column and allowed value, in one readable file
- `prisma/migrations/`: the SQL that builds the tables (commit these; never edit old ones)
- `prisma/seed.js`: loads the sample data
- `scripts/`: connection and data checks

## Offline (Plan B)
Install PostgreSQL 18, create a database `powerhouse`, change both lines in `.env` to the localhost address (see `.env.example`), then `npm run db:deploy` and `npm run db:seed`.

## Endpoints (all JSON, all under `/api`)
🔓 anyone · 👤 customer login · 🔒 staff login. Errors always look like `{ "error": { "code", "message" } }`.

| | Method | Path | What it does |
|---|---|---|---|
| 🔓 | GET | `/api/health` | API + database up? |
| 🔓 | GET | `/api/products?category=&q=` | Product list (category `part` / `accessory` / `prebuilt`, search) |
| 🔓 | GET | `/api/products/:sku` | One product |
| 🔓 | POST | `/api/quote` | Price a cart from database prices: subtotal, shipping (₱150, free from ₱30,000), total |
| 🔓 | GET | `/api/settings` | Shipping rules, supplier online? |
| 🔓 | GET | `/api/trade-ins/suggest?type=&condition=` | Suggested trade-in offer (60 / 45 / 30%) |
| 🔓 | POST | `/api/auth/signup` · `/api/auth/login` · `/api/auth/logout` | Customer account |
| 👤 | GET / PUT | `/api/me` | My profile (null when logged out) / edit name, email, phone |
| 👤 | PUT | `/api/me/address` · `/api/me/password` | Saved address · change password |
| 👤 | POST | `/api/payments/gcash-sim` | GCash **SIMULATED**: `outcome` `pay` gives a one-time `SIM-GC-` reference, `fail` places nothing |
| 👤 | POST | `/api/orders` | Place an order: check stock + save + deduct stock in **one transaction** (D6) |
| 👤 | GET | `/api/me/orders` · `/api/orders/:id` | My orders · one order (staff can open any) |
| 👤 | PUT | `/api/orders/:id/cancel` | Cancel before Shipping; stock comes back (D5) |
| 👤 | POST / GET | `/api/trade-ins` · `/api/me/trade-ins` | Sell to Us: submit · my trade-ins |
| 👤 | PUT | `/api/trade-ins/:id/answer` | Accept or decline an offer (`{ "accept": true }`) |
| 🔓 | POST | `/api/staff/login` · `/api/staff/logout` | Staff login |
| 🔒 | GET | `/api/staff/orders?customerId=` | All orders / by customer |
| 🔒 | PUT | `/api/staff/orders/:id/status` · `/api/staff/orders/:id/cancel` | Next status, one step at a time · cancel |
| 🔒 | GET / POST | `/api/staff/products` | Inventory · add product |
| 🔒 | PUT / POST | `/api/staff/products/:sku` · `/api/staff/products/:sku/restock` | Edit (not stock) · add stock |
| 🔒 | GET | `/api/staff/low-stock` | At or below each product's own level + suggested reorder (D7, D10) |
| 🔒 | GET / POST | `/api/staff/purchase-orders` | Reorders to the **SIMULATED** supplier |
| 🔒 | PUT | `/api/staff/purchase-orders/:po/ship` · `.../receive` | Supplier steps; receive adds stock |
| 🔒 | PUT | `/api/staff/settings/supplier` | Turn the SIMULATED supplier on/off (demo) |
| 🔒 | GET | `/api/staff/stock-movements` | Stock log |
| 🔒 | GET / PUT | `/api/staff/trade-ins` · `.../:id/offer` · `/reject` · `/receive` · `/to-stock` | Review trade-ins |
| 🔓* | POST | `/api/demo/reset` | Sample data back (*only when `ALLOW_DEMO_RESET=true`) |

## Security in the code
- Passwords: bcrypt hashes only; logins in an httpOnly, SameSite cookie; new session id after login
- Every staff route checks the staff login on the server; customers only reach their own orders and trade-ins
- Every input checked on the server (the browser's checks don't count); prices always come from the database
- Prisma only (no SQL built from user input); 20 login tries per 10 minutes; CORS only for our own site
- Friendly error messages, never stack traces
