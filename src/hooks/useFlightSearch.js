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
    origin: DEFAULT_ORIGIN,
    destination: DEFAULT_DESTINATION,
    date: new Date(),
  },
  {
    origin: DEFAULT_DESTINATION,
    destination: {
      cityName: "Bengaluru",
      airportCode: "BLR",
      airportName: "Kempegowda International Airport",
      airportId: "BLR",
    },
    date: new Date(Date.now() + 86400000 * 2),
  },
  {
    origin: {
      cityName: "Bengaluru",
      airportCode: "BLR",
      airportName: "Kempegowda International Airport",
      airportId: "BLR",
    },
    destination: {
      cityName: "Chennai",
      airportCode: "MAA",
      airportName: "Chennai International Airport",
      airportId: "MAA",
    },
    date: new Date(Date.now() + 86400000 * 4),
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
      if (prev.length >= 5) return prev;
      const lastSeg = prev[prev.length - 1];
      const nextDate = new Date(lastSeg?.date || Date.now());
      nextDate.setDate(nextDate.getDate() + 2);
      return [
        ...prev,
        {
          origin: lastSeg?.destination || DEFAULT_DESTINATION,
          destination: { cityName: "Chennai", airportCode: "MAA", airportName: "Chennai Airport", airportId: "MAA" },
          date: nextDate,
        },
      ];
    });
  }, []);

  const removeMultiCitySegment = useCallback((index) => {
    setMultiCitySegments((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateMultiCitySegment = useCallback((index, field, value) => {
    setMultiCitySegments((prev) =>
      prev.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg))
    );
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
