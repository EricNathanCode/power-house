# power-house
Power House: PC hardware online store + warehouse REST API. ITEC 116 final project (BSIT 4-5, Group 2). Sample data only; supplier and GCash are simulated.

## What's here now: frontend only (HTML, CSS, JavaScript)
There is no backend yet. `shared/js/api.js` is a **mock warehouse API** that keeps the data in the browser (localStorage), so every page works and the rules can be tested today. Later, each function in `api.js` gets replaced by a `fetch()` to the real Node + Express API; the endpoint is written above each function.

```
power-house/
├── store-web/            customer store (12 pages)
│   ├── index.html        Home
│   ├── products.html     Category / search (chips, filters, sort)
│   ├── product.html      Product detail (qty limited to stock)
│   ├── cart.html         Cart (+ empty state)
│   ├── checkout.html     Checkout in 4 steps, COD or GCash (SIMULATED)
│   ├── order.html        Order placed (receipt)
│   ├── orders.html       My Orders (tracker, cancel before Shipping)
│   ├── signup.html / login.html
│   ├── account.html      My Account (dark mode switch)
│   ├── sell.html         Sell to Us in 4 steps
│   └── trade-ins.html    My trade-ins (accept / decline offer)
├── staff-dashboard/      Staff Portal
│   ├── login.html
│   └── index.html        tabs: Overview · Orders · Inventory · Low stock · Reorders · Trade-ins · Stock log
└── shared/
    ├── css/style.css     neumorphism + blue palette, light and dark
    ├── js/data.js        sample data (products, customers, orders, trade-ins, supplier catalog)
    ├── js/api.js         MOCK warehouse API (swap for fetch() later)
    ├── js/ui.js          header, footer, icons, badges, dialogs, input masks
    └── img/              4 photos (CC BY-SA 4.0, credits in photo-credits.json)
```

## How to run
1. Open the folder in **VS Code**.
2. Install the **Live Server** extension, right-click `store-web/index.html` → **Open with Live Server**.
   (Or run `python -m http.server 5500` in this folder and open http://localhost:5500/store-web/index.html.)
3. Use a local server rather than double-clicking the file, so every page shares the same saved data.

### Page links (after you start Live Server or the python server)
| Part | Open this | Code |
|---|---|---|
| 🛒 Store (customer) | http://localhost:5500/store-web/index.html | [store-web/index.html](store-web/index.html) |
| 🔑 Customer log in | http://localhost:5500/store-web/login.html | [store-web/login.html](store-web/login.html) |
| 🔑 Customer sign up | http://localhost:5500/store-web/signup.html | [store-web/signup.html](store-web/signup.html) |
| 💰 Sell to Us | http://localhost:5500/store-web/sell.html | [store-web/sell.html](store-web/sell.html) |
| 💰 My trade-ins (offer status) | http://localhost:5500/store-web/trade-ins.html | [store-web/trade-ins.html](store-web/trade-ins.html) |
| 🏭 Staff Portal (log in) | http://localhost:5500/staff-dashboard/login.html | [staff-dashboard/login.html](staff-dashboard/login.html) |
| 🏭 Staff dashboard (after login) | http://localhost:5500/staff-dashboard/index.html | [staff-dashboard/index.html](staff-dashboard/index.html) |

Staff dashboard tabs open directly too, e.g. `…/staff-dashboard/index.html#trade-ins` (Sell to Us reviews), `#inventory`, `#low-stock`, `#stock-log`.

| Who | Login (sample only) |
|---|---|
| Customer | `test1@example.com` / `sample123` |
| Staff | `staff01` / `staff123` |

**Reset demo data:** the link in the store footer, or the button in Staff → Overview.

## Sample data: one of each status (so you can see approve and decline)
| Record | Status now | Try this | You should see |
|---|---|---|---|
| ORD-0001 | Placed | Staff → Orders → **Mark as Packing** (approve) or **Cancel** | Packing / "Cancelled · by staff", stock goes back |
| ORD-0002 | Packing | Customer → My Orders → **Cancel order** | "Cancelled · by the customer", stock goes back |
| ORD-0003 | Shipping | Customer → try to cancel | Blocked: "already shipped" |
| ORD-0004 / 0005 | Out for Delivery / Received | Staff → **Mark as Received** on 0004 | Order finished |
| ORD-0006 / 0007 | Cancelled | (just look) | "by the customer" / "by staff" |
| TRD-0001 | Under review | Staff → Trade-ins → **Send offer** (approve) | Offer sent → the customer can answer |
| TRD-0002 | Under review (asks ₱15,000, offer ₱6,000) | Staff → **Decline** | Red "Declined by staff", the customer sees the reason |
| TRD-0003 | Offer sent ₱9,000 | Customer → My trade-ins → **Accept** or **Decline** | "Offer accepted" or red "Declined by customer" |
| TRD-0004 | Offer accepted | Staff → **Mark received** | Received |
| TRD-0005 | Received | Staff → **Add to stock (used)** | In stock as a used SKU |
| TRD-0006 / 0007 / 0008 | Declined by customer / Declined by staff / In stock | (just look) | Each result in its own color |
| 1TB NVMe SSD | Low stock, no reorder yet | Staff → Low stock → **Approve reorder** | New PO, Confirmed |
| PO-0003 / PO-0002 | Confirmed / Shipped | Staff → Reorders → **Mark shipped** / **Simulate delivery** | Stock goes up, shows in Stock log |

Customer `test1@example.com` owns ORD-0001/0002/0004/0005/0006 and TRD-0001/0003/0004/0006/0007. Staff → Trade-ins has filter chips (To review, Waiting for customer, To receive, To add to stock, Done, Declined).

## Rules the mock API already follows
- Stock goes down the moment an order is placed; check + save + deduct happen together, all or nothing (D6)
- Cancel only before Shipping; cancelling puts the stock back (D5)
- Each product has its own low-stock level; suggested reorder = max(supplier minimum, 3 × low level − stock), staff approve (D7, D10)
- Order status moves one step at a time: Placed → Packing → Shipping → Out for Delivery → Received
- GCash is **SIMULATED**: a pretend payment screen with Pay and Fail buttons; no real money (D8)
- The bulk supplier is a **fictional company (SIMULATED)**; you can switch it "off" to test the unavailable case
- Trade-in offer = Like new 60%, Good 45%, Fair 30% of our retail price; staff can change it (D11)
- Every stock change is logged with a reason (sale, cancel, supplier, trade-in, restock)

## Quick test ideas (for the 3 required test cases)
- **Normal:** log in, add 2 × DDR4 16GB RAM, check out with COD → stock drops from 12 to 10, the order shows in Staff → Orders
- **Invalid input:** checkout with mobile `1234` or ZIP `12` → the field shows an error and you can't continue
- **Missing part:** Staff → Reorders → switch the supplier off → Low stock → Approve reorder → "Supplier unavailable (simulated)"

## Team rules
- Never commit passwords or `.env` (already in `.gitignore`)
- Use sample data only; label anything mocked as SIMULATED
- One GitHub Issue per task; work on a branch, then open a pull request
