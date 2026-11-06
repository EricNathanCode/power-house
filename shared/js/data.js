/* Power House sample data (SAMPLE DATA ONLY: no real people, prices are made up).
   This is the starting state of the mock warehouse database. The mock API copies it into
   localStorage on first load; "Reset demo data" puts it back. */
window.PH = window.PH || {};

PH.SEED = {
  version: 4,
  products: [
    // PC parts
    { sku: "CPU-6C-12T", name: "6-core Desktop CPU (Sample)", category: "part", type: "CPU", price: 7990, stock: 8, lowStockLevel: 3, condition: "new", art: "cpu",
      specs: { Cores: "6 cores, 12 threads", "Base clock": "3.6 GHz", Socket: "AM4 (sample)", Warranty: "1 year" } },
    { sku: "MB-B550-ATX", name: "B550 ATX Motherboard (Sample)", category: "part", type: "Motherboard", price: 6450, stock: 5, lowStockLevel: 2, condition: "new", art: "mb",
      specs: { "Form factor": "ATX", Socket: "AM4 (sample)", "RAM slots": "4 × DDR4", Warranty: "1 year" } },
    { sku: "RAM-DDR4-16GB", name: "DDR4 16GB RAM 3200MHz", category: "part", type: "RAM", price: 2450, stock: 12, lowStockLevel: 10, condition: "new", art: "ram",
      specs: { Capacity: "16GB", Speed: "3200MHz", Type: "DDR4 desktop", Warranty: "1 year" } },
    { sku: "RAM-DDR4-8GB", name: "DDR4 8GB RAM 3200MHz", category: "part", type: "RAM", price: 1350, stock: 7, lowStockLevel: 5, condition: "new", art: "ram8",
      specs: { Capacity: "8GB", Speed: "3200MHz", Type: "DDR4 desktop", Warranty: "1 year" } },
    { sku: "RAM-DDR4-16GB-USED", name: "DDR4 16GB RAM (Used, Good)", category: "part", type: "RAM", price: 1500, stock: 1, lowStockLevel: 0, condition: "used", art: "ram",
      specs: { Capacity: "16GB", Speed: "3200MHz", Condition: "Good, tested by staff", Warranty: "30 days" } },
    { sku: "SSD-NVME-1TB", name: "1TB NVMe SSD", category: "part", type: "Storage", price: 3990, stock: 4, lowStockLevel: 5, condition: "new", art: "ssd",
      specs: { Capacity: "1TB", Interface: "NVMe M.2", "Read speed": "3,500 MB/s", Warranty: "3 years" } },
    { sku: "SSD-NVME-512", name: "512GB NVMe SSD", category: "part", type: "Storage", price: 2290, stock: 0, lowStockLevel: 10, condition: "new", art: "ssd",
      specs: { Capacity: "512GB", Interface: "NVMe M.2", "Read speed": "3,000 MB/s", Warranty: "3 years" } },
    { sku: "HDD-2TB-72", name: "2TB HDD 7200RPM", category: "part", type: "Storage", price: 2890, stock: 9, lowStockLevel: 4, condition: "new", art: "hdd",
      specs: { Capacity: "2TB", Speed: "7200 RPM", Size: "3.5 inch", Warranty: "2 years" } },
    { sku: "GPU-8GB", name: "8GB Graphics Card (Sample)", category: "part", type: "GPU", price: 20000, stock: 3, lowStockLevel: 2, condition: "new", art: "gpu",
      specs: { Memory: "8GB GDDR6", Outputs: "HDMI + 3 × DP", Power: "650W PSU suggested", Warranty: "2 years" } },
    { sku: "PSU-650-B", name: "650W 80+ Bronze PSU", category: "part", type: "Power supply", price: 3250, stock: 10, lowStockLevel: 4, condition: "new", art: "psu",
      specs: { Power: "650W", Rating: "80+ Bronze", Cables: "Non-modular", Warranty: "3 years" } },
    // accessories
    { sku: "KB-MECH-001", name: "Mechanical Keyboard RGB", category: "accessory", type: "Keyboard", price: 2190, stock: 25, lowStockLevel: 15, condition: "new", art: "kb",
      specs: { Switches: "Blue (sample)", Layout: "Full size", Lighting: "RGB", Warranty: "1 year" } },
    { sku: "MS-WL-01", name: "Wireless Mouse", category: "accessory", type: "Mouse", price: 690, stock: 30, lowStockLevel: 15, condition: "new", art: "mouse",
      specs: { Sensor: "Optical, 3200 DPI", Battery: "AA × 1", Connection: "2.4 GHz USB", Warranty: "1 year" } },
    { sku: "HS-GAME-01", name: "Gaming Headset", category: "accessory", type: "Headset", price: 1490, stock: 4, lowStockLevel: 6, condition: "new", art: "headset",
      specs: { Driver: "50mm", Mic: "Fold-away", Connection: "3.5mm + USB", Warranty: "1 year" } },
    { sku: "MON-24-144", name: "24-inch 144Hz Monitor", category: "accessory", type: "Monitor", price: 8990, stock: 6, lowStockLevel: 3, condition: "new", art: "monitor",
      specs: { Size: "24 inch", Refresh: "144Hz", Panel: "IPS", Warranty: "2 years" } },
    // prebuilt desktops
    { sku: "PC-PH-STARTER", name: "Gaming PC Starter", category: "prebuilt", type: "Gaming PC", price: 38500, stock: 3, lowStockLevel: 2, condition: "new", art: "pc",
      specs: { CPU: "6-core, 12-thread", RAM: "DDR4 16GB 3200MHz", Storage: "1TB NVMe SSD", Graphics: "8GB GPU", Power: "650W 80+ Bronze", Warranty: "1 year, Power House" } },
    { sku: "PC-PH-OFFICE", name: "Office PC Basic", category: "prebuilt", type: "Office PC", price: 21900, stock: 4, lowStockLevel: 2, condition: "new", art: "pc",
      specs: { CPU: "4-core, 8-thread", RAM: "DDR4 8GB", Storage: "512GB NVMe SSD", Graphics: "Built-in", Power: "450W", Warranty: "1 year, Power House" } }
  ],

  customers: [
    { id: "CUST-001", name: "Test Customer 1", email: "test1@example.com", password: "sample123", phone: "0917 000 0012", address: { street: "123 Sample St.", city: "Indang, Cavite", zip: "4122" }, since: "2026-10-02" },
    { id: "CUST-002", name: "Test Customer 2", email: "test2@example.com", password: "sample123", phone: "0918 000 0022", address: { street: "45 Example Ave.", city: "Dasmariñas, Cavite", zip: "4114" }, since: "2026-10-05" },
    { id: "CUST-003", name: "Test Customer 3", email: "test3@example.com", password: "sample123", phone: "0919 000 0033", address: { street: "7 Demo Rd.", city: "Imus, Cavite", zip: "4103" }, since: "2026-10-11" },
    { id: "CUST-004", name: "Test Customer 4", email: "test4@example.com", password: "sample123", phone: "0920 000 0044", address: { street: "9 Mock Lane", city: "Trece Martires, Cavite", zip: "4109" }, since: "2026-10-20" }
  ],

  staff: [{ username: "staff01", password: "staff123", name: "staff01" }],

  /* ORDERS: one of each status, so every step is easy to see.
     ORD-0001 Placed: staff can Mark as Packing or Cancel; the customer can cancel too
     ORD-0002 Packing: the customer can still cancel
     ORD-0003 Shipping: cancel is blocked from here on
     ORD-0004 Out for Delivery · ORD-0005 Received (done)
     ORD-0006 Cancelled by the customer · ORD-0007 Cancelled by staff (stock went back both times) */
  orders: [
    { id: "ORD-0001", customerId: "CUST-001", items: [{ sku: "MS-WL-01", name: "Wireless Mouse", qty: 1, price: 690 }], shipping: 150, total: 840, paymentMethod: "COD", paymentRef: null, status: "Placed", address: "123 Sample St., Indang, Cavite 4122", createdAt: "2026-11-06T08:30:00", history: [{ status: "Placed", at: "2026-11-06T08:30:00", by: "CUST-001" }] },
    { id: "ORD-0002", customerId: "CUST-001", items: [{ sku: "RAM-DDR4-16GB", name: "DDR4 16GB RAM 3200MHz", qty: 2, price: 2450 }], shipping: 150, total: 5050, paymentMethod: "GCASH_SIM", paymentRef: "SIM-GC-0001", status: "Packing", address: "123 Sample St., Indang, Cavite 4122", createdAt: "2026-11-05T14:10:00", history: [{ status: "Placed", at: "2026-11-05T14:10:00", by: "CUST-001" }, { status: "Packing", at: "2026-11-06T09:00:00", by: "staff01" }] },
    { id: "ORD-0003", customerId: "CUST-002", items: [{ sku: "PC-PH-STARTER", name: "Gaming PC Starter", qty: 1, price: 38500 }], shipping: 0, total: 38500, paymentMethod: "COD", paymentRef: null, status: "Shipping", address: "45 Example Ave., Dasmariñas, Cavite 4114", createdAt: "2026-11-04T10:00:00", history: [{ status: "Placed", at: "2026-11-04T10:00:00", by: "CUST-002" }, { status: "Packing", at: "2026-11-04T13:00:00", by: "staff01" }, { status: "Shipping", at: "2026-11-05T09:00:00", by: "staff01" }] },
    { id: "ORD-0004", customerId: "CUST-001", items: [{ sku: "KB-MECH-001", name: "Mechanical Keyboard RGB", qty: 1, price: 2190 }], shipping: 150, total: 2340, paymentMethod: "COD", paymentRef: null, status: "Out for Delivery", address: "123 Sample St., Indang, Cavite 4122", createdAt: "2026-11-03T09:00:00", history: [{ status: "Placed", at: "2026-11-03T09:00:00", by: "CUST-001" }, { status: "Packing", at: "2026-11-03T11:00:00", by: "staff01" }, { status: "Shipping", at: "2026-11-04T08:30:00", by: "staff01" }, { status: "Out for Delivery", at: "2026-11-06T08:00:00", by: "staff01" }] },
    { id: "ORD-0005", customerId: "CUST-001", items: [{ sku: "SSD-NVME-1TB", name: "1TB NVMe SSD", qty: 1, price: 3990 }], shipping: 150, total: 4140, paymentMethod: "COD", paymentRef: null, status: "Received", address: "123 Sample St., Indang, Cavite 4122", createdAt: "2026-11-01T11:00:00", history: [{ status: "Placed", at: "2026-11-01T11:00:00", by: "CUST-001" }, { status: "Packing", at: "2026-11-01T13:00:00", by: "staff01" }, { status: "Shipping", at: "2026-11-02T08:30:00", by: "staff01" }, { status: "Out for Delivery", at: "2026-11-03T09:00:00", by: "staff01" }, { status: "Received", at: "2026-11-03T15:20:00", by: "staff01" }] },
    { id: "ORD-0006", customerId: "CUST-001", items: [{ sku: "RAM-DDR4-8GB", name: "DDR4 8GB RAM 3200MHz", qty: 1, price: 1350 }], shipping: 150, total: 1500, paymentMethod: "COD", paymentRef: null, status: "Cancelled", address: "123 Sample St., Indang, Cavite 4122", createdAt: "2026-11-02T18:20:00", history: [{ status: "Placed", at: "2026-11-02T18:20:00", by: "CUST-001" }, { status: "Cancelled", at: "2026-11-02T19:05:00", by: "CUST-001" }] },
    { id: "ORD-0007", customerId: "CUST-002", items: [{ sku: "HS-GAME-01", name: "Gaming Headset", qty: 1, price: 1490 }], shipping: 150, total: 1640, paymentMethod: "COD", paymentRef: null, status: "Cancelled", address: "45 Example Ave., Dasmariñas, Cavite 4114", createdAt: "2026-11-02T09:40:00", history: [{ status: "Placed", at: "2026-11-02T09:40:00", by: "CUST-002" }, { status: "Cancelled", at: "2026-11-02T10:30:00", by: "staff01" }] }
  ],

  /* TRADE-INS (Sell to Us): one of each status.
     TRD-0001, TRD-0002 Under review: staff Send offer or Decline (TRD-0002 asks far too much, so try Decline)
     TRD-0003 Offer sent: the customer (test1) can Accept or Decline
     TRD-0004 Accepted: staff Mark received · TRD-0005 Received: staff Add to stock (used)
     TRD-0006 Declined by the customer · TRD-0007 Declined by staff · TRD-0008 Done, in stock */
  tradeIns: [
    { id: "TRD-0001", customerId: "CUST-001", category: "Accessories", type: "Mouse", brand: "Sample Brand", model: "Wireless Mouse", condition: "Fair", askingPrice: 300, suggestedOffer: 207, offer: null, photos: 2, status: "Under review", createdAt: "2026-11-06T09:00:00", history: [{ status: "Submitted", at: "2026-11-06T09:00:00" }] },
    { id: "TRD-0002", customerId: "CUST-002", category: "PC Parts", type: "Graphics card (GPU)", brand: "Sample Brand", model: "Old GPU 4GB", condition: "Fair", askingPrice: 15000, suggestedOffer: 6000, offer: null, photos: 1, status: "Under review", createdAt: "2026-11-06T07:45:00", history: [{ status: "Submitted", at: "2026-11-06T07:45:00" }] },
    { id: "TRD-0003", customerId: "CUST-001", category: "PC Parts", type: "Graphics card (GPU)", brand: "Sample Brand", model: "Sample GPU 8GB", condition: "Good", askingPrice: 10000, suggestedOffer: 9000, offer: 9000, photos: 3, status: "Offer sent", createdAt: "2026-11-04T13:00:00", history: [{ status: "Submitted", at: "2026-11-04T13:00:00" }, { status: "Offer sent", at: "2026-11-05T10:00:00" }] },
    { id: "TRD-0004", customerId: "CUST-001", category: "PC Parts", type: "RAM", brand: "Sample Brand", model: "DDR4 16GB", condition: "Like new", askingPrice: 1500, suggestedOffer: 1470, offer: 1450, photos: 2, status: "Accepted", createdAt: "2026-11-03T15:00:00", history: [{ status: "Submitted", at: "2026-11-03T15:00:00" }, { status: "Offer sent", at: "2026-11-04T09:00:00" }, { status: "Accepted", at: "2026-11-04T12:00:00" }] },
    { id: "TRD-0005", customerId: "CUST-002", category: "Accessories", type: "Keyboard", brand: "Sample Brand", model: "Office Keyboard", condition: "Good", askingPrice: 900, suggestedOffer: 986, offer: 950, photos: 2, status: "Received", createdAt: "2026-11-02T10:00:00", history: [{ status: "Submitted", at: "2026-11-02T10:00:00" }, { status: "Offer sent", at: "2026-11-02T16:00:00" }, { status: "Accepted", at: "2026-11-03T08:00:00" }, { status: "Received", at: "2026-11-05T11:00:00" }] },
    { id: "TRD-0006", customerId: "CUST-001", category: "PC Parts", type: "Storage (HDD)", brand: "Sample Brand", model: "1TB HDD", condition: "Fair", askingPrice: 1500, suggestedOffer: 1197, offer: 1000, photos: 1, status: "Declined", createdAt: "2026-11-01T10:00:00", history: [{ status: "Submitted", at: "2026-11-01T10:00:00" }, { status: "Offer sent", at: "2026-11-01T15:00:00" }, { status: "Declined", at: "2026-11-02T09:00:00" }] },
    { id: "TRD-0007", customerId: "CUST-001", category: "PC Parts", type: "PC case", brand: "Sample Brand", model: "Mid Tower Case", condition: "Fair", askingPrice: 2500, suggestedOffer: null, offer: null, photos: 1, status: "Rejected", note: "Sorry, we don't buy PC cases right now.", createdAt: "2026-10-30T10:00:00", history: [{ status: "Submitted", at: "2026-10-30T10:00:00" }, { status: "Rejected", at: "2026-10-30T16:00:00" }] },
    { id: "TRD-0008", customerId: "CUST-002", category: "PC Parts", type: "RAM", brand: "Sample Brand", model: "DDR4 16GB", condition: "Good", askingPrice: 1400, suggestedOffer: 1103, offer: 1100, photos: 2, status: "In stock", createdAt: "2026-10-25T10:00:00", history: [{ status: "Submitted", at: "2026-10-25T10:00:00" }, { status: "Offer sent", at: "2026-10-25T15:00:00" }, { status: "Accepted", at: "2026-10-26T09:00:00" }, { status: "Received", at: "2026-10-28T11:00:00" }, { status: "In stock", at: "2026-10-28T11:30:00" }] }
  ],

  // the fictional bulk supplier's catalog (SIMULATED). Supplier SKU → our SKU is the data mapping (Module 1).
  supplierCatalog: [
    { supplierSku: "GB-CPU-6C", sku: "CPU-6C-12T", unitPrice: 6300, minOrderQty: 5 },
    { supplierSku: "GB-MB-B550", sku: "MB-B550-ATX", unitPrice: 5100, minOrderQty: 5 },
    { supplierSku: "GB-RAM-16", sku: "RAM-DDR4-16GB", unitPrice: 1800, minOrderQty: 10 },
    { supplierSku: "GB-RAM-8", sku: "RAM-DDR4-8GB", unitPrice: 950, minOrderQty: 10 },
    { supplierSku: "GB-SSD-1TB", sku: "SSD-NVME-1TB", unitPrice: 3100, minOrderQty: 10 },
    { supplierSku: "GB-SSD-512", sku: "SSD-NVME-512", unitPrice: 2100, minOrderQty: 10 },
    { supplierSku: "GB-HDD-2TB", sku: "HDD-2TB-72", unitPrice: 2200, minOrderQty: 5 },
    { supplierSku: "GB-GPU-8G", sku: "GPU-8GB", unitPrice: 16500, minOrderQty: 2 },
    { supplierSku: "GB-PSU-650", sku: "PSU-650-B", unitPrice: 2500, minOrderQty: 5 },
    { supplierSku: "GB-KB-01", sku: "KB-MECH-001", unitPrice: 1200, minOrderQty: 20 },
    { supplierSku: "GB-MS-01", sku: "MS-WL-01", unitPrice: 380, minOrderQty: 20 },
    { supplierSku: "GB-HS-01", sku: "HS-GAME-01", unitPrice: 900, minOrderQty: 10 },
    { supplierSku: "GB-MON-24", sku: "MON-24-144", unitPrice: 7100, minOrderQty: 3 }
  ],

  /* SUPPLIER REORDERS (SIMULATED supplier): one of each status.
     PO-0001 Delivered (+20 keyboards) · PO-0002 Shipped: Simulate delivery · PO-0003 Confirmed: Mark shipped
     Low stock now: 1TB NVMe SSD has no reorder yet (try Approve reorder); 512GB SSD and Gaming Headset already have one */
  purchaseOrders: [
    { poNumber: "PO-0001", sku: "KB-MECH-001", supplierSku: "GB-KB-01", qty: 20, unitPrice: 1200, status: "DELIVERED", approvedBy: "staff01", createdAt: "2026-11-01T10:00:00", shippedAt: "2026-11-02T09:00:00", deliveredAt: "2026-11-04T09:30:00" },
    { poNumber: "PO-0002", sku: "SSD-NVME-512", supplierSku: "GB-SSD-512", qty: 30, unitPrice: 2100, status: "SHIPPED", approvedBy: "staff01", createdAt: "2026-11-04T09:00:00", shippedAt: "2026-11-05T16:00:00" },
    { poNumber: "PO-0003", sku: "HS-GAME-01", supplierSku: "GB-HS-01", qty: 10, unitPrice: 900, status: "CONFIRMED", approvedBy: "staff01", createdAt: "2026-11-06T08:00:00" }
  ],

  stockMovements: [
    { id: "MOV-0001", sku: "RAM-DDR4-16GB-USED", change: 1, reason: "tradeIn", refId: "TRD-0008", at: "2026-10-28T11:30:00" },
    { id: "MOV-0002", sku: "SSD-NVME-1TB", change: -1, reason: "sale", refId: "ORD-0005", at: "2026-11-01T11:00:00" },
    { id: "MOV-0003", sku: "HS-GAME-01", change: -1, reason: "sale", refId: "ORD-0007", at: "2026-11-02T09:40:00" },
    { id: "MOV-0004", sku: "HS-GAME-01", change: 1, reason: "cancel", refId: "ORD-0007", at: "2026-11-02T10:30:00" },
    { id: "MOV-0005", sku: "RAM-DDR4-8GB", change: -1, reason: "sale", refId: "ORD-0006", at: "2026-11-02T18:20:00" },
    { id: "MOV-0006", sku: "RAM-DDR4-8GB", change: 1, reason: "cancel", refId: "ORD-0006", at: "2026-11-02T19:05:00" },
    { id: "MOV-0007", sku: "KB-MECH-001", change: -1, reason: "sale", refId: "ORD-0004", at: "2026-11-03T09:00:00" },
    { id: "MOV-0008", sku: "PC-PH-STARTER", change: -1, reason: "sale", refId: "ORD-0003", at: "2026-11-04T10:00:00" },
    { id: "MOV-0009", sku: "KB-MECH-001", change: 20, reason: "supplier", refId: "PO-0001", at: "2026-11-04T09:30:00" },
    { id: "MOV-0010", sku: "RAM-DDR4-16GB", change: -2, reason: "sale", refId: "ORD-0002", at: "2026-11-05T14:10:00" },
    { id: "MOV-0011", sku: "MS-WL-01", change: -1, reason: "sale", refId: "ORD-0001", at: "2026-11-06T08:30:00" }
  ],

  settings: { supplierOnline: true, supplierName: "[Supplier name TBD]" }
};

// Cities for the type-to-search field (sample list, Cavite and nearby)
PH.CITIES = ["Alfonso, Cavite", "Amadeo, Cavite", "Bacoor, Cavite", "Carmona, Cavite", "Cavite City, Cavite", "Dasmariñas, Cavite", "General Trias, Cavite", "Imus, Cavite", "Indang, Cavite",
  "Kawit, Cavite", "Magallanes, Cavite", "Maragondon, Cavite", "Mendez, Cavite", "Naic, Cavite", "Noveleta, Cavite", "Rosario, Cavite", "Silang, Cavite", "Tagaytay, Cavite", "Tanza, Cavite",
  "Ternate, Cavite", "Trece Martires, Cavite", "Infanta, Quezon", "Calamba, Laguna", "Santa Rosa, Laguna", "Biñan, Laguna", "Las Piñas, Metro Manila", "Muntinlupa, Metro Manila"];

// Part types for the Sell to Us type-to-search field
PH.PART_TYPES = {
  "PC Parts": ["CPU", "Motherboard", "RAM", "Storage (SSD)", "Storage (HDD)", "Graphics card (GPU)", "Graphics card cooler", "Power supply", "PC case", "CPU cooler"],
  "Accessories": ["Keyboard", "Mouse", "Headset", "Monitor", "Webcam", "Speakers"],
  "Prebuilt PC": ["Gaming PC", "Office PC", "Mini PC"]
};
