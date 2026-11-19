const digits = (value) => String(value || "").replace(/\D/g, "");

const isoDate = (value) => {
  const raw = String(value || "").trim();
  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : raw.slice(0, 10);
};

const withWayType = (item, wayType) => item ? { ...item, Code: item.Code || "", WayType: item.WayType || wayType } : null;

export function flightPaymentAttemptFingerprint(flowState) {
  const seats = Array.isArray(flowState?.selectedSeatLabels) ? flowState.selectedSeatLabels.join(",") : "";
  const ssr = flowState?.ssrDetails || {};
  const attemptDetails = JSON.stringify({
    passengers: (flowState?.passengers || []).map((p) => [p.title, p.firstName, p.lastName, p.passengerType, p.dob, p.gender]),
    contact: [flowState?.contact?.email, digits(flowState?.contact?.mobile)],
    ssr: [ssr.baggage?.Code, ssr.meal?.Code, ssr.outboundBaggage?.Code, ssr.returnBaggage?.Code, ssr.outboundMeal?.Code, ssr.returnMeal?.Code],
  });
  let hash = 2166136261;
  for (let index = 0; index < attemptDetails.length; index += 1) {
    hash ^= attemptDetails.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return [
    flowState?.traceId || flowState?.flight?.traceId,
    flowState?.resultIndex || flowState?.flight?.resultIndex,
    Number(flowState?.fareSummary?.totalFare || flowState?.payableAmount || 0).toFixed(2),
    seats,
    flowState?.passengers?.length || 0,
    (hash >>> 0).toString(36),
  ].join("|");
}

export function createFlightIdempotencyKey() {
  return `flt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`.slice(0, 45);
}

export function buildFlightPaymentRequest(flowState, idempotencyKey) {
  const passengers = Array.isArray(flowState?.passengers) ? flowState.passengers : [];
  const contact = flowState?.contact || {};
  const phone = digits(contact.mobile || passengers[0]?.mobile).slice(-15);
  const email = String(contact.email || passengers[0]?.email || "").trim();
  const traceId = String(flowState?.traceId || flowState?.flight?.traceId || "").trim();
  const resultIndex = String(flowState?.resultIndex || flowState?.flight?.resultIndex || "").trim();
  const fare = flowState?.fareSummary || {};
  const ssr = flowState?.ssrDetails || {};

  if (!traceId || !resultIndex) throw new Error("Flight session identifiers are missing.");
  if (!passengers.length) throw new Error("Traveler details are missing.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 10) throw new Error("Valid contact details are required.");

  const apiPassengers = passengers.map((passenger, index) => {
    const seats = [];
    Object.keys(flowState?.legSeatObjectsMap || {}).sort().forEach((legKey) => {
      const selected = flowState.legSeatObjectsMap?.[legKey]?.[index];
      if (selected?.rawSeat) seats.push({ ...selected.rawSeat, Code: selected.rawSeat.Code || selected.rawSeat.SeatNo || selected.label });
    });
    const baggage = index === 0 ? [withWayType(ssr.outboundBaggage || ssr.baggage, 1), withWayType(ssr.returnBaggage, 2)].filter(Boolean) : [];
    const meals = index === 0 ? [withWayType(ssr.outboundMeal || ssr.meal, 1), withWayType(ssr.returnMeal, 2)].filter(Boolean) : [];
    return {
      Title: String(passenger.title || "Mr"),
      FirstName: String(passenger.firstName || "").trim(),
      LastName: String(passenger.lastName || "").trim(),
      PaxType: passenger.passengerType === "Child" ? 2 : passenger.passengerType === "Infant" ? 3 : 1,
      DateOfBirth: isoDate(passenger.dob),
      Gender: String(passenger.gender === "Female" || passenger.gender === 2 || passenger.gender === "2" ? "2" : "1"),
      AddressLine1: String(passenger.addressLine1 || passenger.address || "Address").trim(),
      City: String(passenger.city || flowState?.searchContext?.fromCity || "Delhi").trim(),
      CountryCode: "IN",
      CountryName: "India",
      ContactNo: phone,
      Email: email,
      IsLeadPax: index === 0,
      Seat: seats,
      MealDynamic: meals,
      Baggage: baggage,
    };
  });

  const totalSeatCharges = Number(fare.seatSurcharge || 0);
  const totalSsr = Number(fare.ssrSurcharge || 0);
  const mealCharges = apiPassengers.reduce((sum, p) => sum + p.MealDynamic.reduce((s, x) => s + Number(x.Price || 0), 0), 0);
  const baggageCharges = Math.max(0, totalSsr - mealCharges);
  const payload = {
    TraceId: traceId,
    ResultIndex: resultIndex,
    SrdvType: String(flowState?.srdvType || flowState?.flight?.srdvType || "MixAPI"),
    SrdvIndex: String(flowState?.srdvIndex || flowState?.flight?.srdvIndex || "1"),
    JourneyType: String(flowState?.journeyType || flowState?.searchContext?.journeyType || 1),
    Fare: {
      BaseFare: Number(fare.baseFare || 0),
      Tax: Number(fare.tax || 0),
      OfferedFare: Number(fare.baseFare || 0) + Number(fare.tax || 0),
      TotalSeatCharges: totalSeatCharges,
      TotalMealCharges: mealCharges,
      TotalBaggageCharges: baggageCharges,
    },
    Passengers: apiPassengers,
  };
  const lead = passengers[0] || {};
  return {
    idempotencyKey,
    orderAmount: Number(fare.totalFare || flowState?.payableAmount || 0),
    customerName: [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim(),
    customerEmail: email,
    customerPhone: phone,
    paymentMethod: "Cashfree",
    bookingPayloadJson: JSON.stringify(payload),
    apiPassengers,
  };
}
