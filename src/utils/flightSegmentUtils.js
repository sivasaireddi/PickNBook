export function isMatchingCityOrAirport(codeA, codeB) {
  if (!codeA || !codeB) return false;
  const a = String(codeA).trim().toUpperCase();
  const b = String(codeB).trim().toUpperCase();
  if (a === b) return true;
  
  const cityGroups = [
    ["DXB", "XNB", "DWC", "SHJ", "DUBAI"],
    ["DEL", "NDLS", "DELHI", "NEW DELHI"],
    ["BOM", "MUMBAI"],
    ["LHR", "LGW", "LCY", "STN", "LTN", "SEN", "LON", "LONDON"],
    ["JFK", "EWR", "LGA", "NYC", "NEW YORK"],
    ["HND", "NRT", "TYO", "TOKYO"],
    ["DOH", "DOHA"]
  ];
  
  for (const group of cityGroups) {
    if (group.includes(a) && group.includes(b)) {
      return true;
    }
  }
  return false;
}

export function extractRelevantSegments(allSegments, requestedOrigin, requestedDestination) {
  if (!Array.isArray(allSegments) || allSegments.length === 0) return [];
  
  let startIndex = -1;
  for (let i = 0; i < allSegments.length; i++) {
    const seg = allSegments[i];
    const segOrigin = seg.Origin?.AirportCode || seg.FromAirportCode || seg.Origin?.CityName || seg.FromCity || "";
    if (isMatchingCityOrAirport(segOrigin, requestedOrigin)) {
      startIndex = i;
      break;
    }
  }
  
  if (startIndex === -1) return [];
  
  let endIndex = -1;
  for (let i = startIndex; i < allSegments.length; i++) {
    const seg = allSegments[i];
    const segDest = seg.Destination?.AirportCode || seg.ToAirportCode || seg.Destination?.CityName || seg.ToCity || "";
    if (isMatchingCityOrAirport(segDest, requestedDestination)) {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex === -1) {
    // If strict destination match fails, return remaining segments
    return allSegments.slice(startIndex);
  }
  
  return allSegments.slice(startIndex, endIndex + 1);
}
