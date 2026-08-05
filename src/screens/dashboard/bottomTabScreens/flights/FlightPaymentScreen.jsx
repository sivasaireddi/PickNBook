import React, { useState, useCallback } from "react";
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
import { ticketLCC, holdGDS, ticketGDS, getFlightFareQuote } from "./services/flightBookingService";
import { validateCoupon, calculateFareBreakdown, getDefaultAvailableOffers } from "./services/flightCouponService";
import { formatCurrency } from "./utils/flightUtils";

const PRIMARY_RED = "#E53935";
const BACKGROUND = "#F8F9FB";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function FlightPaymentScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const flowState = route?.params || {};
  
  const [upiId, setUpiId] = useState("");
  const [card, setCard] = useState("");
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  // State Management according to specification:
  // appliedCoupon: { code, discountAmount, type, maxDiscountCap } | null
  const [appliedCoupon, setAppliedCoupon] = useState(
    flowState.appliedCouponObj || (flowState.appliedCoupon ? { code: flowState.appliedCoupon, discountAmount: Number(flowState.fareSummary?.discount || 500) } : null)
  );
  const [couponInputValue, setCouponInputValue] = useState(flowState.couponCode || "");
  const [couponError, setCouponError] = useState(null);

  const initialOffers =
    (Array.isArray(flowState.fareQuote?.PickNBookAvailableOffers) && flowState.fareQuote.PickNBookAvailableOffers.length > 0
      ? flowState.fareQuote.PickNBookAvailableOffers
      : null) ||
    (Array.isArray(flowState.fareQuote?.Results?.PickNBookAvailableOffers) && flowState.fareQuote.Results.PickNBookAvailableOffers.length > 0
      ? flowState.fareQuote.Results.PickNBookAvailableOffers
      : null) ||
    [];

  const [availableOffers] = useState(initialOffers);

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
  
  // Reactive fare calculation using pure function:
  const fareBreakdown = calculateFareBreakdown({
    baseFare,
    taxes,
    seatSurcharge,
    ssrSurcharge,
    convenienceFee,
    appliedCoupon,
  });

  const totalFare = fareBreakdown.grandTotal;
  const appliedDiscountAmount = fareBreakdown.discountAmount;

  // 5. Remove Coupon functionality
  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponInputValue("");
    setCouponError(null);
    Alert.alert("Coupon Removed", "Promo code removed. Fare breakdown reset to original amount.");
  }, []);

  // 3. Validation Logic (client + server)
  const handleApplyCoupon = async (codeToApply) => {
    const targetCode = String(codeToApply || couponInputValue || "").trim().toUpperCase();
    if (!targetCode) {
      setCouponError("Please enter a valid coupon code.");
      return;
    }

    setCouponError(null);
    setCouponLoading(true);

    try {
      console.log(`[FlightPaymentScreen] Validating coupon '${targetCode}'...`);

      // First run client/server validation against cart total
      const cartTotal = baseFare + taxes;
      const validationResult = await validateCoupon({ code: targetCode, cartTotal, availableOffers });

      if (!validationResult.valid) {
        const errReason = validationResult.reason || `Coupon '${targetCode}' is invalid or expired.`;
        setCouponError(errReason);
        Alert.alert("Invalid Coupon", errReason);
        return;
      }

      // Call supplier /FareQuote endpoint with CouponCode
      if (traceId && resultIndex) {
        try {
          const fareQuoteRes = await getFlightFareQuote({
            traceId,
            resultIndex,
            srdvType,
            srdvIndex,
            couponCode: targetCode,
          });
          console.log("[FlightPaymentScreen] Live FareQuote with coupon response:", JSON.stringify(fareQuoteRes, null, 2));
        } catch (apiErr) {
          console.warn("[FlightPaymentScreen] FareQuote API coupon warning:", apiErr?.message);
        }
      }

      const nextCouponObj = {
        code: targetCode,
        discountAmount: validationResult.discountAmount,
        type: validationResult.type || "flat",
        maxDiscountCap: validationResult.maxDiscountCap || null,
        title: validationResult.title || targetCode,
      };

      setAppliedCoupon(nextCouponObj);
      setCouponInputValue(targetCode);
      setCouponError(null);

      Alert.alert(
        "Coupon Applied! 🎉",
        `Promo code '${targetCode}' applied successfully! You saved ${formatCurrency(validationResult.discountAmount)}!`
      );
    } catch (err) {
      console.error("[FlightPaymentScreen] Apply coupon error:", err?.message);
      const msg = err?.message || "Failed to apply promo code. Please check the code.";
      setCouponError(msg);
      Alert.alert("Invalid Coupon", msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePay = async () => {
    if (!upiId.trim() && !String(card).replace(/\D/g, "").length) {
      Alert.alert("Payment Info Required", "Please enter either a UPI ID or credit/debit card details.");
      return;
    }

    if (!traceId || !resultIndex) {
      Alert.alert("Session Error", "Session parameters missing. Please re-select your flight.");
      return;
    }

    const mapPassengersForApi = (pList, seatLabels) => {
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

        const paxBaseFare = Number(flowState.fareSummary?.baseFare || 0);
        const paxTax = Number(flowState.fareSummary?.tax || 0);

        const selectedSeatObj = flowState.selectedSeats?.[idx];
        const rawSeatObj = selectedSeatObj?.rawSeat || (selectedSeatObj?.rawCode ? { Code: selectedSeatObj.rawCode, SeatNo: selectedSeatObj.seatNumber } : null);

        return {
          Title: String(p.title || "Mr"),
          FirstName: String(p.firstName || `Passenger${idx + 1}`),
          LastName: String(p.lastName || `Passenger${idx + 1}`),
          MiddleName: "",
          PaxType: p.passengerType === "Child" ? 2 : p.passengerType === "Infant" ? 3 : 1,
          DateOfBirth: cleanDob ? `${cleanDob}T00:00:00` : "1995-05-15T00:00:00",
          Gender: String(p.gender === "Female" || p.gender === 2 || p.gender === "2" ? "2" : "1"),
          Nationality: nationalityCode,
          ...(p.passportNo ? { PassportNo: String(p.passportNo) } : {}),
          ...(p.passportExpiry ? { PassportExpiry: `${p.passportExpiry}T00:00:00` } : {}),
          ...(p.passportIssueCountryCode ? { PassportIssueCountryCode: String(p.passportIssueCountryCode) } : {}),
          AddressLine1: "PickNBook Street",
          City: "Hyderabad",
          CountryCode: "IN",
          CountryName: "India",
          CellCountryCode: "+91",
          ContactNo: String(flowState.contact?.mobile || "9885180211").trim(),
          Email: String(flowState.contact?.email || "user@picknbook.com").trim(),
          IsLeadPax: idx === 0,
          Fare: {
            BaseFare: paxBaseFare,
            Tax: paxTax,
            TransactionFee: 0,
            YQTax: 0,
          },
          Baggage: flowState.ssrDetails?.baggage ? [flowState.ssrDetails.baggage] : [],
          MealDynamic: flowState.ssrDetails?.meal ? [flowState.ssrDetails.meal] : [],
          Seat: rawSeatObj ? [rawSeatObj] : [],
          ...(rawSeatObj?.Code ? { SeatNo: String(rawSeatObj.Code) } : (seat ? { SeatNo: String(seat) } : {})),
        };
      });
    };

    const apiPassengers = mapPassengersForApi(flowState.passengers, flowState.selectedSeatLabels);

    console.log("\n==========================================");
    console.log("✈️ [FLIGHT BOOKING FLOW - STEP 5: PAYMENT & TICKETING]");
    console.log("[FlightPaymentScreen] Carrier Type:", isLCC ? "LCC (Low-Cost Carrier)" : "GDS (Full Service Carrier)");
    console.log("[FlightPaymentScreen] Total Fare:", totalFare);
    console.log("[FlightPaymentScreen] Applied Coupon:", appliedCoupon || "None");
    console.log("[FlightPaymentScreen] Mapped Passengers for Ticketing API:");
    console.log(JSON.stringify(apiPassengers, null, 2));
    console.log("==========================================\n");

    setLoading(true);
    try {
      let bookingRes = null;
      let pnr = "";
      let bookingId = "";
      let ticketStatus = "Confirmed";

      if (isLCC) {
        console.log("[FlightPaymentScreen] Requesting /api/flight/srdv/TicketLCC...");
        bookingRes = await ticketLCC({
          traceId,
          resultIndex,
          srdvType,
          srdvIndex,
          couponCode: appliedCoupon,
          passengers: apiPassengers,
        });

        console.log("[FlightPaymentScreen] TicketLCC API Response:", JSON.stringify(bookingRes, null, 2));
        const resData = bookingRes?.Response || bookingRes?.Results || bookingRes;
        pnr = String(resData?.PNR || resData?.pnr || resData?.FlightItinerary?.PNR || resData?.BookingRefNo || "");
        bookingId = String(resData?.BookingId || resData?.bookingId || resData?.FlightItinerary?.BookingId || resData?.TicketId || "");
        ticketStatus = String(resData?.TicketStatus === "1" || resData?.Status === "1" ? "Confirmed" : resData?.TicketStatus || resData?.Status || "Confirmed");
      } else {
        console.log("[FlightPaymentScreen] Requesting /api/flight/srdv/HoldGDS...");
        const holdRes = await holdGDS({
          traceId,
          resultIndex,
          srdvType,
          srdvIndex,
          couponCode: appliedCoupon,
          passengers: apiPassengers,
        });

        console.log("[FlightPaymentScreen] HoldGDS API Response:", JSON.stringify(holdRes, null, 2));
        const holdData = holdRes?.Response || holdRes?.Results || holdRes;
        pnr = String(holdData?.PNR || holdData?.pnr || holdData?.BookingRefNo || "");
        bookingId = String(holdData?.BookingId || holdData?.bookingId || "");

        console.log("[FlightPaymentScreen] HoldGDS success. Issuing ticket via /api/flight/srdv/TicketGDS...");
        const ticketRes = await ticketGDS({ pnr, bookingId, traceId, resultIndex, srdvType, srdvIndex });
        console.log("[FlightPaymentScreen] TicketGDS API Response:", JSON.stringify(ticketRes, null, 2));
        const ticketData = ticketRes?.Response || ticketRes?.Results || ticketRes;
        ticketStatus = String(ticketData?.TicketStatus || ticketData?.Status || "Pending Confirmation");
      }

      console.log("\n🎉 [FLIGHT BOOKING FLOW SUCCESS]");
      console.log("[FlightPaymentScreen] Airline PNR:", pnr);
      console.log("[FlightPaymentScreen] Booking ID:", bookingId);
      console.log("[FlightPaymentScreen] Ticket Status:", ticketStatus);
      console.log("==========================================\n");

      const nextState = {
        ...flowState,
        pnr: pnr || `PNR-${Math.random().toString(36).substring(3, 9).toUpperCase()}`,
        bookingId: bookingId || `BID-${Date.now().toString().slice(-8)}`,
        bookingReference: bookingId || pnr || `FL-${Date.now().toString().slice(-8)}`,
        ticketStatus,
        payableAmount: totalFare,
        appliedCoupon,
      };

      await clearFlightBookingFlowState();
      navigation.navigate("FlightConfirmationScreen", nextState);
    } catch (error) {
      console.error("[FlightPaymentScreen] Booking API Error:", error?.message);
      Alert.alert(
        "Booking Failed",
        error?.message || "Failed to process ticketing with SRDV supplier. Please try again.",
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
          <Text style={styles.headerTitle}>Review & Payment</Text>
          <Text style={styles.headerSubtitle}>Step 4 of 4 • Final summary & pay</Text>
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
              const seatNum = flowState.selectedSeatLabels?.[idx] || flowState.selectedSeats?.[idx]?.label || "Auto Assigned";
              return (
                <View key={idx} style={styles.passengerRow}>
                  <Text style={styles.passengerName}>
                    {passenger.title}. {passenger.firstName} {passenger.lastName}
                  </Text>
                  <View style={styles.seatBadge}>
                    <Text style={styles.seatBadgeText}>Seat {seatNum}</Text>
                  </View>
                </View>
              );
            })}
          </View>

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
                  const offerCode = offer.code || offer.Code || offer.title || offer.Title || `OFFER${idx+1}`;
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

            <View style={styles.fareSummaryRow}>
              <Text style={styles.fareLabel}>Base Fare</Text>
              <Text style={styles.fareValue}>{formatCurrency(baseFare)}</Text>
            </View>

            <View style={styles.fareSummaryRow}>
              <Text style={styles.fareLabel}>Taxes & Airport Fees</Text>
              <Text style={styles.fareValue}>{formatCurrency(taxes)}</Text>
            </View>

            {seatSurcharge > 0 && (
              <View style={styles.fareSummaryRow}>
                <Text style={styles.fareLabel}>Seat Surcharges</Text>
                <Text style={styles.fareValue}>{formatCurrency(seatSurcharge)}</Text>
              </View>
            )}

            {ssrSurcharge > 0 && (
              <View style={styles.fareSummaryRow}>
                <Text style={styles.fareLabel}>Extra Baggage / Meals (SSR)</Text>
                <Text style={styles.fareValue}>{formatCurrency(ssrSurcharge)}</Text>
              </View>
            )}

            <View style={styles.fareSummaryRow}>
              <Text style={styles.fareLabel}>Convenience Fee</Text>
              <Text style={styles.fareValue}>{formatCurrency(convenienceFee)}</Text>
            </View>

            {appliedDiscountAmount > 0 && appliedCoupon ? (
              <View style={styles.fareSummaryRow}>
                <Text style={[styles.fareLabel, styles.discountText]}>
                  Promo Code Discount ({appliedCoupon.code})
                </Text>
                <Text style={[styles.fareValue, styles.discountText]}>
                  -{formatCurrency(appliedDiscountAmount)}
                </Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.fareSummaryRow}>
              <Text style={styles.grandLabel}>Total Payable Amount</Text>
              <Text style={styles.grandValue}>{formatCurrency(totalFare)}</Text>
            </View>
          </View>

          {/* Payment Options Input */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="card" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Select Payment Method</Text>
            </View>

            {/* UPI Section */}
            <View style={styles.paymentInputBlock}>
              <Text style={styles.paymentInputLabel}>PAY VIA UPI ID</Text>
              <TextInput
                style={styles.input}
                value={upiId}
                onChangeText={(val) => {
                  setUpiId(val);
                  setCard("");
                }}
                placeholder="e.g. username@okaxis"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* Card Section */}
            <View style={styles.paymentInputBlock}>
              <Text style={styles.paymentInputLabel}>CREDIT / DEBIT CARD</Text>
              <TextInput
                style={styles.input}
                value={card}
                onChangeText={(val) => {
                  setCard(val);
                  setUpiId("");
                }}
                placeholder="Card Number (16 digits)"
                keyboardType="numeric"
                maxLength={16}
              />
            </View>
          </View>

          {/* Pay Action Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePay}
            disabled={loading}
            style={[styles.payBtn, loading && styles.payBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.payBtnText}>Pay & Confirm {formatCurrency(totalFare)}</Text>
            )}
          </TouchableOpacity>

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
  passengerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  passengerName: { fontSize: 13, fontWeight: "600", color: TEXT_DARK },
  seatBadge: { backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  seatBadgeText: { fontSize: 11, fontWeight: "700", color: PRIMARY_RED },
  fareSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareLabel: { fontSize: 13, color: TEXT_MUTED, fontWeight: "500" },
  fareValue: { fontSize: 13, fontWeight: "700", color: TEXT_DARK },
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
