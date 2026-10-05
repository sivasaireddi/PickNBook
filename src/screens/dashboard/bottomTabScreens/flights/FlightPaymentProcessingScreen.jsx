/**
 * FlightPaymentProcessingScreen.jsx
 * ------------------------------------
 * Step 4 of the Cashfree payment flow.
 *
 * Shows an animated "Confirming your Flight Ticket..." loader while
 * polling GET /api/cashfree/orders/{cashfreeOrderId}/payments every 3-4 s
 * (up to 20 attempts / 60 s).
 *
 * On SUCCESS  → fetches GET /api/flight/srdv/my-bookings and navigates to
 *               FlightConfirmationScreen with the confirmed booking data.
 * On FAILED   → stops polling, shows failure UI with retry / home options.
 * On TIMEOUT  → shows a "still processing" warning with My Bookings link.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { verifyFlightPayment, getMyFlightBookings } from "../../../../services/cashfreeService";

// ─── Design tokens (matching existing screens) ───────────────────────────────
const PRIMARY_RED = "#E53935";
const BACKGROUND = "#F8F9FB";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

// ─── Polling config ────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 3500;    // 3.5 seconds between polls
const MAX_POLL_ATTEMPTS = 20;     // max ~70 seconds total

// ─── Possible UI states ───────────────────────────────────────────────────
// "processing" | "success" | "failed" | "timeout"

export default function FlightPaymentProcessingScreen({ route, navigation }) {
  const params = route?.params || {};
  const {
    cashfreeOrderId,
    totalFare,
    appliedCoupon,
    apiPassengers,
    ...flowState
  } = params;

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [uiState, setUiState] = useState("processing"); // processing | success | failed | timeout
  const [failureReason, setFailureReason] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // ─── Animation refs ────────────────────────────────────────────────────────
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.3)).current;

  // ─── Refs to avoid stale closures ─────────────────────────────────────────
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const attemptRef = useRef(0);

  // ─── Spin animation (loading state) ──────────────────────────────────────
  const startSpinning = useCallback(() => {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ─── Success animation ─────────────────────────────────────────────────────
  const playSuccess = useCallback(() => {
    spinAnim.stopAnimation();
    pulseAnim.stopAnimation();

    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, tension: 55, friction: 5, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // ─── Poll single attempt ───────────────────────────────────────────────────
  const pollOnce = useCallback(async () => {
    if (!isMountedRef.current) return;

    attemptRef.current += 1;
    const attempt = attemptRef.current;
    setAttemptCount(attempt);

    console.log(`[ProcessingScreen] Poll #${attempt} | orderId: ${cashfreeOrderId}`);

    try {
      const result = await verifyFlightPayment(cashfreeOrderId);
      console.log(`[ProcessingScreen] Poll #${attempt} status: ${result.status}`);

      if (!isMountedRef.current) return;

      if (result.status === "Success") {
        // ── Payment succeeded ─────────────────────────────────────────────
        setUiState("success");
        playSuccess();

        // Fetch the most-recent confirmed booking from SRDV
        try {
          const bookings = await getMyFlightBookings();
          const latest = Array.isArray(bookings) && bookings.length > 0 ? bookings[0] : null;
          if (latest) {
            setConfirmedBooking(latest);
          }

          // Navigate to confirmation screen after a 2-second success moment
          setTimeout(() => {
            if (!isMountedRef.current) return;
            navigation.replace("FlightConfirmationScreen", {
              ...flowState,
              // Confirmed booking fields from /my-bookings
              pnr: latest?.Pnr || latest?.pnr || latest?.BookingReference || "",
              bookingId: latest?.Id || latest?.id || latest?.BookingId || "",
              bookingReference: latest?.BookingReference || latest?.bookingReference || cashfreeOrderId,
              ticketStatus: latest?.Status || "Booked",
              payableAmount: result.amount || totalFare,
              paymentMethod: result.paymentMethod || "Cashfree",
              paidAt: result.paidAt || new Date().toISOString(),
              appliedCoupon,
              passengers: latest?.Passengers || apiPassengers || flowState.passengers,
              cashfreeOrderId,
            });
          }, 2000);
        } catch (bookingErr) {
          console.warn("[ProcessingScreen] Failed to fetch my-bookings:", bookingErr?.message);
          // Still navigate with what we have from the poll response
          setTimeout(() => {
            if (!isMountedRef.current) return;
            navigation.replace("FlightConfirmationScreen", {
              ...flowState,
              pnr: result.paymentReference || cashfreeOrderId,
              bookingId: cashfreeOrderId,
              bookingReference: cashfreeOrderId,
              ticketStatus: "Booked",
              payableAmount: result.amount || totalFare,
              paymentMethod: result.paymentMethod || "Cashfree",
              paidAt: result.paidAt || new Date().toISOString(),
              appliedCoupon,
              passengers: apiPassengers || flowState.passengers,
              cashfreeOrderId,
            });
          }, 2000);
        }

      } else if (result.status === "Failed") {
        // ── Payment failed / cancelled ────────────────────────────────────
        setFailureReason(result.failureReason || "Payment was declined or cancelled.");
        setUiState("failed");

      } else {
        // ── Still pending — schedule next poll ────────────────────────────
        if (attempt >= MAX_POLL_ATTEMPTS) {
          console.warn("[ProcessingScreen] Max polling attempts reached. Showing timeout.");
          setUiState("timeout");
        } else {
          pollTimerRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
        }
      }
    } catch (err) {
      console.error("[ProcessingScreen] Poll error:", err?.message);
      if (!isMountedRef.current) return;

      if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
        setUiState("timeout");
      } else {
        // On network error, retry after a slightly longer delay
        pollTimerRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS + 1000);
      }
    }
  }, [cashfreeOrderId, flowState, totalFare, appliedCoupon, apiPassengers, navigation, playSuccess]);

  // ─── Mount / Unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    startSpinning();

    // Start first poll
    pollTimerRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // ─── Spin interpolation ────────────────────────────────────────────────────
  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // ─── Render helpers ────────────────────────────────────────────────────────
  const renderProcessing = () => (
    <View style={styles.centerContent}>
      <Animated.View
        style={[
          styles.loaderRing,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Animated.View
          style={[
            styles.loaderSpinner,
            { transform: [{ rotate: spinInterpolate }] },
          ]}
        >
          <View style={styles.spinnerArc} />
        </Animated.View>
        <Ionicons name="airplane" size={36} color={PRIMARY_RED} style={styles.planeIcon} />
      </Animated.View>

      <Text style={styles.mainTitle}>Confirming your Flight Ticket...</Text>
      <Text style={styles.subText}>
        We're verifying your payment and securing your seat.{"\n"}
        This usually takes a few seconds.
      </Text>

      <View style={styles.statusPill}>
        <View style={styles.statusDot} />
        <Text style={styles.statusPillText}>
          Checking payment status ({attemptCount}/{MAX_POLL_ATTEMPTS})
        </Text>
      </View>

      <Text style={styles.doNotCloseText}>
        🔒 Please don't close the app
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
      <Animated.View style={{ transform: [{ scale: successScale }] }}>
        <Ionicons name="checkmark-circle" size={96} color="#10B981" />
      </Animated.View>
      <Text style={[styles.mainTitle, { color: "#10B981", marginTop: 16 }]}>
        Payment Confirmed!
      </Text>
      <Text style={styles.subText}>
        Your flight ticket is being issued.{"\n"}
        Redirecting to your booking details…
      </Text>
    </Animated.View>
  );

  const renderFailed = () => (
    <View style={styles.centerContent}>
      <Ionicons name="close-circle" size={96} color="#EF4444" />
      <Text style={[styles.mainTitle, { color: "#EF4444", marginTop: 16 }]}>
        Payment Failed
      </Text>
      <Text style={styles.subText}>
        {failureReason || "Your payment could not be processed."}
      </Text>

      <View style={styles.actionStack}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="refresh" size={18} color={WHITE} />
          <Text style={styles.primaryBtnText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("DashBoard")}
        >
          <Text style={styles.outlineBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTimeout = () => (
    <View style={styles.centerContent}>
      <Ionicons name="time-outline" size={80} color="#F59E0B" />
      <Text style={[styles.mainTitle, { color: "#F59E0B", marginTop: 16 }]}>
        Taking Longer Than Expected
      </Text>
      <Text style={styles.subText}>
        Your payment may have been processed.{"\n"}
        Please check My Bookings or contact support.
      </Text>

      <View style={styles.actionStack}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: "#F59E0B" }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("DashBoard")}
        >
          <Ionicons name="list" size={18} color={WHITE} />
          <Text style={styles.primaryBtnText}>View My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          activeOpacity={0.85}
          onPress={() => {
            // Restart polling
            attemptRef.current = 0;
            setAttemptCount(0);
            setUiState("processing");
            startSpinning();
            pollTimerRef.current = setTimeout(pollOnce, 500);
          }}
        >
          <Text style={styles.outlineBtnText}>Recheck Payment</Text>
        </TouchableOpacity>
      </View>

      {cashfreeOrderId ? (
        <Text style={styles.referenceText}>
          Order Ref: {cashfreeOrderId}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        {/* Header strip (no back button during processing) */}
        <View style={styles.headerBar}>
          {(uiState === "failed" || uiState === "timeout") && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {uiState === "processing" && "Processing Payment"}
              {uiState === "success"    && "Booking Confirmed"}
              {uiState === "failed"     && "Payment Failed"}
              {uiState === "timeout"    && "Still Processing"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {uiState === "processing" && "Please wait while we verify…"}
              {uiState === "success"    && "Your ticket is confirmed 🎉"}
              {uiState === "failed"     && "We couldn't process your payment"}
              {uiState === "timeout"    && "Verification taking longer than usual"}
            </Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.bodyContainer}>
          {uiState === "processing" && renderProcessing()}
          {uiState === "success"    && renderSuccess()}
          {uiState === "failed"     && renderFailed()}
          {uiState === "timeout"    && renderTimeout()}
        </View>

        {/* Cashfree secure badge */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={TEXT_MUTED} />
          <Text style={styles.footerText}>Secured by Cashfree Payments</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "500",
    marginTop: 1,
  },
  bodyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  centerContent: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },

  // ── Loader ring ──────────────────────────────────────────
  loaderRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY_RED,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  loaderSpinner: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  spinnerArc: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: "transparent",
    borderTopColor: PRIMARY_RED,
    borderRightColor: PRIMARY_RED,
  },
  planeIcon: {
    position: "absolute",
  },

  // ── Text ─────────────────────────────────────────────────
  mainTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: TEXT_DARK,
    textAlign: "center",
  },
  subText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Status pill ───────────────────────────────────────────
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_RED,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_RED,
  },
  doNotCloseText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Action buttons ────────────────────────────────────────
  actionStack: {
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY_RED,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    backgroundColor: WHITE,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  referenceText: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 4,
  },

  // ── Footer ────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingBottom: 20,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
});
