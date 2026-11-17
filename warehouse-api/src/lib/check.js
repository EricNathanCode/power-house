/* Input checks. The website checks too, but the API never trusts the browser (security checklist).
   Each function returns the cleaned value or throws a 400 error with a message people can read. */
const { bad } = require("./errors");

function text(v, label, { min = 1, max = 200 } = {}) {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length < min) throw bad(min > 1 ? `${label}: at least ${min} characters.` : `Enter ${label.toLowerCase()}.`, { field: label });
  if (s.length > max) throw bad(`${label}: at most ${max} characters.`, { field: label });
  return s;
}

function int(v, label, { min = 0, max = 10_000_000 } = {}) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (!Number.isInteger(n)) throw bad(`${label} must be a whole number.`, { field: label });
  if (n < min) throw bad(`${label} must be at least ${min}.`, { field: label });
  if (n > max) throw bad(`${label} must be at most ${max}.`, { field: label });
  return n;
}

/* product specs: { "Socket": "AM4", ... } -> [["Socket", "AM4"], ...] (a list keeps the order; empty rows are dropped) */
function specs(v) {
  if (v === null || typeof v !== "object" || Array.isArray(v)) throw bad("Specs must be a list of labels and values.", { field: "Specs" });
  const rows = Object.entries(v).map(([k, x]) => [String(k).trim(), typeof x === "string" || typeof x === "number" ? String(x).trim() : ""]).filter(([k, x]) => k || x);
  if (rows.length > 20) throw bad("Specs: at most 20 rows.", { field: "Specs" });
  for (const [k, x] of rows) {
    if (!k || !x) throw bad("Specs: every row needs a label and a value.", { field: "Specs" });
    if (k.length > 40) throw bad(`Specs: "${k.slice(0, 20)}…" label is too long (40 characters max).`, { field: "Specs" });
    if (x.length > 120) throw bad(`Specs: the value for "${k}" is too long (120 characters max).`, { field: "Specs" });
  }
  return rows;
}

function email(v) {
  const s = text(v, "Email", { max: 120 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad("Enter an email like name@example.com.", { field: "Email" });
  return s;
}

/* PH mobile: 11 digits starting with 09, saved as "0917 000 0012". Empty is allowed. */
function phone(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (!d) return "";
  if (!/^09\d{9}$/.test(d)) throw bad("Use 11 digits starting with 09, or leave it empty.", { field: "Phone" });
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

function password(v, label = "Password") {
  const s = typeof v === "string" ? v : "";
  if (s.length < 8 || !/\d/.test(s)) throw bad("Use at least 8 characters with one number.", { field: label });
  if (s.length > 72) throw bad("Use at most 72 characters.", { field: label }); // bcrypt only reads 72 bytes
  return s;
}

function zip(v) {
  const s = String(v || "").trim();
  if (!/^\d{4}$/.test(s)) throw bad("ZIP codes have 4 digits.", { field: "ZIP" });
  return s;
}

function oneOf(v, label, allowed) {
  if (!allowed.includes(v)) throw bad(`${label} must be one of: ${allowed.join(", ")}.`, { field: label });
  return v;
}

const sku = (v) => {
  const s = String(v || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(s)) throw bad("SKU: at least 4 capital letters, numbers or dashes.", { field: "SKU" });
  return s;
};

module.exports = { text, int, email, phone, password, zip, oneOf, sku, specs };
