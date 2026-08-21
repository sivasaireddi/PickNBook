export const getHotelPrice = (hotel) => {
  const price = Number(hotel?.price?.offeredPrice ?? hotel?.offeredFare ?? hotel?.price?.b2CTotalPrice ?? 0);
  return Number.isFinite(price) ? price : 0;
};

export const getHotelMealPlans = (hotel) => {
  const facilities = [];
  (hotel?.facilities || []).forEach((f) => {
    (f?.facilitiesNames || []).forEach((name) => {
      if (name) facilities.push(name);
    });
  });
  return facilities;
};

export const getHotelRoomCategories = (hotel) => {
  const rooms = [];
  (hotel?.rooms || []).forEach((r) => {
    const cat = r?.category ?? r?.cateogry;
    if (cat) rooms.push(cat);
  });
  return rooms;
};

export const getHotelPropertyType = (hotel) => {
  return hotel?.hotelCategory || "HOTEL";
};

export const getHotelLocation = (hotel) => {
  if (hotel?.city) return hotel.city;
  const address = String(hotel?.hotelAddress || hotel?.address || "");
  if (address) {
    const parts = address.split(",");
    if (parts.length > 0) return parts[parts.length - 1].trim();
  }
  return "Unknown";
};

export const normalizeMealPlan = (value) => {
  const v = String(value).toUpperCase();
  if (v.includes("ROOM ONLY")) return "Room Only";
  if (v.includes("BREAKFAST")) return "Breakfast Included";
  if (v.includes("DINNER")) return "Dinner Included";
  if (v.includes("HALF BOARD")) return "Half Board";
  if (v.includes("FULL BOARD")) return "Full Board";
  
  return String(value)
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const normalizePropertyType = (value) => {
  const v = String(value).toUpperCase();
  if (v === "HOTEL") return "Hotel";
  if (v === "GUESTHOUSE" || v === "GUEST HOUSE") return "Guest House";
  if (v === "PRIVATE VACATION HOME") return "Private Vacation Home";
  if (v === "RESORT") return "Resort";
  if (v === "APARTMENT") return "Apartment";
  if (v === "VILLA") return "Villa";
  if (v === "BED & BREAKFAST") return "Bed & Breakfast";

  return String(value)
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const normalizeRoomCategory = (value) => {
  const v = String(value).toUpperCase();
  const groupings = [];
  
  if (v.includes("STANDARD")) groupings.push("Standard");
  if (v.includes("DELUXE")) groupings.push("Deluxe");
  if (v.includes("PREMIUM")) groupings.push("Premium");
  if (v.includes("EXECUTIVE")) groupings.push("Executive");
  if (v.includes("SUITE")) groupings.push("Suite");
  if (v.includes("KING")) groupings.push("King");
  if (v.includes("DOUBLE")) groupings.push("Double");
  if (v.includes("TWIN")) groupings.push("Twin");
  if (v.includes("STUDIO")) groupings.push("Studio");
  
  if (groupings.length === 0) return "Other";
  
  return groupings.join(" / ");
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
};

export const filterHotels = (hotels, filters) => {
  return hotels.filter((hotel) => {
    const price = getHotelPrice(hotel);
    const fallbackRating = Number(hotel?.starRating ?? hotel?.rating) || 4.0;
    
    const category = getHotelPropertyType(hotel);
    const hotelName = String(hotel?.hotelName || hotel?.name || "").toLowerCase();
    const address = String(hotel?.hotelAddress || hotel?.address || "").toLowerCase();
    
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      if (!hotelName.includes(q) && !address.includes(q)) {
        return false;
      }
    }

    if (price < filters.priceMin || price > filters.priceMax) {
      return false;
    }

    if (filters.starRatings && filters.starRatings.length > 0) {
      const roundedStar = Math.floor(fallbackRating);
      if (!filters.starRatings.includes(roundedStar) && !filters.starRatings.includes(Math.round(fallbackRating))) {
        return false;
      }
    }

    if (filters.categories && filters.categories.length > 0) {
      const normCat = normalizePropertyType(category);
      if (!filters.categories.some((c) => c === normCat)) {
        return false;
      }
    }

    if (filters.facilities && filters.facilities.length > 0) {
      const hotelFacs = getHotelMealPlans(hotel).map(normalizeMealPlan);
      const hasFac = filters.facilities.some((f) => hotelFacs.includes(f));
      if (!hasFac) return false;
    }
    
    if (filters.roomTypes && filters.roomTypes.length > 0) {
      const hotelRooms = getHotelRoomCategories(hotel).map(normalizeRoomCategory);
      const hasRoom = filters.roomTypes.some((r) =>
        hotelRooms.some((hr) => hr.includes(r))
      );
      if (!hasRoom) return false;
    }
    
    if (filters.locations && filters.locations.length > 0) {
      const loc = getHotelLocation(hotel);
      if (!filters.locations.includes(loc)) {
        return false;
      }
    }

    return true;
  });
};

export const sortHotels = (hotels, sortOption) => {
  const result = [...hotels];
  if (sortOption === "PRICE_LOW") {
    result.sort((a, b) => getHotelPrice(a) - getHotelPrice(b));
  } else if (sortOption === "PRICE_HIGH") {
    result.sort((a, b) => getHotelPrice(b) - getHotelPrice(a));
  } else if (sortOption === "RATING_HIGH") {
    result.sort((a, b) => (Number(b?.starRating ?? b?.rating) || 0) - (Number(a?.starRating ?? a?.rating) || 0));
  }
  // For RECOMMENDED or DEFAULT, leave as is
  return result;
};
