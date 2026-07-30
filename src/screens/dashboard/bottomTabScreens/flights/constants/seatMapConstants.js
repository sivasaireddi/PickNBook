export const SEAT_STATUS = {
  AVAILABLE: "available",
  BOOKED: "booked",
  SELECTED: "selected",
  RESERVED: "reserved",
  UNAVAILABLE: "unavailable",
  BLOCKED: "blocked",
};

export const SEAT_TYPES = {
  STANDARD: "standard",
  BUSINESS: "business",
  PREMIUM: "premium",
  EXIT_ROW: "exitRow",
};

export const CABIN_ZONES = [
  { key: "business", label: "Business Class", rows: [1, 2], type: SEAT_TYPES.BUSINESS },
  { key: "premium", label: "Premium Economy", rows: [3, 4, 5, 6, 7], type: SEAT_TYPES.PREMIUM },
  { key: "economy", label: "Economy", rows: Array.from({ length: 23 }, (_, index) => index + 8), type: SEAT_TYPES.STANDARD },
];

export const SEAT_PRICE_BY_TYPE = {
  [SEAT_TYPES.STANDARD]: 0,
  [SEAT_TYPES.BUSINESS]: 1200,
  [SEAT_TYPES.PREMIUM]: 350,
  [SEAT_TYPES.EXIT_ROW]: 700,
};

export const AISLE_AFTER = 1; // Aisle after index 1 (B), so between B and C
export const TOTAL_ROWS = 30;
export const SEATS_PER_ROW = 4;

