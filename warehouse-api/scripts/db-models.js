/* every table, in an order where a row's parent is always saved / loaded before the row itself */
const MODELS = [
  "staff", "customer", "product", "productImage", "supplierProduct", "stockMovement",
  "order", "orderItem", "orderHistory", "purchaseOrder",
  "tradeIn", "tradeInHistory", "tradeInPhoto", "setting", "idCounter"
];
// tables with an automatic number id: after a restore, the next number must continue after the highest one
const AUTO_ID = { orderItem: "order_items", orderHistory: "order_history", tradeInHistory: "trade_in_history", tradeInPhoto: "trade_in_photos" };

module.exports = { MODELS, AUTO_ID };
