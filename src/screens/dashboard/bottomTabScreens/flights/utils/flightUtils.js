import { TRAVEL_CLASSES } from "../constants/flightConstants";

export function normalizeCityName(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const map = {
    hyd: "Hyderabad",
    bom: "Mumbai",
    del: "Delhi",
    blr: "Bengaluru",
    maa: "Chennai",
    ccu: "Kolkata",
    pnq: "Pune",
    amd: "Ahmedabad",
    jai: "Jaipur",
    cok: "Kochi",
    goi: "Goa",
    vga: "Vijayawada",
    vtz: "Visakhapatnam",
    dxb: "Dubai",
    doh: "Doha",
    lhr: "London",
    jfk: "New York",
  };

  return map[text.toLowerCase()] || text;
}

export function cityCode(name, fallback = "") {
  const clean = String(name || "").replace(/[^a-zA-Z ]/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= 3) return clean.toUpperCase();
  const parts = clean.split(/\s+/).filter(Boolean);
  return `${parts[0][0]}${parts[1]?.[0] || ""}${parts[parts.length - 1][0] || ""}`
    .slice(0, 3)
    .toUpperCase();
}

export function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(Number(value) || 0)
  )}`;
}

export function parseDateInput(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function toDateInputValue(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const tzOffset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

export function validateFlightSearch(values) {
  const errors = {};
  if (!values.from) errors.from = "Select a departure city.";
  if (!values.to) errors.to = "Select an arrival city.";
  if (values.from && values.to && values.from.trim().toLowerCase() === values.to.trim().toLowerCase()) {
    errors.to = "From and To cannot be the same.";
  }
  if (!values.date) errors.date = "Select a departure date.";
  if (values.tripType === "twoway" && !values.returnDate) errors.returnDate = "Select a return date.";
  if (values.tripType === "twoway" && values.returnDate && values.date && new Date(values.returnDate) < new Date(values.date)) {
    errors.returnDate = "Return date must be on or after departure date.";
  }
  return errors;
}

export function cleanFareRuleHtml(rawHtml) {
  if (!rawHtml) return "";
  let text = String(rawHtml);
  
  // Replace HTML headers/breaks with clean newlines and formatting
  text = text.replace(/<h4[^>]*>/gi, "\n\n📌 ");
  text = text.replace(/<\/h4>/gi, "\n");
  text = text.replace(/<tr[^>]*>/gi, "\n");
  text = text.replace(/<td[^>]*>/gi, " ");
  text = text.replace(/<\/td>/gi, "  ");
  text = text.replace(/<br\s*[\/]?>/gi, "\n");
  text = text.replace(/<p[^>]*>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  
  // Strip any remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Clean HTML entities & extra whitespace
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/__be__/g, "");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n\s*\n+/g, "\n\n");
  
  return text.trim();
}
