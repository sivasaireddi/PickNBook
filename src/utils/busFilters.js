const BUS_TYPE_ICON_MAP = {
  "AC": "air-conditioner",
  "Non AC": "bus",
  "Seater": "seat",
  "Sleeper": "bed",
};

export const BUS_TYPE_OPTIONS = [
  { label: "AC", icon: BUS_TYPE_ICON_MAP.AC },
  { label: "Non AC", icon: BUS_TYPE_ICON_MAP["Non AC"] },
  { label: "Seater", icon: BUS_TYPE_ICON_MAP.Seater },
  { label: "Sleeper", icon: BUS_TYPE_ICON_MAP.Sleeper },
];

export const TIME_BANDS = [
  { label: "6am to 12pm", value: "morning", icon: "partly-sunny-outline" },
  { label: "12pm to 6pm", value: "afternoon", icon: "sunny-outline" },
  { label: "6pm to 12am", value: "evening", icon: "moon-outline" },
  { label: "12am to 6am", value: "night", icon: "moon" },
];

export const createDefaultBusFilters = () => ({
  priceMin: "",
  priceMax: "",
  busTypes: [],
  departureTimes: [],
  arrivalTimes: [],
  amenities: [],
  boardingPoints: [],
  droppingPoints: [],
  travels: [],
});

const stringify = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const normalizeText = (value) =>
  stringify(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toNumber = (value) => {
  const text = stringify(value);

  if (!text) return null;

  const parsed = Number(text.replace(/[^0-9.-]/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
};

const firstNonEmpty = (values) => values.map(stringify).find(Boolean) || "";

const extractLabel = (value) => {
  if (Array.isArray(value)) {
    return firstNonEmpty(value.map(extractLabel));
  }

  if (value && typeof value === "object") {
    return firstNonEmpty([
      value.name,
      value.label,
      value.title,
      value.value,
      value.text,
      value.point,
      value.stop,
      value.station,
      value.boardingPoint,
      value.droppingPoint,
      value.operatorName,
      value.travelName,
      value.busType,
      value.amenity,
      value.feature,
    ]);
  }

  return stringify(value);
};

const extractLabels = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractLabels(entry));
  }

  const label = extractLabel(value);

  return label ? [label] : [];
};

const uniqueLabels = (values) => {
  const map = new Map();

  values.forEach((label) => {
    const normalized = normalizeText(label);

    if (!normalized || map.has(normalized)) return;

    map.set(normalized, label);
  });

  return Array.from(map.values());
};

const collectItemLabels = (item, keys) =>
  keys.flatMap((key) => extractLabels(item?.[key]));

const parseDateLike = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = stringify(value);

  if (!text) return null;

  const direct = new Date(text);

  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const forcedUtc = new Date(text.endsWith("Z") ? text : `${text}Z`);

  return Number.isNaN(forcedUtc.getTime()) ? null : forcedUtc;
};

const getTimeBand = (value) => {
  const text = stringify(value);

  if (!text) return "";

  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);

  let hours = null;

  if (timeMatch) {
    hours = Number(timeMatch[1]);
  } else {
    const parsedDate = parseDateLike(text);

    if (!parsedDate) return "";

    hours =
      text.includes("T") || text.includes("Z")
        ? parsedDate.getUTCHours()
        : parsedDate.getHours();
  }

  if (hours >= 6 && hours < 12) return "morning";

  if (hours >= 12 && hours < 18) return "afternoon";

  if (hours >= 18 && hours < 24) return "evening";

  return "night";
};

const matchesBusTypeLabel = (busType, label) => {
  const normalizedBusType = normalizeText(busType);
  const normalizedLabel = normalizeText(label);

  if (!normalizedBusType || !normalizedLabel) return false;

  if (normalizedLabel === "ac") {
    return (
      normalizedBusType.includes("ac") &&
      !normalizedBusType.includes("non ac") &&
      !normalizedBusType.includes("nonac")
    );
  }

  if (normalizedLabel === "non ac") {
    return (
      normalizedBusType.includes("non ac") ||
      normalizedBusType.includes("nonac")
    );
  }

  if (normalizedLabel === "seater") {
    return normalizedBusType.includes("seater");
  }

  if (normalizedLabel === "sleeper") {
    return normalizedBusType.includes("sleeper");
  }

  return (
    normalizedBusType === normalizedLabel ||
    normalizedBusType.includes(normalizedLabel) ||
    normalizedLabel.includes(normalizedBusType)
  );
};

const matchesSelection = (itemValues, selectedValues) => {
  const selections = uniqueLabels((selectedValues || []).filter(Boolean));

  if (!selections.length) return true;

  const normalizedItemValues = uniqueLabels(itemValues.filter(Boolean));

  if (!normalizedItemValues.length) return false;

  return selections.some((selection) => {
    const normalizedSelection = normalizeText(selection);

    return normalizedItemValues.some((itemValue) => {
      const normalizedItemValue = normalizeText(itemValue);

      return (
        normalizedItemValue === normalizedSelection ||
        normalizedItemValue.includes(normalizedSelection) ||
        normalizedSelection.includes(normalizedItemValue)
      );
    });
  });
};

const matchesPriceRange = (item, priceMin, priceMax) => {
  const hasMin = priceMin !== null;
  const hasMax = priceMax !== null;

  if (!hasMin && !hasMax) {
    return true;
  }

  const price = toNumber(item?.priceInr ?? item?.price ?? item?.fare);

  if (price === null) {
    return false;
  }

  const lower =
    hasMin && hasMax ? Math.min(priceMin, priceMax) : hasMin ? priceMin : null;
  const upper =
    hasMin && hasMax ? Math.max(priceMin, priceMax) : hasMax ? priceMax : null;

  if (lower !== null && price < lower) return false;

  if (upper !== null && price > upper) return false;

  return true;
};

export const buildBusFilterOptions = (items = []) => {
  const buses = Array.isArray(items) ? items : [];
  const priceValues = buses
    .map((item) => toNumber(item?.priceInr ?? item?.price ?? item?.fare))
    .filter((value) => value !== null);

  const priceBounds = priceValues.length
    ? {
        min: Math.min(...priceValues),
        max: Math.max(...priceValues),
      }
    : { min: 0, max: 0 };

  return {
    priceBounds,
    busTypes: BUS_TYPE_OPTIONS.map((option) => ({
      ...option,
      count: buses.filter((item) =>
        matchesBusTypeLabel(item?.busType, option.label),
      ).length,
    })),
    departureTimes: TIME_BANDS,
    arrivalTimes: TIME_BANDS,
    amenities: uniqueLabels(
      buses.flatMap((item) =>
        collectItemLabels(item, [
          "amenities",
          "amenity",
          "features",
          "feature",
          "specialFeatures",
          "specialFeature",
        ]),
      ),
    ),
    boardingPoints: uniqueLabels(
      buses.flatMap((item) =>
        collectItemLabels(item, [
          "boardingPoints",
          "boardingPoint",
          "boardingLocation",
          "boardingStops",
        ]),
      ),
    ),
    droppingPoints: uniqueLabels(
      buses.flatMap((item) =>
        collectItemLabels(item, [
          "droppingPoints",
          "droppingPoint",
          "dropPoint",
          "droppingLocation",
          "dropStops",
        ]),
      ),
    ),
    travels: uniqueLabels(
      buses.flatMap((item) =>
        collectItemLabels(item, [
          "operatorName",
          "travelName",
          "travelOperator",
          "operator",
          "serviceName",
        ]),
      ),
    ),
  };
};

export const matchesBusFilters = (item, filters = createDefaultBusFilters()) => {
  const priceMin = toNumber(filters?.priceMin);
  const priceMax = toNumber(filters?.priceMax);

  if (!matchesPriceRange(item, priceMin, priceMax)) {
    return false;
  }

  if (!matchesSelection([item?.busType], filters?.busTypes)) {
    return false;
  }

  if (
    !matchesSelection(
      [getTimeBand(item?.departureTimeUtc ?? item?.departureTime)],
      filters?.departureTimes,
    )
  ) {
    return false;
  }

  if (
    !matchesSelection(
      [getTimeBand(item?.arrivalTimeUtc ?? item?.arrivalTime)],
      filters?.arrivalTimes,
    )
  ) {
    return false;
  }

  if (
    !matchesSelection(
      collectItemLabels(item, [
        "amenities",
        "amenity",
        "features",
        "feature",
        "specialFeatures",
        "specialFeature",
      ]),
      filters?.amenities,
    )
  ) {
    return false;
  }

  if (
    !matchesSelection(
      collectItemLabels(item, [
        "boardingPoints",
        "boardingPoint",
        "boardingLocation",
        "boardingStops",
      ]),
      filters?.boardingPoints,
    )
  ) {
    return false;
  }

  if (
    !matchesSelection(
      collectItemLabels(item, [
        "droppingPoints",
        "droppingPoint",
        "dropPoint",
        "droppingLocation",
        "dropStops",
      ]),
      filters?.droppingPoints,
    )
  ) {
    return false;
  }

  if (
    !matchesSelection(
      collectItemLabels(item, [
        "operatorName",
        "travelName",
        "travelOperator",
        "operator",
        "serviceName",
      ]),
      filters?.travels,
    )
  ) {
    return false;
  }

  return true;
};
