const titleCaseCity = (value) => {
  const city = String(value || "").trim();
  if (!city) return "";
  return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
};

export function normalizeBusLocationResults(items = []) {
  const grouped = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    let city = String(item?.city || "").trim();
    let locality = String(
      item?.name || item?.label || item?.description || "",
    ).trim();
    const description = String(
      item?.description || item?.label || item?.cityName || "",
    ).trim();
    const cityId = String(
      item?.cityCode || item?.cityId || item?.code || item?.place_id || "",
    ).trim();
    const stateName = String(item?.stateName || item?.state || "").trim();

    if (!city && description) {
      const parts = description.split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        [locality, city] = parts;
      } else {
        city = parts[0] || "";
      }
    }

    if (!city) {
      const parts = String(item?.cityName || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        [locality, city] = parts;
      } else {
        city = parts[0] || locality;
      }
    }

    const cityName = titleCaseCity(city);
    if (!cityName) return;

    const groupKey = cityName.toLowerCase();
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        city: cityName,
        state: stateName,
        cityPayload: {
          cityId,
          cityName,
          label: cityName,
          stateName,
        },
        subLocations: [],
      });
    }

    const group = grouped.get(groupKey);
    if (!group.state && stateName) {
      group.state = stateName;
      group.cityPayload.stateName = stateName;
    }

    if (locality && locality.toLowerCase() !== cityName.toLowerCase()) {
      const label = locality.trim();
      const exists = group.subLocations.some(
        (entry) =>
          (cityId && entry.cityId === cityId) ||
          entry.label.toLowerCase() === label.toLowerCase(),
      );
      if (!exists) {
        group.subLocations.push({
          cityId,
          cityName,
          label,
          stateName,
        });
      }
    }
  });

  return Array.from(grouped.values());
}

export function flattenBusLocationResults(groups = [], limit = 8) {
  const rows = [];

  for (const group of groups) {
    if (rows.length >= limit) break;
    rows.push({
      key: `city:${group.cityPayload.cityId || group.city.toLowerCase()}`,
      title: group.city,
      subtitle: group.state,
      kind: "city",
      payload: group.cityPayload,
    });

    for (const location of group.subLocations || []) {
      if (rows.length >= limit) break;
      rows.push({
        key: `location:${location.cityId || `${location.label}:${location.cityName}`}`,
        title: location.label,
        subtitle: location.cityName,
        kind: "location",
        payload: {
          ...location,
          label: `${location.label}, ${group.city}`,
        },
      });
    }
  }

  return rows;
}
