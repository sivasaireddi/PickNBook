const EXIT_NAME_PATTERNS = [
  { pattern: /^RB_RF_EXIT(?:_\d+)?$/, type: "ROOF_EXIT" },
  { pattern: /^RB_BK_EXIT$/, type: "BACK_EXIT" },
  // Some suppliers use the shorter RB_EXIT marker for the roof exit.
  { pattern: /^RB_EXIT$/, type: "ROOF_EXIT" },
  { pattern: /^ROOF_EXIT(?:_\d+)?$/, type: "ROOF_EXIT" },
];

export const getSeatName = (seatOrName) =>
  typeof seatOrName === "string"
    ? seatOrName
    : seatOrName?.SeatName ?? seatOrName?.seatName ?? seatOrName?.seatCode ?? "";

/** Return the visual exit type for a provider seat name, or null for seats. */
export const getExitType = (seatOrName) => {
  if (seatOrName && typeof seatOrName === "object") {
    const normalizedType = String(
      seatOrName.type ?? seatOrName.exitType ?? seatOrName.ExitType ?? "",
    ).trim().toUpperCase();
    if (["FRONT_EXIT", "MIDDLE_EXIT", "BACK_EXIT", "ROOF_EXIT"].includes(normalizedType)) {
      return normalizedType;
    }
    if (normalizedType === "EMERGENCY_EXIT") return "BACK_EXIT";
  }

  const name = String(getSeatName(seatOrName)).trim().toUpperCase();
  if (/(^|_)BK_EXIT(?:_|$)/.test(name)) return "BACK_EXIT";
  if (/(^|_)(?:FRONT|FT)_EXIT(?:_|$)/.test(name)) return "FRONT_EXIT";
  if (/(^|_)(?:MIDDLE|MID)_EXIT(?:_|$)/.test(name)) return "MIDDLE_EXIT";
  return EXIT_NAME_PATTERNS.find(({ pattern }) => pattern.test(name))?.type ?? null;
};

/** Special provider items occupy layout space but must never be selectable. */
export const isSpecialSeatItem = (seatOrName) => {
  const name = String(getSeatName(seatOrName)).trim().toUpperCase();
  return Boolean(
    getExitType(name) ||
      /(^|[\s_-])(EXIT|AISLE|DOOR|CABIN)(?=$|[\s_-])/.test(name),
  );
};
