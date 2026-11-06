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

| Who | Login (sample only) |
|---|---|
| Customer | `test1@example.com` / `sample123` |
| Staff | `staff01` / `staff123` |

**Reset demo data:** the link in the store footer, or the button in Staff → Overview.

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
