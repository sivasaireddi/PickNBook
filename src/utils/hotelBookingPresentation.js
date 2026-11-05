import {
  formatBookingCurrency,
  formatBookingDate,
  formatBookingDateTime,
  pickBookingValue,
  toBookingDate,
} from "./busBookingPresentation";

export const hasHotelValue = (value) => value !== undefined && value !== null && value !== "";

export const normalizeHotelStatusToken = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const firstObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const unwrapHotelBooking = (record) => {
  const root = firstObject(record);
  return firstObject(
    root.booking ??
    root.Booking ??
    root.data?.booking ??
    root.data?.Booking ??
    root.data ??
    root.result ??
    root.Result ??
    root
  );
};

export const normalizeHotelListStatus = (record = {}) => {
  const raw = unwrapHotelBooking(record);
  const values = [
    pickBookingValue(raw, ["status", "Status"], ""),
    pickBookingValue(raw, ["canonicalStatus", "CanonicalStatus"], ""),
    pickBookingValue(raw, ["fulfillmentStatus", "FulfillmentStatus"], ""),
    pickBookingValue(raw, ["bookingStatus", "BookingStatus"], ""),
    pickBookingValue(raw, ["tripState", "TripState"], ""),
  ].filter(hasHotelValue);
  const tokens = values.map(normalizeHotelStatusToken);
  const has = (...expected) => expected.some((value) => tokens.includes(value));
  if (has("cancelled", "canceled", "partiallycancelled", "cancelledandrefunded")) return "Cancelled";
  if (has("failed", "paymentfailed", "failedsuppliererror", "bookingfailed")) return "Failed";
  if (has("pending", "pendingreconciliation", "inprogress", "processing")) return "Pending";
  if (has("past", "completed", "checkedout")) return "Past";
  if (has("confirmed", "booked", "upcoming", "success")) return "Upcoming";
  return "Pending";
};

export const getHotelStatusPresentation = (listStatus, rawStatus = "") => {
  const map = {
    Upcoming: { label: "CONFIRMED", color: "#027A48", tint: "#ECFDF3" },
    Pending: { label: "CONFIRMATION PENDING", color: "#B54708", tint: "#FFFAEB" },
    Failed: { label: "BOOKING FAILED", color: "#B42318", tint: "#FEECEB" },
    Past: { label: "COMPLETED", color: "#475569", tint: "#EEF2F6" },
    Cancelled: { label: "CANCELLED", color: "#B42318", tint: "#FEECEB" },
  };
  const presentation = map[listStatus] || map.Pending;
  if (listStatus !== "Pending") return presentation;
  const token = normalizeHotelStatusToken(rawStatus);
  return token === "pendingreconciliation"
    ? { ...presentation, label: "RECONCILIATION PENDING" }
    : presentation;
};

export const getHotelRefundPresentation = (status) => {
  const token = normalizeHotelStatusToken(status);
  if (["completed", "refunded", "refundcredited", "success"].includes(token)) {
    return { label: "Refund Credited", color: "#027A48", tint: "#ECFDF3", completed: true };
  }
  if (["initiated", "pending", "processing", "refundprocessing"].includes(token)) {
    return { label: "Refund Processing", color: "#B54708", tint: "#FFFAEB", completed: false };
  }
  if (["notrequired", "norefundapplicable"].includes(token)) {
    return { label: "No Refund Applicable", color: "#475569", tint: "#EEF2F6", completed: true };
  }
  if (["failed", "manualreview", "manualreviewrequired"].includes(token)) {
    return { label: "Refund Under Review", color: "#B42318", tint: "#FEECEB", completed: false };
  }
  return hasHotelValue(status)
    ? { label: String(status).replace(/_/g, " "), color: "#475569", tint: "#EEF2F6", completed: false }
    : null;
};

const normalizeGuest = (guest, index) => ({
  id: pickBookingValue(guest, ["id", "Id"], `guest-${index}`),
  name: String(pickBookingValue(guest, ["fullName", "FullName", "guestName", "GuestName", "name", "Name"], "") || "").trim(),
  phone: String(pickBookingValue(guest, ["phone", "Phone", "phoneno", "Phoneno", "mobile", "Mobile"], "") || "").trim(),
  email: String(pickBookingValue(guest, ["email", "Email"], "") || "").trim(),
  age: pickBookingValue(guest, ["age", "Age"], null),
  gender: String(pickBookingValue(guest, ["gender", "Gender"], "") || "").trim(),
  lead: Boolean(pickBookingValue(guest, ["leadPassenger", "LeadPassenger", "isLead", "IsLead"], false)),
});

const normalizeLifecycleStage = (stage, index) => ({
  key: String(pickBookingValue(stage, ["key", "Key", "stageKey", "StageKey", "code", "Code", "type", "Type"], `stage-${index}`) || ""),
  title: String(pickBookingValue(stage, ["title", "Title", "displayName", "DisplayName", "name", "Name", "label", "Label", "stage", "Stage"], "") || "").trim(),
  status: String(pickBookingValue(stage, ["status", "Status", "state", "State"], "") || "").trim(),
  timestamp: pickBookingValue(stage, ["timestamp", "Timestamp", "timestampUtc", "TimestampUtc", "occurredAt", "OccurredAt", "occurredAtUtc", "OccurredAtUtc", "completedAt", "CompletedAt"], null),
  summary: String(pickBookingValue(stage, ["summary", "Summary", "customerMessage", "CustomerMessage", "description", "Description", "message", "Message"], "") || "").trim(),
});

const countNights = (checkIn, checkOut) => {
  const start = toBookingDate(checkIn);
  const end = toBookingDate(checkOut);
  if (!start || !end) return null;
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  return nights > 0 ? nights : null;
};

export const normalizeHotelBooking = (record = {}) => {
  const raw = unwrapHotelBooking(record);
  const cancellationAudit = firstObject(pickBookingValue(raw, ["cancellationAudit", "CancellationAudit"], {}));
  const paymentBreakdown = firstObject(pickBookingValue(raw, ["paymentBreakdown", "PaymentBreakdown", "payment", "Payment"], {}));
  const lifecycleRoot = firstObject(pickBookingValue(raw, ["lifecycleHierarchy", "LifecycleHierarchy"], {}));
  const lifecycleRaw = pickBookingValue(lifecycleRoot, ["stages", "Stages"], pickBookingValue(raw, ["timeline", "Timeline", "lifecycle", "Lifecycle"], []));
  const lifecycle = Array.isArray(lifecycleRaw) ? lifecycleRaw.map(normalizeLifecycleStage).filter((stage) => stage.title || stage.key) : [];
  const roomsRaw = pickBookingValue(raw, ["hotelRoomsDetails", "HotelRoomsDetails", "rooms", "Rooms"], []);
  const rooms = Array.isArray(roomsRaw) ? roomsRaw : [];
  const guestsRaw = pickBookingValue(raw, ["guests", "Guests", "hotelPassengers", "HotelPassengers", "passengers", "Passengers"], []);
  let guests = Array.isArray(guestsRaw) ? guestsRaw.map(normalizeGuest) : [];
  if (guests.length === 0 && rooms.length > 0) {
    guests = rooms.flatMap((room) => {
      const roomGuests = pickBookingValue(room, ["hotelPassenger", "HotelPassenger", "guests", "Guests"], []);
      return Array.isArray(roomGuests) ? roomGuests : [];
    }).map(normalizeGuest);
  }
  const checkIn = pickBookingValue(raw, ["checkInDate", "CheckInDate", "checkIn", "CheckIn"], null);
  const checkOut = pickBookingValue(raw, ["checkOutDate", "CheckOutDate", "checkOut", "CheckOut"], null);
  const rawStatus = String(pickBookingValue(raw, ["status", "Status", "canonicalStatus", "CanonicalStatus", "bookingStatus", "BookingStatus"], "") || "").trim();
  const listStatus = normalizeHotelListStatus(raw);
  const bookingId = pickBookingValue(raw, ["bookingId", "BookingId"], null);
  const cancellationPolicy = pickBookingValue(raw, ["cancellationPolicy", "CancellationPolicy"], null);
  const policyCanCancel = pickBookingValue(firstObject(cancellationPolicy), ["canCancel", "CanCancel"], null);
  const explicitCanCancel = pickBookingValue(raw, ["canCancel", "CanCancel", "cancellationEligible", "CancellationEligible"], policyCanCancel);
  const activeStatus = listStatus === "Upcoming";
  const canCancel = Boolean(bookingId) && activeStatus && explicitCanCancel !== false;
  const leadGuest = guests.find((guest) => guest.lead) || guests[0] || {};
  const guestName = String(pickBookingValue(raw, ["guestName", "GuestName", "leadGuestName", "LeadGuestName"], leadGuest.name || "") || "").trim();
  const guestPhone = String(pickBookingValue(raw, ["guestPhone", "GuestPhone", "phone", "Phone"], leadGuest.phone || "") || "").trim();
  const guestEmail = String(pickBookingValue(raw, ["guestEmail", "GuestEmail", "email", "Email"], leadGuest.email || "") || "").trim();
  const firstRoom = rooms[0] || {};
  const roomCount = pickBookingValue(raw, ["numberOfRooms", "NumberOfRooms", "noOfRooms", "NoOfRooms", "roomCount", "RoomCount"], rooms.length || null);
  const adultCount = pickBookingValue(raw, ["adultCount", "AdultCount", "adults", "Adults", "noOfAdults", "NoOfAdults"], null);
  const childCount = pickBookingValue(raw, ["childCount", "ChildCount", "children", "Children", "noOfChildren", "NoOfChildren"], null);
  const totalPaid = pickBookingValue(raw, ["totalPrice", "TotalPrice", "totalPriceInr", "TotalPriceInr", "totalPaid", "TotalPaid", "totalAmountPaid", "TotalAmountPaid", "amount", "Amount"], null);
  const refundAmount = pickBookingValue(cancellationAudit, ["customerRefundAmount", "CustomerRefundAmount", "refundAmount", "RefundAmount"], pickBookingValue(raw, ["refundAmount", "RefundAmount", "refundAmountInr", "RefundAmountInr"], null));
  const refundStatus = String(pickBookingValue(cancellationAudit, ["refundStatus", "RefundStatus"], pickBookingValue(raw, ["refundStatus", "RefundStatus", "financialStatus", "FinancialStatus"], "")) || "").trim();
  const refundReference = String(pickBookingValue(raw, ["cashfreeRefundId", "CashfreeRefundId", "refundId", "RefundId"], pickBookingValue(cancellationAudit, ["cashfreeRefundId", "CashfreeRefundId", "refundId", "RefundId"], "")) || "").trim();
  const refundSettlementStage = lifecycle.find((stage) => normalizeHotelStatusToken(stage.key) === "refundsettlement" && normalizeHotelStatusToken(stage.status) === "completed");
  const paymentStatus = String(pickBookingValue(paymentBreakdown, ["status", "Status", "paymentStatus", "PaymentStatus"], pickBookingValue(raw, ["paymentStatus", "PaymentStatus"], "")) || "").trim();
  const bookingStatusTokens = ["status", "canonicalStatus", "fulfillmentStatus", "bookingStatus", "tripState"]
    .map((key) => normalizeHotelStatusToken(pickBookingValue(raw, [key, key[0].toUpperCase() + key.slice(1)], "")))
    .filter(Boolean);
  const paymentToken = normalizeHotelStatusToken(paymentStatus);
  const paymentReceived = pickBookingValue(raw, ["isPaid", "IsPaid", "paymentSucceeded", "PaymentSucceeded"], pickBookingValue(paymentBreakdown, ["isPaid", "IsPaid"], false)) === true
    || ["paid", "success", "completed", "authorized", "captured", "refunded"].includes(paymentToken);
  const paymentFailed = bookingStatusTokens.includes("paymentfailed") || ["failed", "cancelled", "canceled", "abandoned"].includes(paymentToken);
  const supplierFulfillmentFailed = bookingStatusTokens.includes("failedsuppliererror");

  return {
    id: bookingId,
    key: String(bookingId ?? pickBookingValue(raw, ["bookingReference", "BookingReference"], "")),
    bookingReference: String(pickBookingValue(raw, ["bookingReference", "BookingReference"], "") || "").trim(),
    confirmationNo: String(pickBookingValue(raw, ["confirmationNo", "ConfirmationNo", "confirmationNumber", "ConfirmationNumber", "pnr", "Pnr"], "") || "").trim(),
    providerBookingId: String(pickBookingValue(raw, ["providerBookingId", "ProviderBookingId", "srdvBookingId", "SrdvBookingId"], "") || "").trim(),
    status: rawStatus || listStatus,
    listStatus,
    statusPresentation: getHotelStatusPresentation(listStatus, rawStatus),
    canCancel,
    cancellationIdMissing: activeStatus && !bookingId,
    hotelName: String(pickBookingValue(raw, ["hotelName", "HotelName", "propertyName", "PropertyName"], "") || "").trim(),
    address: String(pickBookingValue(raw, ["hotelAddress", "HotelAddress", "address", "Address", "location", "Location", "city", "City"], "") || "").trim(),
    checkIn,
    checkOut,
    nights: pickBookingValue(raw, ["nights", "Nights", "numberOfNights", "NumberOfNights"], countNights(checkIn, checkOut)),
    roomCount,
    adultCount,
    childCount,
    roomType: String(pickBookingValue(raw, ["roomType", "RoomType", "roomTypeName", "RoomTypeName"], pickBookingValue(firstRoom, ["roomTypeName", "RoomTypeName"], "")) || "").trim(),
    ratePlan: String(pickBookingValue(raw, ["ratePlan", "RatePlan", "mealPlan", "MealPlan"], pickBookingValue(firstRoom, ["ratePlan", "RatePlan", "mealPlan", "MealPlan"], "")) || "").trim(),
    guests,
    guestName,
    guestPhone,
    guestEmail,
    totalPaid,
    paymentMethod: String(pickBookingValue(paymentBreakdown, ["paymentMethod", "PaymentMethod", "method", "Method"], pickBookingValue(raw, ["paymentMethod", "PaymentMethod"], "")) || "").trim(),
    paymentReference: String(pickBookingValue(raw, ["paymentReference", "PaymentReference", "paymentTransactionId", "PaymentTransactionId", "paymentId", "PaymentId", "cashfreePaymentId", "CashfreePaymentId", "transactionId", "TransactionId"], pickBookingValue(paymentBreakdown, ["paymentReference", "PaymentReference", "paymentId", "PaymentId", "cashfreePaymentId", "CashfreePaymentId", "transactionId", "TransactionId"], "")) || "").trim(),
    paymentStatus,
    paymentReceived,
    paymentFailed,
    supplierFulfillmentFailed,
    bookedAt: pickBookingValue(raw, ["bookedAt", "BookedAt", "bookedAtUtc", "BookedAtUtc", "createdAt", "CreatedAt"], null),
    cancellationPolicy,
    cancellationAudit,
    cancellationReason: String(pickBookingValue(raw, ["cancellationReason", "CancellationReason"], pickBookingValue(cancellationAudit, ["cancellationReason", "CancellationReason"], "")) || "").trim(),
    cancelledAt: pickBookingValue(raw, ["cancelledAt", "CancelledAt", "cancelledAtUtc", "CancelledAtUtc"], pickBookingValue(cancellationAudit, ["cancelledAt", "CancelledAt", "cancelledAtUtc", "CancelledAtUtc"], null)),
    cancellationCharge: pickBookingValue(raw, ["cancellationChargeInr", "CancellationChargeInr", "cancellationCharge", "CancellationCharge"], null),
    supplierCancellationCharge: pickBookingValue(cancellationAudit, ["supplierCancellationCharge", "SupplierCancellationCharge"], null),
    serviceCharge: pickBookingValue(cancellationAudit, ["serviceCharge", "ServiceCharge"], null),
    refundAmount,
    refundStatus,
    refundPresentation: getHotelRefundPresentation(refundStatus),
    refundReference,
    refundCompletedAt: refundSettlementStage?.timestamp || null,
    lifecycle,
    raw,
  };
};

export const formatHotelStayRange = (booking) => {
  const checkIn = formatBookingDate(booking?.checkIn);
  const checkOut = formatBookingDate(booking?.checkOut);
  return [checkIn, checkOut].filter(Boolean).join(" → ");
};

export const formatHotelGuestSummary = (booking) => {
  const parts = [];
  if (hasHotelValue(booking?.roomCount)) parts.push(`${booking.roomCount} ${Number(booking.roomCount) === 1 ? "room" : "rooms"}`);
  if (hasHotelValue(booking?.adultCount)) parts.push(`${booking.adultCount} ${Number(booking.adultCount) === 1 ? "adult" : "adults"}`);
  if (hasHotelValue(booking?.childCount) && Number(booking.childCount) > 0) parts.push(`${booking.childCount} ${Number(booking.childCount) === 1 ? "child" : "children"}`);
  if (parts.length === 0 && booking?.guests?.length) parts.push(`${booking.guests.length} ${booking.guests.length === 1 ? "guest" : "guests"}`);
  return parts.join(" · ");
};

export const formatHotelMoney = formatBookingCurrency;
export const formatHotelDate = formatBookingDate;
export const formatHotelDateTime = formatBookingDateTime;
