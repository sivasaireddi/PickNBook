const INDIA_TIME_ZONE = "Asia/Kolkata";

const isPresent = (value) => value !== undefined && value !== null && value !== "";

export const pickBookingValue = (source, keys, fallback = null) => {
  if (!source || typeof source !== "object") return fallback;
  for (const key of keys) {
    if (isPresent(source[key])) return source[key];
  }
  return fallback;
};

export const toBookingDate = (value) => {
  if (!isPresent(value)) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA_TIME_ZONE,
  day: "2-digit",
  month: "short",
});

const weekdayDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA_TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export const formatBookingDate = (value, variant = "full") => {
  const date = toBookingDate(value);
  if (!date) return "";
  if (variant === "short") return shortDateFormatter.format(date);
  if (variant === "weekday") return weekdayDateFormatter.format(date);
  return dateFormatter.format(date);
};

export const formatBookingTime = (value) => {
  const date = toBookingDate(value);
  return date ? timeFormatter.format(date).toUpperCase() : "";
};

export const formatBookingDateTime = (value) => {
  const date = formatBookingDate(value);
  const time = formatBookingTime(value);
  return date && time ? `${date}, ${time}` : date || time;
};

export const formatBookingCurrency = (value) => {
  if (!isPresent(value) || !Number.isFinite(Number(value))) return "";
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizePassenger = (passenger, index) => ({
  id: pickBookingValue(passenger, ["id", "Id"], `passenger-${index}`),
  fullName: String(pickBookingValue(passenger, ["fullName", "FullName", "name", "Name"], "") || "").trim(),
  age: pickBookingValue(passenger, ["age", "Age"], null),
  gender: String(pickBookingValue(passenger, ["gender", "Gender"], "") || "").trim(),
  seatNumber: String(pickBookingValue(passenger, ["seatNumber", "SeatNumber"], "") || "").trim(),
  isCancelled: Boolean(pickBookingValue(passenger, ["isCancelled", "IsCancelled"], false)),
  cancelledAt: pickBookingValue(passenger, ["cancelledAtUtc", "CancelledAtUtc"], null),
});

export const normalizeBusStatusToken = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[\s_-]+/g, "");

const normalizeStatus = (sources, departureAt, passengers) => {
  const tokens = sources.map(normalizeBusStatusToken).filter(Boolean);
  const activePassengerCount = passengers.filter((passenger) => !passenger.isCancelled).length;
  const cancelledPassengerCount = passengers.filter((passenger) => passenger.isCancelled).length;
  const departure = toBookingDate(departureAt);
  const isPast = Boolean(departure && departure.getTime() < Date.now());

  if (tokens.some((token) => token === "manualcheckrequired" || token === "manualreviewrequired")) {
    return "ManualReviewRequired";
  }
  if (tokens.some((token) => token === "cancelinprocess" || token === "cancellationpending")) {
    return "CancellationPending";
  }

  const explicitlyPartial = tokens.some((token) => token === "partiallycancelled" || token === "partialcancelled");
  if ((explicitlyPartial && (activePassengerCount > 0 || passengers.length === 0)) || (activePassengerCount > 0 && cancelledPassengerCount > 0)) {
    return "PartiallyCancelled";
  }
  if (tokens.some((token) => token === "cancelled" || token === "canceled") || (passengers.length > 0 && activePassengerCount === 0 && cancelledPassengerCount > 0)) {
    return "Cancelled";
  }
  if (tokens.some((token) => token.includes("fail") || token === "expired" || token === "userdropped")) return "PaymentFailed";
  if (tokens.some((token) => token === "past" || token === "completed")) return "Past";
  if (tokens.some((token) => ["booked", "confirmed", "success", "upcoming"].includes(token))) {
    return isPast ? "Past" : "Upcoming";
  }
  return "Upcoming";
};

const getListStatus = (status, departureAt) => {
  if (["CancellationPending", "ManualReviewRequired"].includes(status)) return "Upcoming";
  if (status === "PartiallyCancelled") {
    const departure = toBookingDate(departureAt);
    return departure && departure.getTime() < Date.now() ? "Past" : "Upcoming";
  }
  return status;
};

export const formatBusCancellationWindow = (slabs, index) => {
  const slab = Array.isArray(slabs) ? slabs[index] : null;
  if (!slab) return "Cancellation window";
  const upperHours = Number(pickBookingValue(slab, ["hoursBeforeDeparture", "HoursBeforeDeparture"], NaN));
  if (!Number.isFinite(upperHours)) return "Cancellation window";
  const previousSlab = index > 0 ? slabs[index - 1] : null;
  const lowerHours = previousSlab
    ? Number(pickBookingValue(previousSlab, ["hoursBeforeDeparture", "HoursBeforeDeparture"], 0))
    : 0;
  if (upperHours < 0) return `Cancellation more than ${Math.max(0, lowerHours)} hours before departure`;
  return `Cancellation between ${Math.max(0, lowerHours)} and ${upperHours} hours before departure`;
};

export const formatBusCancellationChargeRule = (slab) => {
  const charge = pickBookingValue(slab, ["cancellationCharge", "CancellationCharge"], null);
  const type = normalizeBusStatusToken(pickBookingValue(slab, ["cancellationChargeType", "CancellationChargeType"], ""));
  if (!isPresent(charge)) return "";
  return type.includes("percent") ? `Cancellation fee: ${Number(charge)}%` : `Cancellation fee: ${formatBookingCurrency(charge)}`;
};

export const normalizeBusBooking = (record) => {
  const raw = record?.booking ?? record?.data ?? record?.result ?? record ?? {};
  const passengersRaw = pickBookingValue(raw, ["passengers", "Passengers"], []);
  const passengers = Array.isArray(passengersRaw)
    ? passengersRaw.map(normalizePassenger)
    : [];
  const departureAt = pickBookingValue(raw, [
    "departureTimeUtc", "DepartureTimeUtc", "departureTime", "DepartureTime",
    "departureTimeIst", "DepartureTimeIst",
  ]);
  const arrivalAt = pickBookingValue(raw, [
    "arrivalTimeUtc", "ArrivalTimeUtc", "arrivalTime", "ArrivalTime",
    "arrivalTimeIst", "ArrivalTimeIst",
  ]);
  const statusSource = pickBookingValue(raw, [
    "bookingStatus", "BookingStatus", "tripState", "TripState",
    "canonicalStatus", "CanonicalStatus", "status", "Status",
  ], "Upcoming");
  const rawStatusSource = pickBookingValue(raw, ["status", "Status", "canonicalStatus", "CanonicalStatus"], "");
  const paymentBreakdown = pickBookingValue(raw, ["paymentBreakdown", "PaymentBreakdown"], {}) || {};
  const cancellationPolicy = pickBookingValue(raw, ["cancellationPolicy", "CancellationPolicy"], null);
  const cancellationAudit = pickBookingValue(raw, ["cancellationAudit", "CancellationAudit"], null);
  const bookingId = pickBookingValue(raw, ["bookingId", "BookingId", "id", "Id"], null);
  const seatNumbers = passengers.map((item) => item.seatNumber).filter(Boolean);

  const normalizedStatus = normalizeStatus([rawStatusSource, statusSource], departureAt, passengers);

  return {
    id: bookingId,
    key: String(bookingId ?? pickBookingValue(raw, ["bookingReference", "BookingReference", "pnr", "Pnr"], "")),
    bookingReference: String(pickBookingValue(raw, ["bookingReference", "BookingReference"], "") || "").trim(),
    pnr: String(pickBookingValue(raw, ["pnr", "Pnr"], "") || "").trim(),
    operator: String(pickBookingValue(raw, ["providerName", "ProviderName", "operatorName", "OperatorName"], "") || "").trim(),
    tripNumber: String(pickBookingValue(raw, ["tripNumber", "TripNumber", "busNumber", "BusNumber"], "") || "").trim(),
    busType: String(pickBookingValue(raw, ["busType", "BusType", "travelClass", "TravelClass"], "") || "").trim(),
    from: String(pickBookingValue(raw, ["fromCity", "FromCity", "from", "From", "origin", "Origin"], "") || "").trim(),
    to: String(pickBookingValue(raw, ["toCity", "ToCity", "to", "To", "destination", "Destination"], "") || "").trim(),
    departureAt,
    arrivalAt,
    boardingName: String(pickBookingValue(raw, ["boardingPointName", "BoardingPointName", "boardingPoint", "BoardingPoint"], "") || "").trim(),
    boardingAddress: String(pickBookingValue(raw, ["boardingPointAddress", "BoardingPointAddress", "boardingAddress", "BoardingAddress"], "") || "").trim(),
    boardingAt: pickBookingValue(raw, ["boardingPointTimeUtc", "BoardingPointTimeUtc", "boardingPointTime", "BoardingPointTime", "boardingPointTimeIst", "BoardingPointTimeIst"], departureAt),
    droppingName: String(pickBookingValue(raw, ["droppingPointName", "DroppingPointName", "droppingPoint", "DroppingPoint"], "") || "").trim(),
    droppingAddress: String(pickBookingValue(raw, ["droppingPointAddress", "DroppingPointAddress", "droppingAddress", "DroppingAddress"], "") || "").trim(),
    droppingAt: pickBookingValue(raw, ["droppingPointTimeUtc", "DroppingPointTimeUtc", "droppingPointTime", "DroppingPointTime", "droppingPointTimeIst", "DroppingPointTimeIst"], arrivalAt),
    status: normalizedStatus,
    listStatus: getListStatus(normalizedStatus, departureAt),
    statusSource: String(statusSource || ""),
    canCancel: Boolean(pickBookingValue(raw, ["canCancel", "CanCancel"], false)),
    passengers,
    seatNumbers,
    seatCount: Number(pickBookingValue(raw, ["seatsBooked", "SeatsBooked"], passengers.length)) || passengers.length,
    passengerName: String(pickBookingValue(raw, ["passengerName", "PassengerName"], "") || "").trim(),
    passengerPhone: String(pickBookingValue(raw, ["passengerPhone", "PassengerPhone", "phone", "Phone"], "") || "").trim(),
    passengerEmail: String(pickBookingValue(raw, ["passengerEmail", "PassengerEmail"], "") || "").trim(),
    totalPaid: pickBookingValue(raw, ["totalPriceInr", "TotalPriceInr"], null),
    baseFare: pickBookingValue(raw, ["baseFareInr", "BaseFareInr"], null),
    gstAmount: pickBookingValue(raw, ["gstAmountInr", "GstAmountInr"], null),
    convenienceFee: pickBookingValue(raw, ["convenienceFeeInr", "ConvenienceFeeInr"], null),
    discount: pickBookingValue(raw, ["discountAmountInr", "DiscountAmountInr"], null),
    couponDiscount: pickBookingValue(raw, ["couponDiscountAmountInr", "CouponDiscountAmountInr"], null),
    autoDiscount: pickBookingValue(raw, ["autoDiscountAmountInr", "AutoDiscountAmountInr"], null),
    paymentMethod: String(pickBookingValue(paymentBreakdown, ["paymentMethod", "PaymentMethod"], pickBookingValue(raw, ["paymentMethod", "PaymentMethod"], "")) || "").trim(),
    paymentStatus: String(pickBookingValue(paymentBreakdown, ["status", "Status"], "") || "").trim(),
    walletUsed: pickBookingValue(paymentBreakdown, ["walletUsedAmount", "WalletUsedAmount"], null),
    gatewayPaid: pickBookingValue(paymentBreakdown, ["gatewayPaidAmount", "GatewayPaidAmount"], null),
    bookedAt: pickBookingValue(raw, ["bookedAtUtc", "BookedAtUtc", "bookedAt", "BookedAt"], null),
    cancelledAt: pickBookingValue(raw, ["cancelledAtUtc", "CancelledAtUtc", "cancelledAtIst", "CancelledAtIst"], null),
    cancellationReason: String(pickBookingValue(raw, ["cancellationReason", "CancellationReason"], "") || "").trim(),
    cancellationCharge: pickBookingValue(raw, ["cancellationChargeInr", "CancellationChargeInr"], null),
    refundAmount: pickBookingValue(raw, ["refundAmountInr", "RefundAmountInr"], null),
    refundStatus: String(pickBookingValue(raw, ["financialStatus", "FinancialStatus", "refundStatus", "RefundStatus"], "") || "").trim(),
    refundReference: String(pickBookingValue(raw, ["cashfreeRefundId", "CashfreeRefundId", "refundId", "RefundId"], "") || "").trim(),
    refundPreference: String(pickBookingValue(cancellationAudit, ["refundPreference", "RefundPreference", "refundDestination", "RefundDestination"], "") || "").trim(),
    refundCompletedAt: pickBookingValue(cancellationAudit, ["completedAtUtc", "CompletedAtUtc", "completedAt", "CompletedAt"], null),
    cancellationPolicy,
    cancellationAudit,
    timeline: pickBookingValue(raw, ["timeline", "Timeline"], null),
    raw,
  };
};

export const isBusCancellationEligible = (booking) => {
  if (!booking || !["Upcoming", "PartiallyCancelled"].includes(booking.status) || booking.listStatus !== "Upcoming" || booking.canCancel !== true) return false;
  const activePassengers = Array.isArray(booking.passengers)
    ? booking.passengers.filter((passenger) => !passenger.isCancelled)
    : [];
  return activePassengers.length > 0 && Number(booking.id) > 0;
};

export const getBusStatusPresentation = (status) => {
  const map = {
    Upcoming: { label: "CONFIRMED", color: "#C8172C", tint: "#FDECEF" },
    CancellationPending: { label: "CANCELLATION PENDING", color: "#B54708", tint: "#FFFAEB" },
    ManualReviewRequired: { label: "MANUAL REVIEW REQUIRED", color: "#B54708", tint: "#FFFAEB" },
    PartiallyCancelled: { label: "PARTIALLY CANCELLED", color: "#9A3412", tint: "#FFF1E8" },
    Past: { label: "COMPLETED", color: "#475569", tint: "#EEF2F6" },
    Cancelled: { label: "CANCELLED", color: "#B42318", tint: "#FEECEB" },
    PaymentFailed: { label: "PAYMENT FAILED", color: "#B42318", tint: "#FEECEB" },
  };
  return map[status] || map.Upcoming;
};
