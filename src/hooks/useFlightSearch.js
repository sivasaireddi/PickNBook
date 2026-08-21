import { useState, useCallback } from "react";
import { validateFlightSearch } from "../utils/flightValidation";

const DEFAULT_ORIGIN = {
  cityName: "Delhi",
  airportCode: "DEL",
  airportName: "Indira Gandhi International Airport",
  airportId: "DEL",
};

const DEFAULT_DESTINATION = {
  cityName: "Mumbai",
  airportCode: "BOM",
  airportName: "Chhatrapati Shivaji Maharaj Airport",
  airportId: "BOM",
};

const DEFAULT_MULTICITY_SEGMENTS = [
  {
    id: 1,
    origin: DEFAULT_ORIGIN,
    from: DEFAULT_ORIGIN,
    destination: DEFAULT_DESTINATION,
    to: DEFAULT_DESTINATION,
    date: new Date(),
    departureDate: new Date(),
  },
  {
    id: 2,
    origin: DEFAULT_DESTINATION,
    from: DEFAULT_DESTINATION,
    destination: {
      cityName: "Bengaluru",
      airportCode: "BLR",
      airportName: "Kempegowda International Airport",
      airportId: "BLR",
    },
    to: {
      cityName: "Bengaluru",
      airportCode: "BLR",
      airportName: "Kempegowda International Airport",
      airportId: "BLR",
    },
    date: new Date(Date.now() + 86400000 * 2),
    departureDate: new Date(Date.now() + 86400000 * 2),
  },
];

export function useFlightSearch() {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [departureDate, setDepartureDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(null);
  const [multiCitySegments, setMultiCitySegments] = useState(DEFAULT_MULTICITY_SEGMENTS);
  const [travellers, setTravellers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [cabinClass, setCabinClass] = useState("Economy");
  const [tripType, setTripTypeState] = useState("oneway");

  const setTripType = useCallback(
    (newType) => {
      setTripTypeState(newType);
      if (newType === "roundtrip" || newType === "roundTrip") {
        if (!returnDate) {
          const nextDay = new Date(departureDate || Date.now());
          nextDay.setDate(nextDay.getDate() + 1);
          setReturnDate(nextDay);
        }
      }
    },
    [departureDate, returnDate]
  );

  const swapAirports = useCallback(() => {
    setOrigin((prevOrigin) => {
      setDestination(prevOrigin);
      return destination;
    });
  }, [destination]);

  const updateTravellers = useCallback((newTravellers) => {
    setTravellers((prev) => ({
      ...prev,
      ...newTravellers,
    }));
  }, []);

  const addMultiCitySegment = useCallback(() => {
    setMultiCitySegments((prev) => {
      if (prev.length >= 6) return prev;
      const lastSeg = prev[prev.length - 1];
      const lastDest = lastSeg?.destination || lastSeg?.to || DEFAULT_DESTINATION;

      const prevDate = new Date(lastSeg?.date || lastSeg?.departureDate || Date.now());
      const nextDate = new Date(prevDate);
      nextDate.setDate(nextDate.getDate() + 2);

      const newId = Date.now() + Math.random();
      const newLeg = {
        id: newId,
        origin: lastDest,
        from: lastDest,
        destination: null,
        to: null,
        date: nextDate,
        departureDate: nextDate,
      };

      return [...prev, newLeg];
    });
  }, []);

  const removeMultiCitySegment = useCallback((index) => {
    setMultiCitySegments((prev) => {
      if (prev.length <= 2) return prev;
      const next = prev.filter((_, i) => i !== index);

      // Re-chain FROM/origin if middle segment was deleted
      for (let i = 1; i < next.length; i++) {
        const prevDest = next[i - 1].destination || next[i - 1].to;
        if (prevDest) {
          next[i] = {
            ...next[i],
            origin: prevDest,
            from: prevDest,
          };
        }
      }

      return next;
    });
  }, []);

  const updateMultiCitySegment = useCallback((index, field, value) => {
    setMultiCitySegments((prev) => {
      const next = [...prev];
      const target = { ...next[index] };

      if (field === "origin" || field === "from") {
        target.origin = value;
        target.from = value;
      } else if (field === "destination" || field === "to") {
        target.destination = value;
        target.to = value;
      } else if (field === "date" || field === "departureDate") {
        target.date = value;
        target.departureDate = value;
      }

      next[index] = target;

      // AUTOMATIC FROM UPDATE: If TO/destination changed, update next leg's FROM/origin
      if ((field === "destination" || field === "to") && index + 1 < next.length) {
        next[index + 1] = {
          ...next[index + 1],
          origin: value,
          from: value,
        };
      }

      // AUTOMATIC DATE RE-CHAINING: Ensure flight[k].date >= flight[k-1].date
      for (let k = 1; k < next.length; k++) {
        const pDate = new Date(next[k - 1].date || next[k - 1].departureDate || Date.now());
        const cDate = new Date(next[k].date || next[k].departureDate || Date.now());
        if (cDate < pDate) {
          const adjDate = new Date(pDate);
          next[k] = {
            ...next[k],
            date: adjDate,
            departureDate: adjDate,
          };
        }
      }

      return next;
    });
  }, []);

  const validate = useCallback(() => {
    return validateFlightSearch({
      origin,
      destination,
      departureDate,
      returnDate,
      tripType,
      travellers,
      multiCitySegments,
    });
  }, [origin, destination, departureDate, returnDate, tripType, travellers, multiCitySegments]);

  return {
    origin,
    setOrigin,
    destination,
    setDestination,
    departureDate,
    setDepartureDate,
    returnDate,
    setReturnDate,
    multiCitySegments,
    setMultiCitySegments,
    addMultiCitySegment,
    removeMultiCitySegment,
    updateMultiCitySegment,
    travellers,
    setTravellers,
    updateTravellers,
    cabinClass,
    setCabinClass,
    tripType,
    setTripType,
    swapAirports,
    validate,
  };
}
