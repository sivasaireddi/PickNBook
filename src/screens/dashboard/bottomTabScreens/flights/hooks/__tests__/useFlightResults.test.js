import { normalizeFlight, filterAndSortFlights } from "../useFlightResults";

describe("useFlightResults Selector & Filtering Tests", () => {
  const sampleRawFlights = [
    {
      id: "f1",
      airlineName: "Air India Express",
      airlineCode: "AI",
      flightNumber: "6107",
      displayFare: 1589,
      duration: 135,
      departureTimeIst: "2026-08-03T18:00:00",
      arrivalTimeIst: "2026-08-03T20:15:00",
      stops: 0,
      hasDeal: true,
    },
    {
      id: "f2",
      airlineName: "AkasaAir",
      airlineCode: "AK",
      flightNumber: "1820",
      displayFare: 5038,
      duration: 145,
      departureTimeIst: "2026-08-03T17:30:00",
      arrivalTimeIst: "2026-08-03T19:55:00",
      stops: 0,
      hasDeal: false,
    },
    {
      id: "f3",
      airlineName: "IndiGo",
      airlineCode: "6E",
      flightNumber: "322",
      displayFare: 3200,
      duration: 180,
      departureTimeIst: "2026-08-03T06:00:00",
      arrivalTimeIst: "2026-08-03T09:00:00",
      stops: 1,
      hasDeal: true,
    },
    {
      id: "f4",
      airlineName: "SpiceJet",
      airlineCode: "SG",
      flightNumber: "811",
      displayFare: 2900,
      duration: 110,
      departureTimeIst: "2026-08-03T22:00:00",
      arrivalTimeIst: "2026-08-03T23:50:00",
      stops: 0,
      hasDeal: false,
    },
  ];

  let normalizedList;

  beforeEach(() => {
    const minPrice = 1589;
    normalizedList = sampleRawFlights.map((item, idx) => normalizeFlight(item, idx, minPrice));
  });

  test("1. Normalization maps raw API data model correctly", () => {
    expect(normalizedList).toHaveLength(4);
    expect(normalizedList[0].id).toBe("f1");
    expect(normalizedList[0].price).toBe(1589);
    expect(normalizedList[0].isCheapest).toBe(true);
    expect(normalizedList[1].isCheapest).toBe(false);
    expect(normalizedList[0].departureTime).toBe("18:00");
  });

  test("2. Sort-only cases: Cheapest, Fastest, Earliest, Latest", () => {
    // Sort Cheapest
    const cheapest = filterAndSortFlights(normalizedList, {
      activeSort: "cheapest",
      dealsOnly: false,
      filters: {},
    });
    expect(cheapest.map((f) => f.price)).toEqual([1589, 2900, 3200, 5038]);

    // Sort Fastest
    const fastest = filterAndSortFlights(normalizedList, {
      activeSort: "fastest",
      dealsOnly: false,
      filters: {},
    });
    expect(fastest.map((f) => f.durationMinutes)).toEqual([110, 135, 145, 180]);

    // Sort Earliest
    const earliest = filterAndSortFlights(normalizedList, {
      activeSort: "earliest",
      dealsOnly: false,
      filters: {},
    });
    expect(earliest.map((f) => f.departureTime)).toEqual(["06:00", "17:30", "18:00", "22:00"]);

    // Sort Latest
    const latest = filterAndSortFlights(normalizedList, {
      activeSort: "latest",
      dealsOnly: false,
      filters: {},
    });
    expect(latest.map((f) => f.departureTime)).toEqual(["22:00", "18:00", "17:30", "06:00"]);
  });

  test("3. Filter-only cases: Stops, Airlines, Price Range", () => {
    // Filter by Stops (Non-stop only)
    const nonStops = filterAndSortFlights(normalizedList, {
      activeSort: "cheapest",
      dealsOnly: false,
      filters: { stops: ["nonstop"] },
    });
    expect(nonStops).toHaveLength(3);
    expect(nonStops.every((f) => f.stops === 0)).toBe(true);

    // Filter by Airline (AI only)
    const airIndiaOnly = filterAndSortFlights(normalizedList, {
      activeSort: "cheapest",
      dealsOnly: false,
      filters: { airlines: ["AI"] },
    });
    expect(airIndiaOnly).toHaveLength(1);
    expect(airIndiaOnly[0].airlineCode).toBe("AI");

    // Filter by Price Range (<= 3000)
    const budgetFlights = filterAndSortFlights(normalizedList, {
      activeSort: "cheapest",
      dealsOnly: false,
      filters: { priceRange: [0, 3000] },
    });
    expect(budgetFlights.map((f) => f.price)).toEqual([1589, 2900]);
  });

  test("4. Combined case: Non-stop + Cheapest + With deals", () => {
    const combined = filterAndSortFlights(normalizedList, {
      activeSort: "cheapest",
      dealsOnly: true,
      filters: { stops: ["nonstop"] },
    });
    expect(combined).toHaveLength(1);
    expect(combined[0].id).toBe("f1");
    expect(combined[0].hasDeal).toBe(true);
    expect(combined[0].stops).toBe(0);
  });

  test("5. Empty result case when no flights match strict filters", () => {
    const emptyResult = filterAndSortFlights(normalizedList, {
      activeSort: "cheapest",
      dealsOnly: true,
      filters: { stops: ["1stop"], airlines: ["AK"] }, // AkasaAir has 0 stops, not 1stop
    });
    expect(emptyResult).toEqual([]);
  });
});
