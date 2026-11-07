export const HOTEL_ROOM_HOLD_DURATION_MS = 10 * 60 * 1000;
export const HOTEL_ROOM_HOLD_CRITICAL_SECONDS = 30;

export const getHotelBlockRemainingSeconds = (expiresAtMs, now = Date.now()) => {
  const expiresAt = Number(expiresAtMs);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return 0;
  return Math.max(0, Math.floor((expiresAt - now) / 1000));
};

export const formatHotelBlockTime = (remainingSeconds) => {
  const safeSeconds = Math.max(0, Number(remainingSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const getHotelBlockTimerState = (expiresAtMs, now = Date.now()) => {
  const hasValidExpiry = Number.isFinite(Number(expiresAtMs)) && Number(expiresAtMs) > 0;
  const remainingSeconds = getHotelBlockRemainingSeconds(expiresAtMs, now);
  if (!hasValidExpiry) return { key: "missing", remainingSeconds };
  if (remainingSeconds === 0) return { key: "expired", remainingSeconds };
  if (remainingSeconds <= HOTEL_ROOM_HOLD_CRITICAL_SECONDS) return { key: "critical", remainingSeconds };
  if (remainingSeconds <= 120) return { key: "warning", remainingSeconds };
  return { key: "normal", remainingSeconds };
};

export const getHotelPricingInputs = (rooms = []) => rooms.reduce((totals, room) => {
  const price = room?.Price || room?.price || {};
  const rawTotal = Number(
    room?.B2CTotalPrice || room?.b2CTotalPrice || room?.b2cTotalPrice ||
    price.B2CTotalPrice || price.b2CTotalPrice || price.b2cTotalPrice || price.b2cFinalFare || price.B2CFinalFare ||
    price.b2cDisplayFare || price.B2CDisplayFare || price.OfferedPrice || price.offeredPrice ||
    price.PublishedPrice || price.publishedPrice || 0
  );
  const supplierPricing = room?.SupplierPricing || room?.supplierPricing || price.SupplierPricing || price.supplierPricing;
  const supplierTotal = Number(supplierPricing?.TotalPrice ?? supplierPricing?.totalPrice ?? 0);
  if (supplierPricing && supplierTotal > 0) {
    const supplierBase = Number(supplierPricing.BasePrice ?? supplierPricing.basePrice ?? 0);
    const b2cBase = supplierBase + (rawTotal - supplierTotal);
    totals.base += b2cBase;
    totals.gst += rawTotal - b2cBase;
    return totals;
  }
  const roomBase = Number(
    room?.B2CBasePrice || room?.b2CBasePrice || price.B2CBasePrice || price.b2cBasePrice ||
    price.RoomPrice || price.roomPrice || price.PublishedPrice || price.publishedPrice || 0
  );
  const gst = price.GST || price.gst || {};
  const gstBreakupTotal = [
    gst.CGSTAmount, gst.cgstAmount, gst.SGSTAmount, gst.sgstAmount,
    gst.IGSTAmount, gst.igstAmount, gst.CessAmount, gst.cessAmount,
  ].reduce((sum, value) => sum + (Number(value) || 0), 0);
  totals.base += Number(price.b2CBasePrice ?? price.b2cBasePrice ?? roomBase);
  totals.gst += Number(price.TotalGSTAmount ?? price.totalGSTAmount ?? 0) ||
    Number(price.Tax ?? price.tax ?? 0) || gstBreakupTotal;
  return totals;
}, { base: 0, gst: 0 });

const normalizeProviderId = (value) => value === null || value === undefined ? "" : String(value).trim();
export const getHotelRoomIdentity = (room = {}) => ({
  roomIndex: normalizeProviderId(room.RoomIndex ?? room.roomIndex),
  roomTypeCode: normalizeProviderId(room.RoomTypeCode ?? room.roomTypeCode),
  optionId: normalizeProviderId(room.OptionId ?? room.optionId),
});
const getBlockedRateCorrelationKey = (room = {}) => {
  const ratePlanCode = normalizeProviderId(room.RatePlanCode ?? room.ratePlanCode);
  const roomTypeName = normalizeProviderId(room.RoomTypeName ?? room.roomTypeName).toLowerCase();
  const mealBasis = normalizeProviderId(room.MealBasis ?? room.mealBasis).toLowerCase();
  return ratePlanCode && roomTypeName && mealBasis ? `${ratePlanCode}\u001f${roomTypeName}\u001f${mealBasis}` : "";
};

export const mergeBlockedRoomsWithSelectedIdentity = (blockedRooms, selectedRooms) => {
  if (blockedRooms.length !== selectedRooms.length) {
    throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
  }
  const selectedGroups = new Map();
  selectedRooms.forEach((room) => {
    const key = getBlockedRateCorrelationKey(room);
    const identity = getHotelRoomIdentity(room);
    if (!key || !identity.roomIndex || !identity.roomTypeCode || !identity.optionId) {
      throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
    }
    const group = selectedGroups.get(key) || { count: 0, identityKey: "", identity: null, ambiguous: false };
    const identityKey = `${identity.roomIndex}\u001f${identity.roomTypeCode}\u001f${identity.optionId}`;
    if (group.identityKey && group.identityKey !== identityKey) group.ambiguous = true;
    group.count += 1;
    group.identityKey = group.identityKey || identityKey;
    group.identity = group.identity || identity;
    selectedGroups.set(key, group);
  });
  const blockedCounts = new Map();
  blockedRooms.forEach((room) => {
    const key = getBlockedRateCorrelationKey(room);
    if (!key) throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
    blockedCounts.set(key, (blockedCounts.get(key) || 0) + 1);
  });
  selectedGroups.forEach((group, key) => {
    if (blockedCounts.get(key) !== group.count || group.ambiguous || !group.identity) {
      throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
    }
  });
  if (blockedCounts.size !== selectedGroups.size) {
    throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
  }
  return blockedRooms.map((blockedRoom) => {
    const identity = selectedGroups.get(getBlockedRateCorrelationKey(blockedRoom))?.identity;
    if (!identity) throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
    return {
      ...blockedRoom,
      RoomIndex: identity.roomIndex,
      RoomTypeCode: identity.roomTypeCode,
      OptionId: identity.optionId,
      roomIndex: identity.roomIndex,
      roomTypeCode: identity.roomTypeCode,
      optionId: identity.optionId,
    };
  });
};

export const normalizeSuccessfulHotelBlock = (response, selectedRooms) => {
  const blockResult = response?.BlockRoomResult || response?.blockRoomResult || response || {};
  const error = blockResult?.error || blockResult?.Error;
  const errorCode = Number(error?.errorCode ?? error?.ErrorCode);
  const availabilityType = String(blockResult?.availabilityType ?? blockResult?.AvailabilityType ?? "").toLowerCase();
  const canProceed = blockResult?.canProceedToBook ?? blockResult?.CanProceedToBook;
  const blockedRooms = blockResult.HotelRoomsDetails || blockResult.hotelRoomsDetails;
  if (!Number.isFinite(errorCode) || errorCode !== 0 || availabilityType !== "confirm" || canProceed !== true || !Array.isArray(blockedRooms) || !blockedRooms.length) {
    throw new Error(error?.errorMessage || error?.ErrorMessage || "This room is no longer available.");
  }
  const authoritativeRooms = mergeBlockedRoomsWithSelectedIdentity(blockedRooms, selectedRooms);
  return {
    authoritativeRooms,
    blockResult: { ...blockResult, HotelRoomsDetails: authoritativeRooms, hotelRoomsDetails: authoritativeRooms },
  };
};
