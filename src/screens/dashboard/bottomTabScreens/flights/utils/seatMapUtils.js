import { CABIN_ZONES, SEAT_PRICE_BY_TYPE, SEAT_STATUS, SEAT_TYPES, AISLE_AFTER, TOTAL_ROWS, SEATS_PER_ROW } from "../constants/seatMapConstants";

export function buildSeatNumber(row, seatIndex) {
  return `${row}${["A", "B", "C", "D"][seatIndex]}`;
}

export function getSeatColumnLabel(seatIndex) {
  return ["A", "B", "C", "D"][seatIndex] || "";
}

export function getRowZone(row) {
  return CABIN_ZONES.find((zone) => zone.rows.includes(row)) || CABIN_ZONES[CABIN_ZONES.length - 1];
}

export function getSeatType(row, seatIndex) {
  if (row === 1 || row === 2) return SEAT_TYPES.BUSINESS;
  if (row === 3 || row === 12 || row === 22) return SEAT_TYPES.EXIT_ROW;
  if (row >= 4 && row <= 7) return SEAT_TYPES.PREMIUM;
  return SEAT_TYPES.STANDARD;
}

export function getSeatPrice(row, seatIndex) {
  const seatType = getSeatType(row, seatIndex);
  return SEAT_PRICE_BY_TYPE[seatType] || 0;
}

export function buildSeatMap(seedSelectedLabels = []) {
  const selectedLookup = new Set(seedSelectedLabels);
  const seats = [];

  for (let row = 1; row <= TOTAL_ROWS; row += 1) {
    for (let seatIndex = 0; seatIndex < SEATS_PER_ROW; seatIndex += 1) {
      const seatNumber = buildSeatNumber(row, seatIndex);
      const type = getSeatType(row, seatIndex);
      const price = getSeatPrice(row, seatIndex);
      const isExit = row === 3 || row === 12 || row === 22;
      const isWing = row >= 10 && row <= 18;
      const isBlocked = row === 1 && seatIndex === 1;
      const isReserved = row === 2 && seatIndex === 3;
      const isBooked = (row % 4 === 0 && seatIndex === 1) || (row % 6 === 0 && seatIndex === 2) || (row === 5 && seatIndex === 0);
      const status = isBlocked
        ? SEAT_STATUS.BLOCKED
        : isBooked
          ? SEAT_STATUS.BOOKED
          : isReserved
            ? SEAT_STATUS.RESERVED
            : selectedLookup.has(seatNumber)
              ? SEAT_STATUS.SELECTED
              : SEAT_STATUS.AVAILABLE;

      seats.push({
        id: seatNumber,
        seatNumber,
        row,
        seatLetter: getSeatColumnLabel(seatIndex),
        seatIndex,
        price,
        status,
        type,
        isExit,
        isWing,
        isWindow: seatIndex === 0 || seatIndex === SEATS_PER_ROW - 1,
        isAisle: seatIndex === 1 || seatIndex === 2,
        isMiddle: false,
        features: {
          extraLegroom: isExit || type === SEAT_TYPES.BUSINESS,
          nearExit: isExit,
          mealIncluded: type === SEAT_TYPES.BUSINESS,
        },
      });
    }
  }

  return seats;
}

export function formatCurrency(value) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0))}`;
}

