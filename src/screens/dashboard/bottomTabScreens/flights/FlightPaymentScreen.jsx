import React, { useState, useCallback, useEffect } from "react";
import {
  Alert,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { clearFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { getFlightFareQuote } from "./services/flightBookingService";
import { calculateFareBreakdown } from "./services/flightCouponService";
import { createCashfreeOrder, validateFlightCoupon, getFlightCoupons } from "../../../../services/cashfreeService";

import { formatCurrency } from "./utils/flightUtils";

export function formatINR(value) {
  const num = Number(value || 0);
  if (isNaN(num)) return "₹ 0.00";
  return `₹ ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDiscount(value) {
  const num = Number(value || 0);
  if (isNaN(num)) return "-₹ 0.00";
  return `-₹ ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const PRIMARY_RED = "#E53935";
const BACKGROUND = "#F8F9FB";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function FlightPaymentScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const flowState = route?.params || {};

  React.useEffect(() => {
    console.log("================================================================================");
    console.log("✈️ [FLIGHT_BOOKING_STARTED] Starting flight booking review without payment gateway");
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🆔 Trace ID: ${flowState.traceId || flowState.flight?.traceId || "N/A"}`);
    console.log(`🏷️ Result Index: ${flowState.resultIndex || flowState.flight?.resultIndex || "N/A"}`);
    console.log(`⚡ Carrier Type: ${flowState.isLCC ? "LCC (Low-Cost Carrier)" : "GDS (Full Service Carrier)"}`);
    console.log(`💵 Total Payable: ₹${flowState.payableAmount || flowState.fareSummary?.totalFare || 0}`);
    console.log("================================================================================");
  }, []);

  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  // State Management
  // appliedCoupon: { code, discountAmount, type, maxDiscountCap } | null
  const [appliedCoupon, setAppliedCoupon] = useState(
    flowState.appliedCouponObj || (flowState.appliedCoupon ? { code: flowState.appliedCoupon, discountAmount: Number(flowState.fareSummary?.discount || 500) } : null)
  );
  const [couponInputValue, setCouponInputValue] = useState(flowState.couponCode || "");
  const [couponError, setCouponError] = useState(null);

  // Available offers: first try what came with FareQuote, then fetch from server
  const initialOffers =
    (Array.isArray(flowState.fareQuote?.PickNBookAvailableOffers) && flowState.fareQuote.PickNBookAvailableOffers.length > 0
      ? flowState.fareQuote.PickNBookAvailableOffers
      : null) ||
    (Array.isArray(flowState.fareQuote?.Results?.PickNBookAvailableOffers) && flowState.fareQuote.Results.PickNBookAvailableOffers.length > 0
      ? flowState.fareQuote.Results.PickNBookAvailableOffers
      : null) ||
    [];

  const [availableOffers, setAvailableOffers] = useState(initialOffers);

  // Fetch server coupons if no local offers available
  useEffect(() => {
    if (initialOffers.length === 0) {
      getFlightCoupons()
        .then((coupons) => {
          if (Array.isArray(coupons) && coupons.length > 0) {
            setAvailableOffers(coupons);
          }
        })
        .catch(() => {});
    }
  }, []);

  const traceId = flowState.traceId || flowState.flight?.traceId;
  const resultIndex = flowState.resultIndex || flowState.flight?.resultIndex;
  const srdvType = flowState.srdvType || flowState.fareQuote?.SrdvType || flowState.flight?.srdvType || "MixAPI";
  const srdvIndex = flowState.srdvIndex || flowState.fareQuote?.SrdvIndex || flowState.flight?.srdvIndex || "2";
  const isLCC = flowState.isLCC ?? flowState.fareQuote?.IsLCC ?? flowState.flight?.isLCC ?? true;

  const baseFare = Number(flowState.fareSummary?.baseFare || flowState.flight?.selectedTravelClassPriceInr || 0);
  const taxes = Number(flowState.fareSummary?.tax || 0);
  const seatSurcharge = Number(flowState.fareSummary?.seatSurcharge || 0);
  const ssrSurcharge = Number(flowState.fareSummary?.ssrSurcharge || 0);
  const convenienceFee = Number(
    flowState.fareQuote?.Fare?.TransactionFee ||
    flowState.fareQuote?.Fare?.OtherCharges ||
    flowState.fareSummary?.convenienceFee ||
    0
  );

  const originCode = String(flowState.flight?.fromCityCode || flowState.flight?.fromCity || flowState.searchContext?.from || "DEL").toUpperCase();
  const destinationCode = String(flowState.flight?.toCityCode || flowState.flight?.toCity || flowState.searchContext?.to || "BOM").toUpperCase();

  const journeyTypeNum = Number(flowState.journeyType || flowState.searchContext?.journeyType || 1);
  const isRoundTripFallback = Boolean(flowState.isRoundTrip || journeyTypeNum === 2);

  const multiCityFlightsList = flowState.isMultiCity
    ? (Array.isArray(flowState.multiCityFlights) && flowState.multiCityFlights.length > 0
      ? flowState.multiCityFlights
      : (Array.isArray(flowState.searchContext?.multiCitySegments) && flowState.searchContext.multiCitySegments.length > 0
        ? flowState.searchContext.multiCitySegments
        : []))
    : isRoundTripFallback
      ? [
        { fromCity: originCode, toCity: destinationCode },
        { fromCity: destinationCode, toCity: originCode }
      ]
      : [{ fromCity: originCode, toCity: destinationCode }];

  const legCount = flowState.legCount || multiCityFlightsList.length || 1;

  const displayBaseFare = Number(
    flowState.fareQuote?.Results?.DisplayBaseFare ??
    flowState.fareQuote?.DisplayBaseFare ??
    flowState.fareQuote?.Fare?.BaseFare ??
    flowState.fareSummary?.baseFare ??
    flowState.flight?.selectedTravelClassPriceInr ??
    baseFare ??
    0
  );

  const displayTax = Number(
    flowState.fareQuote?.Results?.DisplayTax ??
    flowState.fareQuote?.DisplayTax ??
    flowState.fareQuote?.Fare?.Tax ??
    flowState.fareSummary?.tax ??
    taxes ??
    0
  );

  // Reactive fare calculation using pure function:
  const fareBreakdown = calculateFareBreakdown({
    baseFare: displayBaseFare,
    taxes: displayTax,
    seatSurcharge,
    ssrSurcharge,
    convenienceFee,
    appliedCoupon,
  });

  const totalFare = fareBreakdown.grandTotal;
  const appliedDiscountAmount = fareBreakdown.discountAmount;

  // --------------------------------------------------------------------------------
  // FARE DETAILS SPECIFICATION MAPPINGS
  // --------------------------------------------------------------------------------
  const isRefundable = Boolean(
    flowState.fareQuote?.Results?.IsRefundable ??
    flowState.fareQuote?.IsRefundable ??
    flowState.fareQuote?.Fare?.IsRefundable ??
    flowState.flight?.isRefundable ??
    flowState.flight?.IsRefundable ??
    false
  );
  const fareTypeLabel = isRefundable ? "Refundable" : "Non-Refundable";

  const convenienceFeeValue = Number(convenienceFee ?? 0);
  const tripSecureSelected = Boolean(flowState.tripSecureSelected || flowState.isTripSecure);
  const tripSecureFeeValue = Number(flowState.tripSecureFee || flowState.fareSummary?.tripSecureFee || 0);
  const totalDiscountValue = Number(appliedDiscountAmount || flowState.fareSummary?.discount || 0);
  const finalPayable = totalFare;

  React.useEffect(() => {
    console.log("==================================================");
    console.log("[FARE_DETAILS_MAPPING]");
    console.log(`Fare Type: ${fareTypeLabel}`);
    console.log(`Display Base Fare: ${displayBaseFare}`);
    console.log(`Display Tax: ${displayTax}`);
    console.log(`Convenience Fee: ${convenienceFeeValue}`);
    console.log(`Trip Secure Selected: ${tripSecureSelected}`);
    console.log(`Trip Secure Fee: ${tripSecureFeeValue}`);
    console.log(`Total Discount: ${totalDiscountValue}`);
    console.log(`Final Payable: ${finalPayable}`);
    console.log("==================================================");
  }, [fareTypeLabel, displayBaseFare, displayTax, convenienceFeeValue, tripSecureSelected, tripSecureFeeValue, totalDiscountValue, finalPayable]);

  // 5. Remove Coupon functionality
  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponInputValue("");
    setCouponError(null);
    Alert.alert("Coupon Removed", "Promo code removed. Fare breakdown reset to original amount.");
  }, []);

  // 3. Coupon Validation — calls new server-side POST /api/Coupons/validate
  const handleApplyCoupon = async (codeToApply) => {
    const targetCode = String(codeToApply || couponInputValue || "").trim().toUpperCase();
    if (!targetCode) {
      setCouponError("Please enter a valid coupon code.");
      return;
    }

    setCouponError(null);
    setCouponLoading(true);

    try {
      console.log(`[FlightPaymentScreen] Validating coupon '${targetCode}' via POST /api/Coupons/validate...`);

      // Call server-side validation endpoint per spec
      const cartTotal = displayBaseFare + displayTax + seatSurcharge + ssrSurcharge;
      const result = await validateFlightCoupon({
        serviceType: "flight",
        couponCode: targetCode,
        totalAmount: cartTotal,
      });

      if (!result.isValid) {
        const errMsg = result.message || `Coupon '${targetCode}' is invalid or does not meet minimum requirements.`;
        setCouponError(errMsg);
        Alert.alert("Coupon Not Applied", errMsg);
        return;
      }

      const nextCouponObj = {
        code: targetCode,
        discountAmount: result.discountAmount,
        type: "flat",
        maxDiscountCap: null,
        title: targetCode,
      };

      setAppliedCoupon(nextCouponObj);
      setCouponInputValue(targetCode);
      setCouponError(null);

      Alert.alert(
        "Coupon Applied! 🎉",
        `'${targetCode}' applied! You save ₹${result.discountAmount.toLocaleString("en-IN")}.`
      );
    } catch (err) {
      console.error("[FlightPaymentScreen] Apply coupon error:", err?.message);
      const msg = err?.message || "Failed to validate coupon. Please try again.";
      setCouponError(msg);
      Alert.alert("Invalid Coupon", msg);
    } finally {
      setCouponLoading(false);
    }
  };

  // ─── Build the bookingPayloadJson that goes into create-order ───────────────
  const buildBookingPayloadJson = (apiPassengers) => {
    // Gather totals from the confirmed fare breakdown
    const totalSeatCharges = apiPassengers.reduce((sum, p) =>
      sum + (p.Seat || []).reduce((s, seat) => s + Number(seat.Amount || seat.Price || 0), 0), 0);
    const totalMealCharges = apiPassengers.reduce((sum, p) =>
      sum + (p.MealDynamic || []).reduce((s, m) => s + Number(m.Price || 0), 0), 0);
    const totalBaggageCharges = apiPassengers.reduce((sum, p) =>
      sum + (p.Baggage || []).reduce((s, b) => s + Number(b.Price || 0), 0), 0);

    // Pull segment info from flow state
    const firstFlight = multiCityFlightsList[0] || {};
    const segments = multiCityFlightsList.map((leg, i) => ({
      AirlineCode: leg.airlineCode || flowState.flight?.airlineCode || "",
      Airline: {
        AirlineCode: leg.airlineCode || flowState.flight?.airlineCode || "",
        AirlineName: leg.airlineName || leg.airline || flowState.flight?.airlineName || "",
      },
      FlightNumber: leg.flightNumber || leg.flightNo || flowState.flight?.flightNumber || "",
      Origin: {
        AirportCode: String(leg.fromCity || leg.from || "").substring(0, 3).toUpperCase(),
        CityCode: String(leg.fromCity || leg.from || "").substring(0, 3).toUpperCase(),
      },
      Destination: {
        AirportCode: String(leg.toCity || leg.to || "").substring(0, 3).toUpperCase(),
        CityCode: String(leg.toCity || leg.to || "").substring(0, 3).toUpperCase(),
      },
      DepartureTime: leg.departureTime || leg.depTime || "",
      ArrivalTime: leg.arrivalTime || leg.arrTime || "",
    }));

    const payload = {
      TraceId: traceId,
      ResultIndex: resultIndex,
      SrdvType: srdvType,
      SrdvIndex: srdvIndex,
      Module: "b2c",
      JourneyType: flowState.isMultiCity ? 3 : isRoundTripFallback ? 2 : 1,
      IsLCC: isLCC,
      CouponCode: appliedCoupon?.code || "",
      Fare: {
        Currency: "INR",
        BaseFare: displayBaseFare,
        Tax: displayTax,
        OfferedFare: displayBaseFare + displayTax,
        PublishedFare: displayBaseFare + displayTax,
        TotalSeatCharges: totalSeatCharges,
        TotalMealCharges: totalMealCharges,
        TotalBaggageCharges: totalBaggageCharges,
        TotalSpecialServiceCharges: 0,
      },
      Segments: segments,
      Passengers: apiPassengers,
    };

    return JSON.stringify(payload);
  };

  const handleConfirmBooking = async () => {
    if (!traceId || !resultIndex) {
      Alert.alert("Session Error", "Session parameters missing. Please re-select your flight.");
      return;
    }

    const contactMobile = flowState.contact?.mobile || flowState.passengers?.[0]?.mobile;
    if (!contactMobile || contactMobile.trim() === "") {
      Alert.alert("Missing Information", "Please provide a valid mobile number before proceeding.");
      return;
    }

    const mapPassengersForApi = (pList, seatLabels) => {
      let supplierFareObj = flowState.fareQuote?.Fare || (flowState.fareQuote?.Results && !Array.isArray(flowState.fareQuote.Results) ? flowState.fareQuote.Results.Fare : null);

      if (!supplierFareObj && Array.isArray(flowState.fareQuote?.Results)) {
        const fares = flowState.fareQuote.Results.map(r => r.Fare).filter(Boolean);
        if (fares.length > 0) {
          supplierFareObj = fares.reduce((acc, curr) => ({
            BaseFare: (acc.BaseFare || 0) + (curr.BaseFare || 0),
            Tax: (acc.Tax || 0) + (curr.Tax || 0),
            YQTax: (acc.YQTax || 0) + (curr.YQTax || 0),
            OtherCharges: (acc.OtherCharges || 0) + (curr.OtherCharges || 0),
            AdditionalTxnFeeOfrd: (acc.AdditionalTxnFeeOfrd || 0) + (curr.AdditionalTxnFeeOfrd || 0),
            AdditionalTxnFeePub: (acc.AdditionalTxnFeePub || 0) + (curr.AdditionalTxnFeePub || 0),
            Discount: (acc.Discount || 0) + (curr.Discount || 0),
            PublishedFare: (acc.PublishedFare || 0) + (curr.PublishedFare || 0),
            OfferedFare: (acc.OfferedFare || 0) + (curr.OfferedFare || 0),
            TransactionFee: curr.TransactionFee || acc.TransactionFee || "0",
            AirTransFee: curr.AirTransFee || acc.AirTransFee || "0",
          }), {});
        }
      }

      supplierFareObj = supplierFareObj || flowState.flight?.Fare || flowState.flight?.fareData?.Fare || {};

      const paxCount = Math.max(1, (Array.isArray(pList) ? pList.length : 1));

      const baseFareValue = Number(supplierFareObj.BaseFare || flowState.flight?.baseFare || Math.round(totalFare / paxCount));
      const taxValue = Number(supplierFareObj.Tax || flowState.flight?.tax || 0);
      const yqTaxValue = Number(supplierFareObj.YQTax || 0);
      const baseOtherCharges = Number(supplierFareObj.OtherCharges || 0);
      const baseTxnFeeValueStr = String(supplierFareObj.TransactionFee || "0");
      const addTxnFeeOfrd = Number(supplierFareObj.AdditionalTxnFeeOfrd || 0);
      const addTxnFeePub = Number(supplierFareObj.AdditionalTxnFeePub || 0);
      const airTransFeeStr = String(supplierFareObj.AirTransFee || "0");
      const discountValue = Number(supplierFareObj.Discount || 0);
      const basePublishedFare = Number(supplierFareObj.PublishedFare || supplierFareObj.OfferedFare || baseFareValue + taxValue);
      const baseOfferedFare = Number(supplierFareObj.OfferedFare || basePublishedFare);

      return (Array.isArray(pList) ? pList : []).map((p, idx) => {
        const seat = seatLabels?.[idx] || "";
        const rawDob = p.dob || "";
        let cleanDob = rawDob;
        const match = String(rawDob).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
          cleanDob = `${match[3]}-${match[2]}-${match[1]}`;
        }
        const rawNat = String(p.nationality || "IN");
        const nationalityCode = rawNat.toLowerCase().includes("india") ? "IN" : rawNat.slice(0, 2).toUpperCase();

        const selectedSeatObj = flowState.selectedSeats?.[idx];
        const rawSeatObj = selectedSeatObj?.rawSeat || (selectedSeatObj?.rawCode ? { Code: selectedSeatObj.rawCode, SeatNo: selectedSeatObj.seatNumber } : null);

        // Seat Processing per Leg
        const seatObjectsForPassenger = [];
        const seatNoList = [];

        for (let i = 0; i < legCount; i++) {
          const legSeatObjList = flowState.legSeatObjectsMap?.[i];

          if (legSeatObjList && legSeatObjList[idx] && legSeatObjList[idx].label) {
            const seatObj = legSeatObjList[idx];
            if (seatObj.rawSeat) {
              const legFlight = multiCityFlightsList[i] || {};
              const fNum = legFlight.flightNumber || legFlight.flightNo || flowState.flight?.flightNumber || "";
              const fOrg = String(legFlight.fromCity || legFlight.origin?.airportCode || legFlight.origin || legFlight.from || "").substring(0, 3).toUpperCase();
              const fDest = String(legFlight.toCity || legFlight.destination?.airportCode || legFlight.destination || legFlight.to || "").substring(0, 3).toUpperCase();

              seatObjectsForPassenger.push({
                ...seatObj.rawSeat,
                FlightNumber: seatObj.rawSeat.FlightNumber || fNum,
                Origin: seatObj.rawSeat.Origin || fOrg,
                Destination: seatObj.rawSeat.Destination || fDest
              });
            } else if (seatObj.label) {
              seatNoList.push(seatObj.label);
            }
          }
        }

        // Fallback if legacy state is used
        if (seatObjectsForPassenger.length === 0 && rawSeatObj) {
          const firstLeg = multiCityFlightsList[0] || {};
          const fNum = firstLeg.flightNumber || firstLeg.flightNo || flowState.flight?.flightNumber || "";
          const fOrg = String(firstLeg.fromCity || firstLeg.origin?.airportCode || firstLeg.origin || firstLeg.from || "").substring(0, 3).toUpperCase();
          const fDest = String(firstLeg.toCity || firstLeg.destination?.airportCode || firstLeg.destination || firstLeg.to || "").substring(0, 3).toUpperCase();

          seatObjectsForPassenger.push({
            ...rawSeatObj,
            FlightNumber: rawSeatObj.FlightNumber || fNum,
            Origin: rawSeatObj.Origin || fOrg,
            Destination: rawSeatObj.Destination || fDest
          });
        }
        if (seatNoList.length === 0) {
          if (rawSeatObj?.Code) seatNoList.push(rawSeatObj.Code);
          else if (seat) seatNoList.push(seat);
        }

        const resolveSsrWayType = (ssrItem, fallbackWayType) => {
          if (!ssrItem) return null;

          const outCode = String(flowState.flight?.airlineCode || flowState.outboundFlight?.airlineCode || "").trim().toUpperCase();
          const outNum = String(flowState.flight?.flightNumber || flowState.outboundFlight?.flightNumber || "").trim().toUpperCase();

          const retCode = String(flowState.returnFlight?.airlineCode || "").trim().toUpperCase();
          const retNum = String(flowState.returnFlight?.flightNumber || "").trim().toUpperCase();

          const itemAirline = String(ssrItem.AirlineCode || "").trim().toUpperCase();
          const itemFlight = String(ssrItem.FlightNumber || "").trim().toUpperCase();

          let resolvedWayType = fallbackWayType;

          // If it perfectly matches the return flight, it is definitely WayType 2
          if (retCode && retNum && itemAirline === retCode && itemFlight === retNum) {
            resolvedWayType = 2;
          }
          // If it perfectly matches the outbound flight, it is definitely WayType 1
          else if (outCode && outNum && itemAirline === outCode && itemFlight === outNum) {
            resolvedWayType = 1;
          }

          return {
            ...ssrItem,
            Code: ssrItem.Code || "",
            WayType: resolvedWayType
          };
        };

        const outBag = resolveSsrWayType(flowState.ssrDetails?.outboundBaggage || flowState.ssrDetails?.baggage, 1);
        const retBag = resolveSsrWayType(flowState.ssrDetails?.returnBaggage, 2);
        const outMeal = resolveSsrWayType(flowState.ssrDetails?.outboundMeal || flowState.ssrDetails?.meal, 1);
        const retMeal = resolveSsrWayType(flowState.ssrDetails?.returnMeal, 2);

        const paxBagTotal = idx === 0 ? (Number(outBag?.Price || 0) + Number(retBag?.Price || 0)) : 0;
        const paxMealTotal = idx === 0 ? (Number(outMeal?.Price || 0) + Number(retMeal?.Price || 0)) : 0;
        const paxSeatTotal = seatObjectsForPassenger.reduce((sum, seat) => sum + Number(seat.Amount || seat.Price || 0), 0);
        const paxSsrTotal = paxBagTotal + paxMealTotal + paxSeatTotal;

        const paxPublishedFare = basePublishedFare;
        const paxOfferedFare = baseOfferedFare;
        const paxOtherCharges = baseOtherCharges;

        return {
          Title: String(p.title || "Mr"),
          FirstName: String(p.firstName || `Passenger${idx + 1}`),
          LastName: String(p.lastName || `Passenger${idx + 1}`),
          MiddleName: "",
          PaxType: p.passengerType === "Child" ? 2 : p.passengerType === "Infant" ? 3 : 1,
          DateOfBirth: cleanDob ? `${cleanDob}T00:00:00` : "",
          Gender: String(p.gender === "Female" || p.gender === 2 || p.gender === "2" ? "2" : "1"),
          PassportNo: p.passportNo ? String(p.passportNo).trim() : "",
          PassportExpiry: p.passportExpiry && p.passportNo ? `${p.passportExpiry}T00:00:00` : "",
          PassportIssueDate: p.passportIssueDate ? `${p.passportIssueDate}T00:00:00` : "",
          PassportIssueCountryCode: (p.passportIssueCountryCode || p.nationality || p.passportIssueCountry || "IN").slice(0, 2).toUpperCase(),
          DocumentType: "",
          DocumentId: "",
          Nationality: nationalityCode,
          AddressLine1: String(p.addressLine1 || p.address || p.city || "Street Address").trim() || "Street Address",
          AddressLine2: String(p.addressLine2 || "").trim(),
          City: String(p.city || "").trim(),
          CountryCode: "IN",
          CountryName: "India",
          CellCountryCode: "+91",
          ContactNo: String(flowState.contact?.mobile || p.mobile || "").trim(),
          Email: String(flowState.contact?.email || p.email || "").trim(),
          IsLeadPax: idx === 0,
          GSTCompanyAddress: "",
          GSTCompanyContactNumber: "",
          GSTCompanyName: "",
          GSTNumber: "",
          GSTCompanyEmail: "",
          Fare: {
            Currency: "INR",
            BaseFare: baseFareValue,
            Tax: taxValue,
            YQTax: yqTaxValue,
            AdditionalTxnFeeOfrd: addTxnFeeOfrd,
            AdditionalTxnFeePub: addTxnFeePub,
            AirTransFee: airTransFeeStr,
            TransactionFee: baseTxnFeeValueStr,
            OtherCharges: paxOtherCharges,
            Discount: discountValue,
            PublishedFare: paxPublishedFare,
            OfferedFare: paxOfferedFare,
          },
          Baggage: idx === 0 ? [outBag, retBag].filter(Boolean) : [],
          MealDynamic: idx === 0 ? [
            outMeal ? { ...outMeal } : null,
            retMeal ? { ...retMeal } : null
          ].filter(Boolean) : [],
          Seat: seatObjectsForPassenger.map(seat => ({
            ...seat,
            Code: seat.Code
          })),
        };
      });
    };

    const apiPassengers = mapPassengersForApi(flowState.passengers, flowState.selectedSeatLabels);

    console.log("================================================================================");
    console.log("💳 [CASHFREE_FLOW] Building Cashfree order for flight booking");
    console.log(`💰 Final Payable Amount: ₹${totalFare}`);
    console.log(`🏷️ Applied Coupon: ${appliedCoupon?.code || "None"}`);
    console.log(`⚡ Carrier: ${isLCC ? "LCC" : "GDS"} | TraceId: ${traceId}`);
    console.log("================================================================================");

    setLoading(true);

    try {
      // Step 1: Build the full booking payload JSON (stringified) as per spec
      const bookingPayloadJson = buildBookingPayloadJson(apiPassengers);

      // Step 2: Resolve customer info
      const leadPax = flowState.passengers?.[0] || {};
      const customerName = `${leadPax.firstName || ""} ${leadPax.lastName || ""}`.trim() || "Passenger";
      const customerEmail = flowState.contact?.email || leadPax.email || "";
      const customerPhone = String(flowState.contact?.mobile || leadPax.mobile || "").replace(/[^0-9]/g, "").slice(-10);

      // Extract stored customerId (from auth profile if available)
      const customerId = String(
        flowState.customerId ||
        flowState.userId ||
        flowState.contact?.userId ||
        leadPax.id ||
        Date.now()
      );

      // Step 3: POST /api/cashfree/create-order
      console.log("[CASHFREE] POSTing to /api/cashfree/create-order...");
      const orderRes = await createCashfreeOrder({
        orderAmount: totalFare,
        orderCurrency: "INR",
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        bookingType: "Flight",
        couponCode: appliedCoupon?.code || null,
        promotionId: null,
        useWallet: false,
        bookingPayloadJson,
      });

      console.log("[CASHFREE] Order created successfully:", orderRes.cashfreeOrderId);
      console.log("[CASHFREE] Order status:", orderRes.orderStatus);
      console.log("[CASHFREE] Session ID present:", Boolean(orderRes.paymentSessionId));

      if (!orderRes.cashfreeOrderId || !orderRes.paymentSessionId) {
        throw new Error("Invalid order response from server. Missing orderId or sessionId.");
      }

      // Step 4: Launch Cashfree SDK
      // The SDK is launched via the native module. If payment is fully wallet-paid,
      // skip SDK and navigate directly to processing screen.
      if (orderRes.isWalletFullyPaid) {
        console.log("[CASHFREE] Wallet fully covers amount. Skipping SDK.");
        await clearFlightBookingFlowState();
        navigation.navigate("FlightPaymentProcessingScreen", {
          ...flowState,
          cashfreeOrderId: orderRes.cashfreeOrderId,
          paymentSessionId: orderRes.paymentSessionId,
          totalFare,
          appliedCoupon,
          apiPassengers,
        });
        return;
      }

      // Try to launch Cashfree SDK (react-native-cashfree-pg-sdk or flutter)
      // The SDK calls are wrapped in a try-catch — if the package is not yet
      // installed, we still navigate to the processing screen so polling works.
      try {
        const { CFPaymentGatewayService, CFSession, CFEnvironment } =
          require("react-native-cashfree-pg-sdk");

        // Register SDK callbacks
        CFPaymentGatewayService.setCallback({
          onVerify: (orderId) => {
            console.log("[CASHFREE] SDK onVerify callback triggered for order:", orderId);
          },
          onError: (err, orderId) => {
            console.error("[CASHFREE] SDK onError callback triggered:", err, orderId);
          }
        });

        const session = new CFSession(
          orderRes.paymentSessionId,
          orderRes.cashfreeOrderId,
          CFEnvironment.PRODUCTION
        );

        console.log("[CASHFREE] Launching native payment SDK...");
        await CFPaymentGatewayService.doPayment(session);
        console.log("[CASHFREE] SDK doPayment returned. Navigating to processing screen.");
      } catch (sdkErr) {
        // SDK not installed yet or user closed sheet — still navigate to verify
        console.warn("[CASHFREE] SDK launch warning (may not be installed yet):", sdkErr?.message);
      }

      // Step 5: Navigate to polling/processing screen regardless
      await clearFlightBookingFlowState();
      navigation.navigate("FlightPaymentProcessingScreen", {
        ...flowState,
        cashfreeOrderId: orderRes.cashfreeOrderId,
        paymentSessionId: orderRes.paymentSessionId,
        totalFare,
        appliedCoupon,
        apiPassengers,
      });

    } catch (err) {
      console.error("[CASHFREE] Order creation / SDK launch failed:", err?.message);
      Alert.alert(
        "Payment Failed",
        err?.message || "Unable to initiate payment. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Flight Review & Confirmation</Text>
          <Text style={styles.headerSubtitle}>Step 4 of 4 • Final summary & confirmation</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, width >= 768 && styles.containerWide]}>

          {/* Flight Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="airplane" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Itinerary Summary</Text>
            </View>
            <View style={styles.flightSummaryRow}>
              <View>
                <Text style={styles.airlineName}>{flowState.flight?.airline || "Airline"}</Text>
                <Text style={styles.flightNum}>{flowState.flight?.flightNumber || ""}</Text>
              </View>
              <View style={styles.routeCol}>
                <Text style={styles.routeText}>
                  {flowState.flight?.fromCity || "Origin"} → {flowState.flight?.toCity || "Destination"}
                </Text>
                <Text style={styles.routeSubText}>
                  {flowState.searchContext?.date || ""} • {flowState.selectedTravelClass || "Economy"}
                </Text>
              </View>
            </View>
          </View>

          {/* Passenger Names & Seats Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Travelers & Seats</Text>
            </View>
            {(flowState.passengers || []).map((passenger, idx) => {
              const seatFromLabels = flowState.selectedSeatLabels?.[idx];
              const seatFromObj = flowState.selectedSeats?.[idx]?.label;
              const seatFromPax = passenger.seatNumber || passenger.seat;
              const fallbackRawSeat = seatFromLabels || seatFromObj || seatFromPax;

              const isLegacySeat = Boolean(fallbackRawSeat) &&
                String(fallbackRawSeat).toLowerCase() !== "auto assigned" &&
                String(fallbackRawSeat).toLowerCase() !== "auto-assigned" &&
                !String(fallbackRawSeat).toLowerCase().includes("none");

              return (
                <View key={idx} style={styles.passengerRow}>
                  <Text style={styles.passengerName}>
                    {passenger.title ? `${passenger.title}. ` : ""}{passenger.firstName} {passenger.lastName}
                  </Text>

                  {flowState.legSeatObjectsMap ? (
                    <View style={styles.legsContainer}>
                      {multiCityFlightsList.map((legItem, legIdx) => {
                        const legObj = flowState.legSeatObjectsMap[legIdx]?.[idx];
                        const legLabel = legObj?.label;
                        const isRealSeat = Boolean(legLabel) && String(legLabel).toLowerCase() !== "auto assigned";
                        const seatText = isRealSeat ? `Seat ${legLabel}` : "Seat Auto-assigned";
                        const priceText = legObj?.price ? ` (+₹${legObj.price})` : "";
                        const legFrom = legItem?.fromCity || legItem?.origin?.cityName || legItem?.origin?.airportCode || legItem?.origin || `City ${legIdx + 1}`;
                        const legTo = legItem?.toCity || legItem?.destination?.cityName || legItem?.destination?.airportCode || legItem?.destination || `City ${legIdx + 2}`;

                        return (
                          <View key={legIdx} style={styles.legSeatRow}>
                            <Text style={styles.legRouteText}>
                              Leg {legIdx + 1} — {legFrom} → {legTo}:
                            </Text>
                            <View style={styles.seatBadge}>
                              <Text style={styles.seatBadgeText}>
                                {seatText}{isRealSeat ? priceText : ""}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.seatBadge}>
                      <Text style={styles.seatBadgeText}>{isLegacySeat ? `Seat ${fallbackRawSeat}` : "Seat Auto-assigned"}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {flowState.seatCharges > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="apps" size={18} color={PRIMARY_RED} />
                <Text style={styles.cardTitle}>Total Seat Charges</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: TEXT_DARK, marginLeft: 26 }}>
                ₹{flowState.seatCharges.toLocaleString("en-IN")}
              </Text>
            </View>
          )}

          {/* Promo Code & Available Offers Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="pricetag" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Apply Promo Code</Text>
            </View>

            {appliedCoupon ? (
              /* Success Banner replacing input when coupon is applied */
              <View style={styles.appliedBannerContainer} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <View style={styles.appliedBannerLeft}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.appliedBannerText}>
                    Coupon <Text style={{ fontWeight: "900" }}>{appliedCoupon.code}</Text> applied!
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleRemoveCoupon}
                  style={styles.removePillBtn}
                  accessibilityLabel="Remove coupon"
                >
                  <Ionicons name="trash" size={14} color="#EF4444" />
                  <Text style={styles.removePillText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Input & Apply Button */
              <View>
                <View style={styles.couponInputRow}>
                  <TextInput
                    style={[styles.couponInput, couponError && styles.couponInputError]}
                    value={couponInputValue}
                    onChangeText={(val) => {
                      setCouponInputValue(val);
                      if (couponError) setCouponError(null);
                    }}
                    placeholder="Enter promo code"
                    placeholderTextColor={TEXT_MUTED}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleApplyCoupon(couponInputValue)}
                    disabled={couponLoading}
                    style={[styles.applyCouponBtn, couponLoading && styles.payBtnDisabled]}
                  >
                    {couponLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.applyCouponBtnText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {couponError && (
                  <View style={styles.couponErrorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.couponErrorText}>{couponError}</Text>
                  </View>
                )}
              </View>
            )}

            {availableOffers && availableOffers.length > 0 && (
              <View style={styles.offersSection}>
                <Text style={styles.offersSectionTitle}>AVAILABLE OFFERS</Text>
                {availableOffers.map((offer, idx) => {
                  const offerCode = offer.code || offer.Code || offer.title || offer.Title || `OFFER${idx + 1}`;
                  const isApplied = appliedCoupon?.code?.toUpperCase() === offerCode.toUpperCase();
                  const discountVal = offer.discountValue ?? offer.DiscountValue ?? offer.discountAmount ?? 500;
                  const descText =
                    offer.description || offer.Description || (discountVal ? `Flat ₹${discountVal} instant discount on flights` : "Special Offer");
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.85}
                      onPress={isApplied ? handleRemoveCoupon : () => handleApplyCoupon(offerCode)}
                      style={[styles.offerCardItem, isApplied && styles.offerCardItemApplied]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.offerTagHeader}>
                          <Text style={styles.offerCodeText}>{offerCode}</Text>
                          {discountVal ? (
                            <View style={styles.offerSaveBadge}>
                              <Text style={styles.offerSaveBadgeText}>Save ₹{discountVal}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.offerDescText}>{descText}</Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.offerApplyActionText, isApplied && { color: "#10B981" }]}>
                          {isApplied ? "APPLIED" : "APPLY"}
                        </Text>
                        {isApplied && (
                          <View style={styles.inlineRemoveTag}>
                            <Ionicons name="trash-outline" size={12} color="#EF4444" />
                            <Text style={styles.inlineRemoveTagText}>Remove</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Fare Breakdown Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Fare Details</Text>
            </View>

            {/* 1. FARE TYPE (Always Render) */}
            <View style={styles.fareSummaryRow}>
              <Text style={styles.fareLabel}>Fare Type</Text>
              <View style={[styles.fareTypeBadge, isRefundable ? styles.refundableBadge : styles.nonRefundableBadge]}>
                <Text style={[styles.fareTypeBadgeText, isRefundable ? styles.refundableBadgeText : styles.nonRefundableBadgeText]}>
                  {fareTypeLabel}
                </Text>
              </View>
            </View>

            {/* 2. BASE FARE (Always Render - DisplayBaseFare) */}
            <View style={styles.fareSummaryRow}>
              <Text style={styles.fareLabel}>Base Fare</Text>
              <Text style={styles.fareValue}>{formatINR(displayBaseFare)}</Text>
            </View>

            {/* 3. TAXES & FEES (only when displayTax > 0) */}
            {displayTax > 0 ? (
              <View style={styles.fareSummaryRow}>
                <Text style={styles.fareLabel}>Taxes & Fees</Text>
                <Text style={styles.fareValue}>{formatINR(displayTax)}</Text>
              </View>
            ) : null}

            {/* 4. CONVENIENCE FEE (only when convenienceFeeValue > 0) */}
            {convenienceFeeValue > 0 ? (
              <View style={styles.fareSummaryRow}>
                <Text style={styles.fareLabel}>Convenience Fee</Text>
                <Text style={styles.fareValue}>{formatINR(convenienceFeeValue)}</Text>
              </View>
            ) : null}

            {/* 5. TRIP SECURE FEE (only when tripSecureSelected === true && tripSecureFeeValue > 0) */}
            {tripSecureSelected && tripSecureFeeValue > 0 ? (
              <View style={styles.fareSummaryRow}>
                <Text style={styles.fareLabel}>Trip Secure Fee</Text>
                <Text style={styles.fareValue}>{formatINR(tripSecureFeeValue)}</Text>
              </View>
            ) : null}

            {/* 6. INSTANT DISCOUNT (only when totalDiscountValue > 0) */}
            {totalDiscountValue > 0 ? (
              <View style={styles.fareSummaryRow}>
                <Text style={[styles.fareLabel, styles.discountText]}>Instant Discount</Text>
                <Text style={[styles.fareValue, styles.discountText]}>
                  {formatDiscount(totalDiscountValue)}
                </Text>
              </View>
            ) : null}

            {/* 7. SEAT SURCHARGE (only when seatSurcharge > 0) */}
            {seatSurcharge > 0 ? (
              <View style={styles.fareSummaryRow}>
                <Text style={styles.fareLabel}>Seat Selection</Text>
                <Text style={styles.fareValue}>{formatINR(seatSurcharge)}</Text>
              </View>
            ) : null}

            {/* 8. SSR SURCHARGE (only when ssrSurcharge > 0) */}
            {ssrSurcharge > 0 ? (
              <View style={styles.fareSummaryRow}>
                <Text style={styles.fareLabel}>Add-ons (Baggage/Meal)</Text>
                <Text style={styles.fareValue}>{formatINR(ssrSurcharge)}</Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            {/* 7. TOTAL AMOUNT (Always Render, Bold) */}
            <View style={styles.fareSummaryRow}>
              <Text style={styles.grandLabel}>Total Amount</Text>
              <Text style={styles.grandValue}>{formatINR(finalPayable)}</Text>
            </View>
          </View>

          {/* Proceed to Payment Action Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleConfirmBooking}
            disabled={loading}
            style={[styles.payBtn, loading && styles.payBtnDisabled]}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.payBtnText}>Creating Order...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.payBtnText}>Pay {formatINR(finalPayable)} Securely</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={{ textAlign: "center", fontSize: 11, color: TEXT_MUTED, marginTop: 4, fontWeight: "500" }}>
            🔒 Secured by Cashfree Payments
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT_DARK },
  headerSubtitle: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },
  scrollContent: { padding: 16 },
  container: { gap: 16 },
  containerWide: { maxWidth: 720, alignSelf: "center", width: "100%" },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: TEXT_DARK },
  flightSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  airlineName: { fontSize: 15, fontWeight: "800", color: TEXT_DARK },
  flightNum: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  routeCol: { alignItems: "flex-end" },
  routeText: { fontSize: 14, fontWeight: "700", color: TEXT_DARK },
  routeSubText: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  passengerRow: { paddingVertical: 4 },
  passengerName: { fontSize: 13, fontWeight: "600", color: TEXT_DARK, marginBottom: 4 },
  seatBadge: { backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  seatBadgeText: { fontSize: 11, fontWeight: "700", color: PRIMARY_RED },
  legsContainer: { marginTop: 4, gap: 6 },
  legSeatRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingLeft: 8 },
  legRouteText: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },
  fareSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareLabel: { fontSize: 13, color: TEXT_MUTED, fontWeight: "500" },
  fareValue: { fontSize: 13, fontWeight: "700", color: TEXT_DARK },
  fareTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  refundableBadge: { backgroundColor: "#DCFCE7" },
  refundableBadgeText: { color: "#15803D", fontSize: 11, fontWeight: "800" },
  nonRefundableBadge: { backgroundColor: "#F1F5F9" },
  nonRefundableBadgeText: { color: "#64748B", fontSize: 11, fontWeight: "800" },
  discountText: { color: "#10B981" },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },
  grandLabel: { fontSize: 15, fontWeight: "800", color: TEXT_DARK },
  grandValue: { fontSize: 16, fontWeight: "900", color: PRIMARY_RED },
  paymentInputBlock: { gap: 6 },
  paymentInputLabel: { fontSize: 11, fontWeight: "800", color: TEXT_MUTED, letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_DARK,
    backgroundColor: "#FAFAFA",
  },
  orDivider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: BORDER },
  orText: { fontSize: 11, fontWeight: "800", color: TEXT_MUTED },
  payBtn: {
    backgroundColor: PRIMARY_RED,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { color: WHITE, fontSize: 16, fontWeight: "800" },
  couponInputRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_DARK,
    backgroundColor: "#FAFAFA",
    fontWeight: "700",
  },
  applyCouponBtn: {
    backgroundColor: TEXT_DARK,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  applyCouponBtnText: { color: WHITE, fontSize: 13, fontWeight: "800" },
  appliedBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5", padding: 8, borderRadius: 8 },
  appliedBadgeText: { fontSize: 12, color: "#065F46" },
  offersSection: { marginTop: 8, gap: 8 },
  offersSectionTitle: { fontSize: 11, fontWeight: "800", color: TEXT_MUTED, letterSpacing: 0.5 },
  offerCardItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#FAFAFA",
  },
  offerCardItemApplied: { borderColor: "#10B981", backgroundColor: "#ECFDF5" },
  offerTagHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  offerCodeText: { fontSize: 13, fontWeight: "900", color: TEXT_DARK },
  offerSaveBadge: { backgroundColor: "#FEF2F2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  offerSaveBadgeText: { fontSize: 10, fontWeight: "800", color: PRIMARY_RED },
  offerDescText: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  offerApplyActionText: { fontSize: 12, fontWeight: "800", color: PRIMARY_RED },
  removeCouponBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "#FEE2E2" },
  removeCouponText: { fontSize: 11, fontWeight: "700", color: "#EF4444" },
  inlineRemoveTag: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "#FEE2E2" },
  inlineRemoveTagText: { fontSize: 10, fontWeight: "800", color: "#EF4444" },
  appliedBannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  appliedBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  appliedBannerText: {
    fontSize: 13,
    color: "#065F46",
    fontWeight: "500",
  },
  removePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EF4444",
  },
  couponInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  couponErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  couponErrorText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
});
