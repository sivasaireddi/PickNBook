import axios from "axios";
import Constants from "expo-constants";
import { getStoredAuthToken } from "../utils/authSession";

const runtimeEnv = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
let BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  runtimeEnv.EXPO_PUBLIC_API_BASE_URL ||
  runtimeEnv.apiBaseUrl ||
  "https://paycheck-baton-overfull.ngrok-free.dev";

console.log("[BusService] Resolved API Base URL:", BASE_URL);

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 minutes timeout to prevent ECONNABORTED for slow responses
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

const formatApiTime = (dateTime) => {
  if (!dateTime) return "";
  if (dateTime.includes("T")) {
    return dateTime.split("T")[1].substring(0, 5);
  }
  return dateTime.substring(0, 5);
};

const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Add interceptor to include auth token in all requests to support lookup by busId
let lastSearchResults = {
  traceId: "",
  buses: [],
};

/**
 * Search cities for autocomplete via GET /api/Places?query={cityName}&tripType=bus
 */
export async function searchCities(query = "") {
  try {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];

    console.log(`[BusService] searchCities Request URL: ${BASE_URL.replace(/\/+$/, "")}/api/Places?query=${encodeURIComponent(trimmed)}&tripType=bus`);
    const response = await client.get("/api/Places", {
      params: { query: trimmed, tripType: "bus" },
    });

    return response.data || [];
  } catch (error) {
    console.error("[BusService] searchCities error:", error?.message, error?.response?.data);
    return [];
  }
}

/**
 * Resolves a city object or name/code string to a numeric city code.
 * If it's a name, it queries the search-cities API to find the corresponding code.
 */
async function resolveCityCode(city) {
  if (!city) return "";

  if (typeof city === "object") {
    return String(city.cityId || city.code || city.cityCode || city.id || "").trim();
  }

  const trimmed = String(city).trim();
  // If it's already a numeric code, return it directly
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Otherwise, it's a city name. Query the search-cities API to get its code
  try {
    console.log(`[BusService] Resolving city code for name: "${trimmed}"`);
    const cities = await searchCities(trimmed);

    const match = cities.find(
      (c) => String(c.cityName || c.name || "").toLowerCase().trim() === trimmed.toLowerCase()
    ) || cities[0];

    if (match) {
      const code = String(match.cityId || match.code || match.cityCode || match.id || "").trim();
      console.log(`[BusService] Resolved "${trimmed}" -> "${code}"`);
      return code;
    }
  } catch (error) {
    console.warn(`[BusService] Failed to resolve city code for "${trimmed}":`, error.message);
  }

  return "";
}

/**
 * Search buses via POST /api/BusBookings/search
 */
export async function searchBuses(params = {}, options = {}) {
  try {
    const fromCity = params.fromCityCode ?? params.fromCity ?? params.from;
    const toCity = params.toCityCode ?? params.toCity ?? params.to;
    const departDate = params.departDate;

    // Resolve codes asynchronously
    const fromCode = await resolveCityCode(fromCity);
    const toCode = await resolveCityCode(toCity);

    // Normalize date format from DD-MM-YYYY (or other formats) to YYYY-MM-DD
    let normalizedDate = "";
    if (departDate) {
      const trimmedDate = String(departDate).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        normalizedDate = trimmedDate;
      } else {
        const dmyMatch = trimmedDate.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
        if (dmyMatch) {
          const [_, day, month, year] = dmyMatch;
          normalizedDate = `${year}-${month}-${day}`;
        } else {
          const d = new Date(trimmedDate);
          if (!Number.isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            normalizedDate = `${year}-${month}-${day}`;
          } else {
            normalizedDate = trimmedDate;
          }
        }
      }
    }

    const payload = {
      fromCityCode: fromCode,
      toCityCode: toCode,
      departDate: normalizedDate,
    };

    console.log(`[BusService] searchBuses Request URL: ${BASE_URL.replace(/\/+$/, "")}/api/BusBookings/search`);
    console.log("[BusService] searchBuses calling API via Axios", {
      baseURL: BASE_URL,
      url: "/api/BusBookings/search",
      payload,
    });

    const response = await client.post("/api/BusBookings/search", payload, options);
    console.log("[BusService] searchBuses response status:", response?.status);
    console.log("[BusService] Response:", JSON.stringify(response.data, null, 2));

    const responseData = response.data || {};
    
    // Extract traceId and buses list
    const rawTraceId = responseData.traceId ?? responseData.TraceId ?? "";
    let traceId = rawTraceId !== "" ? String(rawTraceId).trim() : "";
    let rawBuses =
      responseData.Result ||
      responseData.result ||
      responseData.buses ||
      responseData.results ||
      responseData.busResults ||
      responseData.data ||
      [];

    if (Array.isArray(responseData)) {
      rawBuses = responseData;
    }

    if (!traceId && Array.isArray(rawBuses) && rawBuses.length > 0) {
      traceId = String(rawBuses[0].traceId || rawBuses[0].TraceId || "").trim();
    }

    // Map raw buses to the fields expected by the UI search card
    const mappedBuses = (Array.isArray(rawBuses) ? rawBuses : []).map((bus, idx) => {
      // Ensure ResultIndex is preserved as a long numeric string
      const resultIndex =
        bus.resultIndex !== undefined && bus.resultIndex !== null
          ? String(bus.resultIndex).trim()
          : (bus.ResultIndex !== undefined && bus.ResultIndex !== null
              ? String(bus.ResultIndex).trim()
              : "");

      const boardingPoints = (bus.BoardingPoints ?? bus.boardingPoints ?? []).map(point => ({
        ...point,
        time: formatApiTime(point.Time ?? point.time)
      }));
      const droppingPoints = (bus.DroppingPoints ?? bus.droppingPoints ?? []).map(point => ({
        ...point,
        time: formatApiTime(point.Time ?? point.time)
      }));
      const firstBoarding = boardingPoints[0]?.Name ?? boardingPoints[0]?.name ?? "";
      const firstDropping = droppingPoints[0]?.Name ?? droppingPoints[0]?.name ?? "";

      const rawPrice = bus.B2CDisplayFare ?? bus.b2cDisplayFare ?? bus.DisplayFare ?? bus.priceInr ?? bus.price ?? bus.fare ?? (Array.isArray(bus.Price) && bus.Price[0]?.PublishedFare) ?? 0;
      const priceInr = Number(rawPrice);

      const busIdVal = bus.Id ?? bus.id ?? bus.busId ?? bus.busID ?? idx + 1;

      return {
        ...bus,
        // Storing bus Id for URLs
        busId: busIdVal,
        id: busIdVal,
        Id: busIdVal,
        b2cDisplayFare: priceInr,
        // UI expect fields mappings
        operatorName:
          bus.TravelsName ??
          bus.travelsName ??
          bus.operatorName ??
          bus.operator ??
          bus.travelName ??
          "Operator",
        busType: bus.BusType ?? bus.busType ?? bus.type ?? "Bus",
        departureTime: formatApiTime(bus.DepartureTime ?? bus.departureTimeUtc ?? bus.departureTime ?? bus.depTime),
        arrivalTime: formatApiTime(bus.ArrivalTime ?? bus.arrivalTimeUtc ?? bus.arrivalTime ?? bus.arrTime),
        departureDateTime: bus.DepartureTime ?? bus.departureTimeUtc ?? bus.departureTime ?? bus.depTime ?? "",
        arrivalDateTime: bus.ArrivalTime ?? bus.arrivalTimeUtc ?? bus.arrivalTime ?? bus.arrTime ?? "",
        duration: formatDuration(bus.Duration ?? bus.duration),
        availableSeats: bus.AvailableSeats !== undefined ? Number(bus.AvailableSeats) : (bus.availableSeats ?? bus.seatsAvailable ?? 0),
        totalSeats: bus.TotalSeats !== undefined ? Number(bus.TotalSeats) : (bus.totalSeats ?? bus.totalSeat ?? 0),
        priceInr: Number.isNaN(priceInr) ? 0 : priceInr,
        boardingPoint: firstBoarding,
        droppingPoint: firstDropping,
        boardingPoints: boardingPoints,
        droppingPoints: droppingPoints,
        // Save parameters required for Block/Book
        traceId: bus.traceId ?? bus.TraceId ?? traceId,
        resultIndex: resultIndex,
        srdvIndex: bus.srdvIndex ?? bus.SrdvIndex ?? idx,
      };
    });

    // Save in-memory cache
    lastSearchResults = {
      traceId: traceId,
      buses: mappedBuses,
    };

    return mappedBuses;
  } catch (error) {
    console.error("[BusService] searchBuses error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Get seat layout via POST /api/BusBookings/seat-layout
 */
/**
 * Helper to recursively flatten layout response structures and extract valid seat objects,
 * while discarding nested layout metadata properties like row/column dimensions.
 */
function flattenSeats(data) {
  const result = [];
  
  function recurse(item) {
    if (!item) return;
    
    if (Array.isArray(item)) {
      item.forEach(recurse);
    } else if (typeof item === "object") {
      // Check if this is a seat object itself
      const seatCode =
        item.seatCode ??
        item.SeatCode ??
        item.SeatName ??
        item.seatName ??
        item.seatNo ??
        item.SeatNo ??
        item.code ??
        item.seatNumber;

      const keys = Object.keys(item);

      if (seatCode) {
        result.push(item);
      } else {
        // Recurse into nested container objects
        keys.forEach((key) => {
          if (typeof item[key] === "object" && item[key] !== null) {
            recurse(item[key]);
          }
        });
      }
    }
  }

  recurse(data);
  return result;
}

/**
 * Get seat layout via POST /api/BusBookings/seat-layout
 */
export async function getSeatLayout({ traceId, resultIndex, srdvIndex }) {
  const cleanTraceId = String(traceId || "").trim();
  const cleanResultIndex = resultIndex !== undefined && resultIndex !== null ? String(resultIndex).trim() : "";
  const cleanSrdvIndex = String(srdvIndex !== undefined && srdvIndex !== null ? srdvIndex : "").trim();

  const innerPayload = {
    traceId: cleanTraceId,
    resultIndex: cleanResultIndex,
    srdvIndex: cleanSrdvIndex,
    TraceId: cleanTraceId,
    ResultIndex: cleanResultIndex,
    SrdvIndex: cleanSrdvIndex,
  };

  const payload = {
    ...innerPayload,
    request: innerPayload,
  };

  console.log(`[SeatLayout] Request URL: ${BASE_URL.replace(/\/+$/, "")}/api/BusBookings/seat-layout`);
  console.log("[SeatLayout] URL:", "/api/BusBookings/seat-layout");
  console.log("[SeatLayout] Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await client.post("/api/BusBookings/seat-layout", payload);
    console.log("[BusService] getSeatLayout response status:", response?.status);
    console.log("[BusService] Seat Layout Response:", JSON.stringify(response.data, null, 2));

    const layoutData = response.data || {};
    const normalizedData = layoutData.data || layoutData.result || layoutData.response || layoutData;

    // Resolve raw Result (Lower Deck) and ResultUpperSeat (Upper Deck)
    const rawLower = layoutData.Result ?? layoutData.result ?? normalizedData.Result ?? normalizedData.result ?? (Array.isArray(normalizedData) ? normalizedData : []);
    const rawUpper = layoutData.ResultUpperSeat ?? layoutData.resultUpperSeat ?? normalizedData.ResultUpperSeat ?? normalizedData.resultUpperSeat ?? null;

    const lowerSeats = flattenSeats(rawLower);
    const upperSeats = rawUpper ? flattenSeats(rawUpper).map((s) => ({ ...s, IsUpper: true, isUpper: true, deck: "UPPER" })) : [];
    const rawSeats = [...lowerSeats, ...upperSeats];

    // Auto-detect coordinate index base (0-indexed vs 1-indexed)
    let minRow = Infinity;
    let minCol = Infinity;

    rawSeats.forEach((seat) => {
      // row maps to RowNo (width), column maps to ColumnNo (length)
      const r = Number(seat.RowNo ?? seat.rowNo ?? seat.Row ?? seat.row ?? 0);
      const c = Number(seat.ColumnNo ?? seat.columnNo ?? seat.Column ?? seat.column ?? 0);
      if (r < minRow) minRow = r;
      if (c < minCol) minCol = c;
    });

    const rowOffset = minRow > 0 ? -minRow : 0;
    const colOffset = minCol > 0 ? -minCol : 0;

    // Map each raw seat object to the standard layout props
    const mappedSeats = rawSeats.map((seat, index) => {
      const seatCode = String(
        seat.SeatName ??
        seat.seatName ??
        seat.seatCode ??
        seat.seatNumber ??
        seat.code ??
        `S${index + 1}`
      ).trim();

      const seatName = String(seat.SeatName ?? seat.seatName ?? seatCode).trim();

      // Check for string boolean values: "true" means available, "false" means booked.
      const isBooked =
        seat.SeatStatus === "false" ||
        seat.seatStatus === "false" ||
        seat.isBooked === true ||
        seat.booked === true ||
        String(seat.status).toLowerCase() === "booked" ||
        String(seat.status).toLowerCase() === "blocked";

      const priceObj = seat.Price || seat.price || {};
      const baseFare = Number(priceObj.BaseFare ?? priceObj.baseFare ?? seat.BaseFare ?? seat.baseFare ?? seat.SeatFare ?? seat.Fare ?? seat.fare ?? 0);
      const externalGst = Number(priceObj.GSTAmount ?? priceObj.gstAmount ?? priceObj.Tax ?? priceObj.tax ?? seat.GSTAmount ?? seat.Tax ?? seat.gstAmount ?? seat.tax ?? 0);
      const displayFare = Number(priceObj.B2CDisplayFare ?? priceObj.b2cDisplayFare ?? seat.B2CDisplayFare ?? seat.b2cDisplayFare ?? (baseFare + externalGst));
      const priceInr = displayFare || (baseFare + externalGst) || 0;

      // Extract coordinates directly (RowNo -> row, ColumnNo -> column)
      const rowVal = Number(seat.RowNo ?? seat.rowNo ?? seat.Row ?? seat.row ?? 0);
      const colVal = Number(seat.ColumnNo ?? seat.columnNo ?? seat.Column ?? seat.column ?? 0);

      const row = rowVal + rowOffset;
      const column = colVal + colOffset;

      const isUpper = Boolean(
        seat.IsUpper === true ||
        seat.isUpper === true ||
        String(seat.IsUpper).toLowerCase() === "true" ||
        String(seat.isUpper).toLowerCase() === "true" ||
        String(seat.Deck ?? "").toLowerCase().includes("upper") ||
        seatCode.toUpperCase().startsWith("U")
      );

      let gender = "available";
      if (
        seat.IsLadiesSeat === true ||
        seat.isLadiesSeat === true ||
        String(seat.IsLadiesSeat).toLowerCase() === "true" ||
        String(seat.isLadiesSeat).toLowerCase() === "true" ||
        String(seat.gender).toLowerCase() === "female" ||
        String(seat.gender).toLowerCase() === "f"
      ) {
        gender = "female";
      } else if (
        seat.IsMalesSeat === true ||
        seat.isMalesSeat === true ||
        String(seat.IsMalesSeat).toLowerCase() === "true" ||
        String(seat.isMalesSeat).toLowerCase() === "true" ||
        String(seat.gender).toLowerCase() === "male" ||
        String(seat.gender).toLowerCase() === "m"
      ) {
        gender = "male";
      }

      let seatType = String(seat.SeatType ?? seat.seatType ?? "Seater");
      if (seatType === "1") seatType = "Seater";
      else if (seatType === "2") seatType = "Sleeper";
      else if (seatType === "3") seatType = "Semi-Sleeper";

      return {
        ...seat,
        seatCode,
        seatName,
        seatType,
        baseFare,
        externalGst,
        displayFare,
        priceInr,
        isBooked,
        row,
        column,
        gender,
        isUpper,
        width: Number(seat.Width ?? seat.width ?? 1),
        height: Number(seat.Height ?? seat.height ?? 1),
      };
    }).filter((seat) => {
      // Filter out non-seat markers (exit doors, aisles, structural elements)
      const code = seat.seatCode.toUpperCase();
      const isMarker =
        code.includes("EXIT") ||
        code.includes("AISLE") ||
        code.includes("DOOR") ||
        code.includes("CABIN") ||
        code.startsWith("RB_") ||
        code.startsWith("LB_") ||
        code.startsWith("RF_") ||
        code.startsWith("LF_");
      return !isMarker;
    });

    // ── Per-Deck Independent Grid Mapping (Vertical Coach Support) ──
    // Lower deck and Upper deck often start from different coordinate numbers in SRDV (e.g., 0,1,3 vs 1,2,4).
    // We map row and column coordinates independently per deck so both decks align perfectly!
    const decks = [
      { key: "LOWER", seats: mappedSeats.filter((s) => !s.isUpper && !String(s.deck || "").toUpperCase().includes("UPPER")) },
      { key: "UPPER", seats: mappedSeats.filter((s) => s.isUpper || String(s.deck || "").toUpperCase().includes("UPPER")) }
    ];

    let maxOverallRows = 0;
    let maxOverallCols = 0;
    let globalAisleAfterGridRow = -1;

    decks.forEach(({ seats: deckSeats }) => {
      if (deckSeats.length === 0) return;

      // 1. Map RowNo to sequential horizontal lane indices (0, 1, 2…) for this deck
      const uniqueRows = [...new Set(deckSeats.map((s) => Number(s.row) || 0))].sort((a, b) => a - b);
      const rowGridMap = new Map();
      let aisleAfterGridRow = -1;
      uniqueRows.forEach((rowVal, idx) => {
        rowGridMap.set(rowVal, idx);
        if (idx > 0 && rowVal - uniqueRows[idx - 1] > 1 && aisleAfterGridRow === -1) {
          aisleAfterGridRow = idx - 1; // Mark the lane right before the gap
        }
      });
      if (uniqueRows.length > maxOverallRows) maxOverallRows = uniqueRows.length;
      if (aisleAfterGridRow !== -1 && globalAisleAfterGridRow === -1) globalAisleAfterGridRow = aisleAfterGridRow;

      // 2. Map ColumnNo to vertical grid coordinates starting from 0 for this deck
      const uniqueCols = [...new Set(deckSeats.map((s) => Number(s.column) || 0))].sort((a, b) => a - b);
      const minGridCol = uniqueCols.length > 0 ? Math.min(...uniqueCols) : 0;
      const maxGridCol = uniqueCols.length > 0 ? Math.max(...uniqueCols) : 0;
      const totalGridCols = (maxGridCol - minGridCol) + 1;
      if (totalGridCols > maxOverallCols) maxOverallCols = totalGridCols;

      // Assign clean coordinates to each seat in this deck
      deckSeats.forEach((seat) => {
        const rawRow = Number(seat.row) || 0;
        const rawCol = Number(seat.column) || 0;
        seat.gridRow = rowGridMap.get(rawRow) ?? 0;
        seat.gridCol = Math.max(0, rawCol - minGridCol);
        seat.aisleAfterGridRow = aisleAfterGridRow !== -1 ? aisleAfterGridRow : (uniqueRows.length === 3 ? 1 : -1);
      });
    });

    console.log("Parsed Seats:", mappedSeats.length, "seats mapped to vertical grid (Upper & Lower decks combined).");
    console.log("Grid dimensions:", maxOverallRows, "lanes x", maxOverallCols, "rows. Aisle after lane:", globalAisleAfterGridRow);

    const finalLayout = {
      ...normalizedData,
      seats: mappedSeats,
      totalGridRows: maxOverallRows,
      totalGridCols: maxOverallCols,
      aisleAfterGridRow: globalAisleAfterGridRow,
    };

    return finalLayout;
  } catch (error) {
    console.log(error.response?.status);
    console.log(error.response?.data);
    console.error("[BusService] getSeatLayout error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Helper to get seat layout by busId using cached search results
 */
export async function fetchSeatLayoutByBusId(busId) {
  const cachedBus = lastSearchResults.buses.find(
    (b) => String(b.busId) === String(busId)
  );

  if (cachedBus) {
    return getSeatLayout({
      traceId: cachedBus.traceId,
      resultIndex: cachedBus.resultIndex,
      srdvIndex: cachedBus.srdvIndex,
    });
  }

  throw new Error("Search session not found. Please try searching again.");
}

/**
 * Retrieve Boarding & Dropping points via POST /api/BusBookings/boarding-points (no auth header)
 */
export async function getBoardingPoints(payload) {
  try {
    console.log(`[BusService] getBoardingPoints Request URL: ${BASE_URL.replace(/\/+$/, "")}/api/BusBookings/boarding-points`);
    console.log("[BusService] getBoardingPoints calling API via Axios", {
      baseURL: BASE_URL,
      url: "/api/BusBookings/boarding-points",
      payload,
    });

    const response = await client.post("/api/BusBookings/boarding-points", payload);
    console.log("[BusService] getBoardingPoints response status:", response?.status);
    console.log("[BusService] Raw Boarding & Dropping Points API Response:", JSON.stringify(response?.data, null, 2));
    
    const data = response?.data;
    const inner = data?.Result ?? data?.result ?? data?.data ?? data ?? {};
    const bp = inner.BoardingPoints ?? inner.BoardingPointsDetails ?? inner.boardingPoints ?? data?.BoardingPoints ?? [];
    const dp = inner.DroppingPoints ?? inner.DroppingPointsDetails ?? inner.droppingPoints ?? data?.DroppingPoints ?? [];
    console.log(`[BusService] Extracted ${Array.isArray(bp) ? bp.length : 0} Boarding Points and ${Array.isArray(dp) ? dp.length : 0} Dropping Points.`);
    return response.data;
  } catch (error) {
    console.error("[BusService] getBoardingPoints error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Block seats via POST /api/BusBookings/block (no auth header)
 */
export async function blockSeats(payload) {
  try {
    console.log(`[BusService] blockSeats Request URL: ${BASE_URL.replace(/\/+$/, "")}/api/BusBookings/block`);
    console.log("[BusService] blockSeats calling API via Axios", {
      baseURL: BASE_URL,
      url: "/api/BusBookings/block",
      payload,
    });

    // Make request without Authorization header
    const response = await client.post("/api/BusBookings/block", payload);
    console.log("[BusService] blockSeats response status:", response?.status);
    console.log("[BusService] blockSeats response data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("[BusService] blockSeats error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Option B: Book seats via POST /api/BusBookings/book (with auth header)
 */
export async function bookSeats(arg1, arg2, arg3) {
  try {
    let payload = arg1;
    let authToken = arg2;
    if (typeof arg1 === "number" || typeof arg1 === "string") {
      payload = arg2;
      authToken = arg3;
    }

    // Strip out markupAmount from seats if present
    if (payload && Array.isArray(payload.seats)) {
      payload.seats = payload.seats.map((s) => {
        if (typeof s === "object" && s !== null) {
          const { markupAmount, MarkupAmount, ...rest } = s;
          return rest;
        }
        return s;
      });
    }

    console.log(`[BusService] bookSeats Request URL: ${BASE_URL.replace(/\/+$/, "")}/api/BusBookings/book`);
    console.log("Booking Payload:\n", JSON.stringify(payload, null, 2));
    console.log("[BusService] bookSeats calling API via Axios", {
      baseURL: BASE_URL,
      url: "/api/BusBookings/book",
      payload,
    });

    const token = authToken || (await getStoredAuthToken());
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await client.post("/api/BusBookings/book", payload, {
      headers,
    });
    console.log("[BusService] bookSeats response status:", response?.status);
    console.log("[BusService] bookSeats response data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("[BusService] bookSeats error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Fetch all bus bookings for the logged-in user via GET /api/BusBookings/bookings
 */
export async function getMyBusBookings(authToken) {
  try {
    const token = authToken || (await getStoredAuthToken());
    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    console.log(`[BusService] getMyBusBookings Request URL: ${BASE_URL.replace(/\/+$/, "")}/api/BusBookings/bookings`);

    const response = await client.get("/api/BusBookings/bookings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("[BusService] getMyBusBookings response status:", response?.status);
    return response.data || [];
  } catch (error) {
    console.error("[BusService] getMyBusBookings error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Cancel entire bus booking by bookingId via POST /api/BusBookings/bookings/{bookingId}/cancel?reason={reason}
 */
export async function cancelBusBooking(bookingId, reason = "User requested cancellation", authToken) {
  try {
    const token = authToken || (await getStoredAuthToken());
    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const cleanId = String(bookingId || "").trim();
    const queryReason = String(reason || "User requested cancellation").trim();
    const url = `/api/BusBookings/bookings/${encodeURIComponent(cleanId)}/cancel?reason=${encodeURIComponent(queryReason)}`;

    console.log(`[BusService] cancelBusBooking Request URL: ${BASE_URL.replace(/\/+$/, "")}${url}`);

    const response = await client.post(
      url,
      null,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("[BusService] cancelBusBooking response status:", response?.status);
    console.log("[BusService] cancelBusBooking response data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.warn("[BusService] cancelBusBooking error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Cancel specific passengers on a bus booking via POST /api/BusBookings/bookings/{bookingId}/cancel-passengers
 */
export async function cancelBusPassengers(bookingId, passengerIds = [], authToken) {
  try {
    const token = authToken || (await getStoredAuthToken());
    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const cleanId = String(bookingId || "").trim();
    const url = `/api/BusBookings/bookings/${encodeURIComponent(cleanId)}/cancel-passengers`;
    const payload = {
      passengerIds: (Array.isArray(passengerIds) ? passengerIds : [passengerIds]).map((id) => Number(id)),
    };

    console.log(`[BusService] cancelBusPassengers Request URL: ${BASE_URL.replace(/\/+$/, "")}${url}`);
    console.log("[BusService] cancelBusPassengers payload:", JSON.stringify(payload, null, 2));

    const response = await client.post(
      url,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    
    console.log("[BusService] cancelBusPassengers response status:", response?.status);
    console.log("[BusService] cancelBusPassengers response data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.warn("[BusService] cancelBusPassengers warning/error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Option B: Pricing Preview via POST /api/BusBookings/pricing-preview
 */
export async function getPricingPreview(arg1, arg2) {
  try {
    const payload = typeof arg1 === "object" && arg1 !== null ? arg1 : arg2;

    // Strip out markupAmount from seats array
    if (payload && Array.isArray(payload.seats)) {
      payload.seats = payload.seats.map((s) => ({
        seatCode: String(s.seatCode || ""),
        seatType: String(s.seatType || "Seater"),
        baseFare: Number(s.baseFare || 0),
        externalGst: Number(s.externalGst || 0),
      }));
    }

    console.log(`[BusService] getPricingPreview Request URL: ${BASE_URL.replace(/\/+$/, "")}/api/BusBookings/pricing-preview`);
    console.log("[BusService] getPricingPreview payload:", JSON.stringify(payload, null, 2));

    const response = await client.post("/api/BusBookings/pricing-preview", payload);
    console.log("[BusService] getPricingPreview response status:", response?.status);
    console.log("[BusService] getPricingPreview response data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.warn("[BusService] getPricingPreview error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Fetch available bus coupons for the user
 * GET /api/BusBookings/user/available
 */
export async function getBusCoupons(token) {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    console.log(`[BusService] Fetching Bus Coupons...`);
    const response = await client.get("/api/BusBookings/user/available", config);
    return response.data;
  } catch (error) {
    console.warn("[BusService] getBusCoupons error:", error?.message);
    throw error;
  }
}

/**
 * Fetch featured offers
 * GET /api/FeaturedOffers
 */
export async function getFeaturedOffers() {
  try {
    console.log(`[BusService] Fetching Featured Offers...`);
    const response = await client.get("/api/FeaturedOffers");
    return response.data;
  } catch (error) {
    console.warn("[BusService] getFeaturedOffers error:", error?.message);
    throw error;
  }
}

export default {
  searchCities,
  searchBuses,
  getSeatLayout,
  fetchSeatLayoutByBusId,
  getBoardingPoints,
  getPricingPreview,
  blockSeats,
  bookSeats,
  getMyBusBookings,
  cancelBusBooking,
  cancelBusPassengers,
  getBusCoupons,
  getFeaturedOffers,
};


