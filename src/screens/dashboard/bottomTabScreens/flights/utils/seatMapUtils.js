import { SEAT_STATUS, SEAT_TYPES } from "../constants/seatMapConstants";

function extractAllSeatObjects(obj, depth = 0, parentContext = {}) {
  if (!obj || depth > 8) return [];
  let seats = [];

  let currentContext = { ...parentContext };
  if (typeof obj === "object" && !Array.isArray(obj)) {
    if (obj.AirlineCode) currentContext.AirlineCode = obj.AirlineCode;
    if (obj.FlightNumber || obj.AirlineNumber) currentContext.FlightNumber = obj.FlightNumber || obj.AirlineNumber;
    if (obj.Origin || obj.FromAirportCode) currentContext.Origin = obj.Origin || obj.FromAirportCode;
    if (obj.Destination || obj.ToAirportCode) currentContext.Destination = obj.Destination || obj.ToAirportCode;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      seats.push(...extractAllSeatObjects(item, depth + 1, currentContext));
    }
  } else if (typeof obj === "object") {
    if (obj.Code || obj.SeatNo || obj.SeatNumber || obj.Number || (obj.RowNo && obj.Column)) {
      seats.push({
        ...currentContext,
        ...obj
      });
    } else {
      for (const key of Object.keys(obj)) {
        if (obj[key] && typeof obj[key] === "object") {
          seats.push(...extractAllSeatObjects(obj[key], depth + 1, currentContext));
        }
      }
    }
  }
  return seats;
}

export function parseSrdvSeatMap(srdvData, seedSelectedLabels = []) {
  if (!srdvData) return [];
  const selectedLookup = new Set(seedSelectedLabels);

  const rawSeats = extractAllSeatObjects(srdvData);
  if (rawSeats.length === 0) return [];

  const seenMap = new Map();

  rawSeats.forEach((s, idx) => {
    const rawCode = String(s.Code || s.SeatNo || s.SeatNumber || s.Number || "");
    let cleanSeatNo = rawCode.split("SeKey")[0].split("_")[0].trim();
    
    // Extract standard seat format (e.g. 1A, 12C, 24F)
    const match = rawCode.match(/^(\d{1,3}[A-Z])/i);
    if (match) {
      cleanSeatNo = match[1].toUpperCase();
    }
    if (!cleanSeatNo || cleanSeatNo.length > 5) {
      cleanSeatNo = `S${idx + 1}`;
    }

    const seatNumber = cleanSeatNo;
    if (seenMap.has(seatNumber)) return;

    let row = Number(s.RowNo || s.Row || seatNumber.replace(/\D/g, "") || 1);
    let seatLetter = String(s.Column || s.SeatLetter || seatNumber.replace(/\d/g, "") || "A").toUpperCase();
    if (seatLetter.length > 1) {
      seatLetter = seatLetter[0];
    }

    const price = Number(s.Price || s.Amount || s.Fee || 0);
    const isBooked = Boolean(s.AvailablityType === 0 || s.IsBooked || s.Status === "Booked" || s.Status === 0);
    const isBlocked = Boolean(s.Status === "Blocked" || s.Status === 2);

    let status = SEAT_STATUS.AVAILABLE;
    if (isBlocked) status = SEAT_STATUS.BLOCKED;
    else if (isBooked) status = SEAT_STATUS.BOOKED;
    else if (selectedLookup.has(seatNumber)) status = SEAT_STATUS.SELECTED;

    const type = price > 800 ? SEAT_TYPES.BUSINESS : price > 300 ? SEAT_TYPES.PREMIUM : SEAT_TYPES.STANDARD;

    seenMap.set(seatNumber, {
      id: seatNumber,
      seatNumber,
      rawCode,
      rawSeat: s,
      row,
      seatLetter,
      price,
      status,
      type,
      isExit: Boolean(s.IsExitRow || s.IsLegroom),
      isWindow: ["A", "F"].includes(seatLetter),
      isAisle: ["C", "D"].includes(seatLetter),
      features: {
        extraLegroom: Boolean(s.IsExitRow || s.IsLegroom),
      },
    });
  });

  return Array.from(seenMap.values());
}

export function formatCurrency(value) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0))}`;
}
