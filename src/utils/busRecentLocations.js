import * as SecureStore from "expo-secure-store";

const KEYS = {
  source: "picknbook.bus.recentSources",
  destination: "picknbook.bus.recentDestinations",
};

const MAX_RECENTS = 4;

export const normalizeRecentBusLocation = (location) => ({
  cityId: String(location?.cityId || "").trim(),
  cityName: String(location?.cityName || "").trim(),
  label: String(location?.label || location?.cityName || "").trim(),
  stateName: String(location?.stateName || "").trim(),
});

export const getBusLocationIdentity = (location) => {
  const normalized = normalizeRecentBusLocation(location);
  return normalized.cityId
    ? `id:${normalized.cityId}`
    : `name:${normalized.cityName.toLowerCase()}|${normalized.label.toLowerCase()}`;
};

const getKey = (field) => KEYS[field] || KEYS.source;

export async function loadRecentBusLocations(field) {
  try {
    const stored = await SecureStore.getItemAsync(getKey(field));
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecentBusLocation)
      .filter((location) => location.cityName)
      .slice(0, MAX_RECENTS);
  } catch (error) {
    if (__DEV__) console.warn("[BusRecents] Unable to load recent locations", error?.message);
    return [];
  }
}

async function saveRecentBusLocations(field, locations) {
  const safeLocations = locations
    .map(normalizeRecentBusLocation)
    .filter((location) => location.cityName)
    .slice(0, MAX_RECENTS);

  try {
    await SecureStore.setItemAsync(getKey(field), JSON.stringify(safeLocations));
  } catch (error) {
    if (__DEV__) console.warn("[BusRecents] Unable to save recent locations", error?.message);
  }
  return safeLocations;
}

export async function addRecentBusLocation(field, location, currentLocations = []) {
  const normalized = normalizeRecentBusLocation(location);
  const identity = getBusLocationIdentity(normalized);
  const next = [
    normalized,
    ...currentLocations.filter(
      (entry) => getBusLocationIdentity(entry) !== identity,
    ),
  ].slice(0, MAX_RECENTS);
  return saveRecentBusLocations(field, next);
}

export async function removeRecentBusLocation(field, location, currentLocations = []) {
  const identity = getBusLocationIdentity(location);
  const next = currentLocations.filter(
    (entry) => getBusLocationIdentity(entry) !== identity,
  );
  return saveRecentBusLocations(field, next);
}
