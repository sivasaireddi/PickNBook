export const BUS_SEAT_HOLD_MS = 10 * 60 * 1000;

export const createBusSeatHold = (blockKey, now = Date.now()) => ({
  blockKey: String(blockKey || '').trim(),
  blockedAt: Number(now),
  expiresAt: Number(now) + BUS_SEAT_HOLD_MS,
});

export const getBusSeatHoldRemainingMs = (expiresAt, now = Date.now()) => {
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry)) return 0;
  return Math.max(0, expiry - Number(now));
};

export const isBusSeatHoldValid = (seatHold, now = Date.now()) =>
  Boolean(
    String(seatHold?.blockKey || '').trim() &&
    getBusSeatHoldRemainingMs(seatHold?.expiresAt, now) > 0
  );

export const formatBusSeatHoldTime = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const normalizeBusSeatNames = (seats) =>
  [...new Set((Array.isArray(seats) ? seats : [])
    .map((seat) => String((seat?.seatCode ?? seat?.seatName ?? seat) || '').trim().toUpperCase())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

export const areSameBusSeatSets = (leftSeats, rightSeats) => {
  const left = normalizeBusSeatNames(leftSeats);
  const right = normalizeBusSeatNames(rightSeats);
  return left.length === right.length && left.every((seat, index) => seat === right[index]);
};

export const BUS_SEAT_SET_CHANGE = Object.freeze({
  SAME_SET: 'SAME_SET',
  FULL_REPLACEMENT: 'FULL_REPLACEMENT',
  OVERLAPPING_CHANGED_SET: 'OVERLAPPING_CHANGED_SET',
});

export const classifyBusSeatSetChange = (heldSeats, selectedSeats) => {
  const held = normalizeBusSeatNames(heldSeats);
  const selected = normalizeBusSeatNames(selectedSeats);

  if (held.length === selected.length && held.every((seat, index) => seat === selected[index])) {
    return BUS_SEAT_SET_CHANGE.SAME_SET;
  }

  const heldSet = new Set(held);
  return selected.some((seat) => heldSet.has(seat))
    ? BUS_SEAT_SET_CHANGE.OVERLAPPING_CHANGED_SET
    : BUS_SEAT_SET_CHANGE.FULL_REPLACEMENT;
};

const getBusField = (bus, keys) => {
  for (const key of keys) {
    const value = bus?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return '';
};

export const normalizeBusMatchText = (value) =>
  String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export const normalizeBusDepartureTime = (value) => {
  const text = String(value ?? '').trim();
  const match = text.match(/(?:^|[T\s])(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return '';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const getBusMatchIdentity = (bus) => ({
  routeId: normalizeBusMatchText(getBusField(bus, ['RouteId', 'routeId', 'RouteID', 'routeID'])),
  operator: normalizeBusMatchText(getBusField(bus, ['operatorName', 'OperatorName', 'TravelsName', 'travelsName'])),
  departure: normalizeBusDepartureTime(getBusField(bus, [
    'DepartureTime',
    'departureDateTime',
    'departureTimeUtc',
    'departureTime',
    'depTime',
  ])),
  busType: normalizeBusMatchText(getBusField(bus, ['BusType', 'busType', 'type'])),
});

export const findAuthoritativeBusMatch = (buses, originalBus) => {
  const candidates = Array.isArray(buses) ? buses : [];
  const original = getBusMatchIdentity(originalBus);

  if (original.routeId) {
    const routeMatch = candidates.find((bus) => {
      const fresh = getBusMatchIdentity(bus);
      return Boolean(fresh.routeId && fresh.routeId === original.routeId);
    });
    if (routeMatch) return routeMatch;
  }

  if (!original.operator || !original.departure) return null;

  const strictMatch = candidates.find((bus) => {
    const fresh = getBusMatchIdentity(bus);
    return fresh.operator === original.operator &&
      fresh.departure === original.departure &&
      Boolean(original.busType && fresh.busType === original.busType);
  });
  if (strictMatch) return strictMatch;

  return candidates.find((bus) => {
    const fresh = getBusMatchIdentity(bus);
    return fresh.operator === original.operator && fresh.departure === original.departure;
  }) || null;
};

const amountsMatch = (left, right) => {
  const leftAmount = Number(left);
  const rightAmount = Number(right);
  return Number.isFinite(leftAmount) &&
    Number.isFinite(rightAmount) &&
    Math.round(leftAmount * 100) === Math.round(rightAmount * 100);
};

export const normalizePassengerSeatAssignments = (passengers) =>
  (Array.isArray(passengers) ? passengers : [])
    .map((passenger) => ({
      seat: String(passenger?.seatNumber ?? passenger?.seatName ?? passenger?.seatCode ?? '').trim(),
      name: String(passenger?.fullName ?? passenger?.name ?? '').trim().toLowerCase(),
    }))
    .filter((passenger) => passenger.seat)
    .sort((left, right) => left.seat.localeCompare(right.seat));

export const areSamePassengerSeatAssignments = (leftPassengers, rightPassengers) => {
  const left = normalizePassengerSeatAssignments(leftPassengers);
  const right = normalizePassengerSeatAssignments(rightPassengers);
  return left.length === right.length && left.every(
    (passenger, index) =>
      passenger.seat === right[index].seat && passenger.name === right[index].name
  );
};

export const validateBusPrePayment = ({
  seatHold,
  currentSeats,
  heldSeatNames,
  tripIdentityMatches,
  passengerAssignmentsMatch,
  pricingPreview,
  pricingPreviewStatus,
  payableAmount,
  authoritativePayableAmount,
  now = Date.now(),
}) => {
  if (!isBusSeatHoldValid(seatHold, now)) {
    return { valid: false, reason: 'hold_expired' };
  }
  if (!areSameBusSeatSets(currentSeats, heldSeatNames)) {
    return { valid: false, reason: 'seat_mismatch' };
  }
  if (!tripIdentityMatches) {
    return { valid: false, reason: 'trip_mismatch' };
  }
  if (!passengerAssignmentsMatch) {
    return { valid: false, reason: 'passenger_mismatch' };
  }
  if (pricingPreviewStatus !== 'live' || !pricingPreview) {
    return { valid: false, reason: 'pricing_not_live' };
  }
  if (!amountsMatch(payableAmount, authoritativePayableAmount)) {
    return { valid: false, reason: 'amount_mismatch' };
  }
  return { valid: true, reason: null };
};
