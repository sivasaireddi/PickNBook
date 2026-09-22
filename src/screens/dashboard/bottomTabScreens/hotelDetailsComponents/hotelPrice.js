export const getHotelRoomFinalPrice = (room) => {
  const candidates = [
    room?.price?.b2cFinalFare,
    room?.price?.B2CFinalFare,
    room?.b2cFinalFare,
    room?.B2CFinalFare,
    room?.price?.b2CTotalPrice,
    room?.price?.B2CTotalPrice,
    room?.price?.offeredPrice,
    room?.offeredPrice,
    room?.price?.publishedPrice,
    room?.publishedPrice,
  ];
  const value = candidates.map(Number).find((candidate) => Number.isFinite(candidate) && candidate > 0);
  return value ?? null;
};
