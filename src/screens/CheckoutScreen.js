import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCashfreePayment } from '../hooks/useCashfreePayment';
import { getStoredAuthToken } from '../utils/authSession';
import BookingConfirmationScreen from './BookingConfirmationScreen';
import BookingFailureScreen from './BookingFailureScreen';
import {
  formatBusSeatHoldTime,
  getBusSeatHoldRemainingMs,
  areSamePassengerSeatAssignments,
  validateBusPrePayment,
} from '../utils/busSeatHold';

const EXPIRED_SEAT_HOLD_MESSAGE = 'Your reserved seat block has expired. Please try booking again.';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const DetailRow = ({ label, value, accent = false }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, accent && styles.accentText]}>{value}</Text>
    </View>
  );
};

const StatusScreen = ({ status, error, onCheck, onBack, checking }) => {
  const content = {
    booking_pending: {
      icon: 'time-outline',
      title: 'Booking is being confirmed',
      text: 'Your payment was verified. The bus operator is still confirming the booking.',
    },
    payment_pending: {
      icon: 'hourglass-outline',
      title: 'Payment status pending',
      text: 'The bank or payment provider has not returned a final payment status yet.',
    },
    booking_failed: {
      icon: 'alert-circle-outline',
      title: 'Payment received, booking failed',
      text: 'The payment succeeded, but the bus booking could not be confirmed. Check status before taking another action.',
    },
    verification_error: {
      icon: 'cloud-offline-outline',
      title: 'Unable to verify status',
      text: 'The payment result could not be verified because of a network or server error.',
    },
    cancelled: {
      icon: 'close-circle-outline',
      title: 'Payment cancelled',
      text: 'The payment flow was closed before completion.',
    },
  }[status];

  return (
    <SafeAreaView style={styles.statePage}>
      <View style={styles.stateIcon}>
        <Ionicons name={content.icon} size={38} color="#C9152B" />
      </View>
      <Text style={styles.stateTitle}>{content.title}</Text>
      <Text style={styles.stateText}>{error || content.text}</Text>
      {status !== 'cancelled' ? (
        <TouchableOpacity style={styles.statePrimary} onPress={onCheck} disabled={checking}>
          {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.statePrimaryText}>Check status</Text>}
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.stateSecondary} onPress={onBack}>
        <Text style={styles.stateSecondaryText}>Back to review</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const CheckoutScreen = ({ route, navigation }) => {
  const {
    userToken,
    bookingDetails,
    customerDetails,
    amount,
    bookingType,
    reviewDetails = {},
    seatHold,
    bookingAttempt,
  } = route?.params || {};
  const insets = useSafeAreaInsets();
  const [authToken, setAuthToken] = useState(userToken || '');
  const payPressRef = useRef(false);
  const bypassBackGuardRef = useRef(false);
  const [leaveDialogVisible, setLeaveDialogVisible] = useState(false);
  const [holdRemainingMs, setHoldRemainingMs] = useState(() =>
    getBusSeatHoldRemainingMs(seatHold?.expiresAt)
  );

  useEffect(() => {
    if (!authToken) {
      getStoredAuthToken().then((token) => token && setAuthToken(token)).catch(() => {});
    }
  }, [authToken]);

  const {
    status,
    error,
    orderId,
    verificationResult,
    startPayment,
    recheckPayment,
    reset,
  } = useCashfreePayment(authToken);

  useEffect(() => {
    if (!['creating_order', 'awaiting_payment', 'verifying'].includes(status)) {
      payPressRef.current = false;
    }
  }, [status]);

  const effectiveBookingType =
    bookingType || (bookingDetails?.HotelName || bookingDetails?.HotelRoomsDetails ? 'Hotel' : 'Bus');
  const isBus = effectiveBookingType.toLowerCase() === 'bus';
  const fare = reviewDetails?.fareSummary || {};
  const passengers = Array.isArray(reviewDetails?.passengers) ? reviewDetails.passengers : [];
  const seats = Array.isArray(reviewDetails?.seats) ? reviewDetails.seats : [];
  const payableAmount = Number(amount || 0);
  const loading = ['creating_order', 'awaiting_payment', 'verifying'].includes(status);
  const currentSeatHold = useMemo(() => ({
    blockKey: seatHold?.blockKey || bookingDetails?.blockKey,
    blockedAt: seatHold?.blockedAt,
    expiresAt: seatHold?.expiresAt,
  }), [bookingDetails?.blockKey, seatHold?.blockKey, seatHold?.blockedAt, seatHold?.expiresAt]);
  const hasSeatHold = Boolean(
    String(currentSeatHold.blockKey || '').trim() && Number.isFinite(Number(currentSeatHold.expiresAt))
  );
  const holdExpired = isBus && hasSeatHold && holdRemainingMs <= 0;
  const holdValid = !isBus || (hasSeatHold && holdRemainingMs > 0);
  const tripIdentityMatches = !isBus || [
    ['traceId', bookingDetails?.traceId],
    ['resultIndex', bookingDetails?.resultIndex],
    ['srdvIndex', bookingDetails?.srdvIndex],
  ].every(([key, currentValue]) =>
    String(currentValue ?? '').trim() === String(bookingAttempt?.[key] ?? '').trim()
  );
  const passengerAssignmentsMatch = !isBus || areSamePassengerSeatAssignments(
    passengers,
    bookingAttempt?.passengers,
  );
  const busPrePaymentValidation = useMemo(() => validateBusPrePayment({
    seatHold: currentSeatHold,
    currentSeats: seats,
    heldSeatNames: bookingAttempt?.heldSeatNames,
    tripIdentityMatches,
    passengerAssignmentsMatch,
    pricingPreview: bookingAttempt?.pricingPreview,
    pricingPreviewStatus: bookingAttempt?.pricingPreviewStatus,
    payableAmount,
    authoritativePayableAmount: bookingAttempt?.authoritativePayableAmount,
  }), [
    bookingAttempt?.authoritativePayableAmount,
    bookingAttempt?.heldSeatNames,
    bookingAttempt?.pricingPreview,
    bookingAttempt?.pricingPreviewStatus,
    currentSeatHold,
    holdRemainingMs,
    passengerAssignmentsMatch,
    payableAmount,
    seats,
    tripIdentityMatches,
  ]);
  const paymentReady = !isBus || busPrePaymentValidation.valid;

  useEffect(() => {
    if (!isBus) return;
    console.log('[BusCheckout] Pre-payment validation', {
      attemptId: bookingAttempt?.attemptId,
      valid: busPrePaymentValidation.valid,
      reason: busPrePaymentValidation.reason,
      seats,
      pricingPreviewStatus: bookingAttempt?.pricingPreviewStatus,
    });
  }, [
    bookingAttempt?.attemptId,
    bookingAttempt?.pricingPreviewStatus,
    busPrePaymentValidation.reason,
    busPrePaymentValidation.valid,
    isBus,
    seats,
  ]);

  const navigateToSeatSelection = useCallback(() => {
    console.log('[BusCheckout] Returning to seat selection', {
      attemptId: bookingAttempt?.attemptId,
      seats: bookingAttempt?.heldSeatNames || seats,
    });
    bypassBackGuardRef.current = true;
    setLeaveDialogVisible(false);
    navigation.popTo(
      bookingAttempt?.seatSelectionRouteName || 'SeaterSleeper2Plus1Standard',
      {
        ...(bookingAttempt?.resumeParams || {}),
        bookingAttempt,
        selectedSeats: bookingAttempt?.heldSeatNames || seats,
        selectedSeatDetails: bookingAttempt?.heldSeatDetails || [],
        seatNumber: (bookingAttempt?.heldSeatNames || seats).join(', '),
      }
    );
    requestAnimationFrame(() => {
      bypassBackGuardRef.current = false;
    });
  }, [bookingAttempt, navigation, seats]);

  const handleReviewBack = useCallback(() => {
    if (status === 'idle' && holdValid) {
      setLeaveDialogVisible(true);
      return;
    }
    navigateToSeatSelection();
  }, [holdValid, navigateToSeatSelection, status]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (bypassBackGuardRef.current || status !== 'idle' || !holdValid) return;
      event.preventDefault();
      setLeaveDialogVisible(true);
    });
    return unsubscribe;
  }, [holdValid, navigation, status]);

  useEffect(() => {
    if (!isBus) return undefined;

    const syncRemainingTime = () => {
      setHoldRemainingMs(getBusSeatHoldRemainingMs(currentSeatHold.expiresAt));
    };

    syncRemainingTime();
    const timer = setInterval(syncRemainingTime, 1000);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') syncRemainingTime();
    });

    return () => {
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [currentSeatHold.expiresAt, isBus]);

  const fareRows = useMemo(() => {
    const rows = [];
    if (fare.subtotal !== undefined) rows.push(['Seat / Base Fare', money(fare.subtotal)]);
    if (Number(fare.autoDiscountAmount) > 0) {
      rows.push([fare.autoDiscountLabel || 'Automatic discount', `-${money(fare.autoDiscountAmount)}`]);
    }
    if (Number(fare.couponAmount) > 0) {
      rows.push([fare.couponLabel || 'Coupon discount', `-${money(fare.couponAmount)}`]);
    }
    if (Number(fare.gstAmount) > 0) {
      rows.push(['Operator GST', money(fare.gstAmount)]);
    }
    if (Number(fare.convenienceFee) > 0) rows.push(['Convenience fee', money(fare.convenienceFee)]);
    return rows;
  }, [fare]);

  const handlePayPress = async () => {
    if (payPressRef.current || loading) return;
    payPressRef.current = true;

    // Re-read the absolute expiry at tap time so a stale displayed second can
    // never open Cashfree at the hold boundary.
    const liveValidation = isBus ? validateBusPrePayment({
      seatHold: currentSeatHold,
      currentSeats: seats,
      heldSeatNames: bookingAttempt?.heldSeatNames,
      tripIdentityMatches,
      passengerAssignmentsMatch,
      pricingPreview: bookingAttempt?.pricingPreview,
      pricingPreviewStatus: bookingAttempt?.pricingPreviewStatus,
      payableAmount,
      authoritativePayableAmount: bookingAttempt?.authoritativePayableAmount,
      now: Date.now(),
    }) : { valid: true, reason: null };
    if (isBus && !liveValidation.valid) {
      payPressRef.current = false;
      if (liveValidation.reason === 'hold_expired') {
        setHoldRemainingMs(0);
        Alert.alert('Seat reservation expired', EXPIRED_SEAT_HOLD_MESSAGE);
      } else {
        const validationMessages = {
          seat_mismatch: 'The selected seats no longer match your active reservation. Please return to seat selection.',
          trip_mismatch: 'The trip details no longer match this reservation. Please return to seat selection.',
          passenger_mismatch: 'The passenger and seat assignments changed. Please review the booking again.',
          pricing_not_live: 'Unable to verify the latest fare for this reservation. Please review the booking again.',
          amount_mismatch: 'The payable amount changed after fare verification. Please review the booking again.',
        };
        Alert.alert('Checkout needs review', validationMessages[liveValidation.reason] || 'Please review this reservation again.');
      }
      return;
    }

    let tokenToUse = authToken;
    if (!tokenToUse) {
      tokenToUse = await getStoredAuthToken().catch(() => '');
      if (tokenToUse) setAuthToken(tokenToUse);
    }

    if (!tokenToUse || !bookingDetails || !customerDetails || payableAmount <= 0) {
      payPressRef.current = false;
      Alert.alert('Checkout unavailable', 'Required booking or session details are missing.');
      return;
    }
    if (!customerDetails.phone || !customerDetails.name || !customerDetails.email) {
      payPressRef.current = false;
      Alert.alert('Missing contact details', 'Name, mobile number, and email are required.');
      return;
    }

    const customerId = String(customerDetails.id || customerDetails.phone).replace(/[^a-zA-Z0-9_-]/g, '');
    await startPayment({
      orderAmount: payableAmount,
      orderCurrency: 'INR',
      customerId,
      customerPhone: customerDetails.phone,
      customerName: customerDetails.name,
      customerEmail: customerDetails.email,
      bookingType: effectiveBookingType,
      couponCode: customerDetails.couponCode || null,
      promotionId: null,
      returnUrl: 'https://api.picknbook.com/return',
      bookingPayloadJson: JSON.stringify(bookingDetails),
    });
  };

  if (status === 'success') {
    return (
      <BookingConfirmationScreen
        orderId={orderId}
        bookingId={verificationResult?.bookingReferenceId || verificationResult?.BookingReferenceId}
      />
    );
  }
  if (status === 'failed') {
    return <BookingFailureScreen error={error} orderId={orderId} onRetry={reset} />;
  }
  if (['booking_pending', 'payment_pending', 'booking_failed', 'verification_error', 'cancelled'].includes(status)) {
    return (
      <StatusScreen
        status={status}
        error={error}
        checking={status === 'verifying'}
        onCheck={recheckPayment}
        onBack={reset}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleReviewBack} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Review Booking</Text>
          <Text style={styles.headerSubtitle}>Check your trip details before payment.</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 126 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {isBus ? (
          <>
            <LinearGradient colors={['#D7192D', '#B40E22', '#171827']} style={styles.tripCard}>
              <View style={styles.tripTopRow}>
                <View style={styles.busIcon}><MaterialCommunityIcons name="bus" size={22} color="#FFFFFF" /></View>
                <View style={[styles.seatPill, !holdValid && styles.seatPillExpired]}>
                  <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.seatPillText}>{formatBusSeatHoldTime(holdRemainingMs)}</Text>
                </View>
              </View>
              <Text style={styles.tripEyebrow}>YOUR TRIP</Text>
              <Text style={styles.operatorName} numberOfLines={1}>{reviewDetails.operatorName || 'Bus operator'}</Text>
              <Text style={styles.routeText} numberOfLines={1}>
                {reviewDetails.fromCity || 'Origin'} → {reviewDetails.toCity || 'Destination'}
              </Text>
              <View style={styles.pointPanel}>
                <View style={styles.pointBlock}>
                  <Text style={styles.pointLabel}>BOARDING</Text>
                  <Text style={styles.pointName} numberOfLines={2}>{reviewDetails.boardingPoint?.name || 'Not selected'}</Text>
                  {!!reviewDetails.boardingPoint?.time && <Text style={styles.pointTime}>{reviewDetails.boardingPoint.time}</Text>}
                </View>
                <Ionicons name="arrow-forward" size={18} color="#FECDD3" />
                <View style={[styles.pointBlock, styles.pointBlockRight]}>
                  <Text style={styles.pointLabel}>DROPPING</Text>
                  <Text style={styles.pointName} numberOfLines={2}>{reviewDetails.droppingPoint?.name || 'Not selected'}</Text>
                  {!!reviewDetails.droppingPoint?.time && <Text style={styles.pointTime}>{reviewDetails.droppingPoint.time}</Text>}
                </View>
              </View>
              <View style={styles.tripMeta}>
                <View style={styles.metaItem}><Ionicons name="calendar-outline" size={15} color="#FFE4E6" /><Text style={styles.metaText}>{reviewDetails.journeyDate || 'Date unavailable'}</Text></View>
                <View style={styles.metaItem}><MaterialIcons name="event-seat" size={16} color="#FFE4E6" /><Text style={styles.metaText}>{seats.join(', ') || 'No seats'}</Text></View>
              </View>
              {!holdValid ? (
                <Text style={styles.tripHoldError}>
                  {holdExpired
                    ? EXPIRED_SEAT_HOLD_MESSAGE
                    : 'Unable to verify the seat reservation. Please try booking again.'}
                </Text>
              ) : null}
            </LinearGradient>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}><Ionicons name="people-outline" size={19} color="#C9152B" /></View>
                <View><Text style={styles.sectionTitle}>Passenger Details</Text><Text style={styles.sectionSubtitle}>Travelers assigned to this booking</Text></View>
              </View>
              {passengers.map((passenger, index) => (
                <View key={`${passenger.seatNumber}-${index}`} style={styles.passengerRow}>
                  <View style={styles.passengerNumber}><Text style={styles.passengerNumberText}>{index + 1}</Text></View>
                  <View style={styles.passengerCopy}>
                    <Text style={styles.passengerName} numberOfLines={1}>{passenger.fullName}</Text>
                    <Text style={styles.passengerMeta}>{passenger.gender} · Age {passenger.age}</Text>
                  </View>
                  <View style={styles.passengerSeat}><Text style={styles.passengerSeatText}>Seat {passenger.seatNumber}</Text></View>
                </View>
              ))}
              <View style={styles.cardDivider} />
              <DetailRow label="Mobile" value={reviewDetails.contact?.phone || customerDetails?.phone} />
              <DetailRow label="Email" value={reviewDetails.contact?.email || customerDetails?.email} />
            </View>
          </>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}><MaterialCommunityIcons name="receipt-text-outline" size={19} color="#C9152B" /></View>
            <View><Text style={styles.sectionTitle}>Fare Summary</Text><Text style={styles.sectionSubtitle}>Amount used for payment</Text></View>
          </View>
          {fareRows.map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
          <View style={styles.cardDivider} />
          <DetailRow label="Total Payable" value={money(payableAmount)} accent />
          <Text style={styles.amountNote}>The payment order uses this exact payable amount.</Text>
        </View>
      </ScrollView>

      <View style={[styles.payBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View>
          <Text style={styles.payLabel}>TOTAL PAYABLE</Text>
          <Text style={styles.payAmount}>{money(payableAmount)}</Text>
        </View>
        <TouchableOpacity style={[styles.payButton, (loading || !paymentReady) && styles.payButtonDisabled]} onPress={handlePayPress} disabled={loading || !paymentReady}>
          {loading ? (
            <><ActivityIndicator color="#FFFFFF" size="small" /><Text style={styles.payButtonText}>{status === 'verifying' ? 'Verifying' : 'Please wait'}</Text></>
          ) : (
            <><Text style={styles.payButtonText}>Pay Now</Text><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={leaveDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLeaveDialogVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.leaveDialog}>
            <View style={styles.leaveDialogIcon}>
              <Ionicons name="time-outline" size={24} color="#C9152B" />
            </View>
            <Text style={styles.leaveDialogTitle}>Leave checkout?</Text>
            <Text style={styles.leaveDialogText}>
              Your selected {seats.length === 1 ? 'seat is' : 'seats are'} reserved for {formatBusSeatHoldTime(holdRemainingMs)}. Going back may affect availability or fare.
            </Text>
            <TouchableOpacity style={styles.leavePrimary} onPress={() => setLeaveDialogVisible(false)}>
              <Text style={styles.leavePrimaryText}>Continue booking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.leaveSecondary} onPress={navigateToSeatSelection}>
              <Text style={styles.leaveSecondaryText}>Back to seat selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F2', marginRight: 12 },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#0F172A', fontSize: 21, fontWeight: '800' },
  headerSubtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  tripCard: { borderRadius: 24, padding: 18, overflow: 'hidden' },
  tripTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  busIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  seatPill: { minWidth: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
  seatPillExpired: { backgroundColor: 'rgba(15,23,42,0.34)' },
  seatPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  tripEyebrow: { color: '#FECDD3', fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
  operatorName: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 4 },
  routeText: { color: '#FFE4E6', fontSize: 15, fontWeight: '600', marginTop: 3 },
  pointPanel: { flexDirection: 'row', alignItems: 'center', marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)' },
  pointBlock: { flex: 1 },
  pointBlockRight: { alignItems: 'flex-end' },
  pointLabel: { color: '#FDA4AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  pointName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 3 },
  pointTime: { color: '#FFE4E6', fontSize: 12, marginTop: 2 },
  tripMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 100 },
  metaText: { color: '#FFE4E6', fontSize: 12, fontWeight: '600', flexShrink: 1 },
  tripHoldError: { color: '#FFFFFF', fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.28)' },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E7EAF0', shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  sectionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F2' },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { color: '#64748B', fontSize: 11, marginTop: 2 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  passengerNumber: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F2' },
  passengerNumberText: { color: '#C9152B', fontSize: 12, fontWeight: '800' },
  passengerCopy: { flex: 1, marginHorizontal: 10 },
  passengerName: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  passengerMeta: { color: '#64748B', fontSize: 11, marginTop: 2 },
  passengerSeat: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F5F9' },
  passengerSeatText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#CBD5E1', marginVertical: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingVertical: 6 },
  detailLabel: { color: '#64748B', fontSize: 13, flex: 1 },
  detailValue: { color: '#0F172A', fontSize: 13, fontWeight: '700', flex: 1.35, textAlign: 'right' },
  accentText: { color: '#C9152B', fontSize: 17, fontWeight: '900' },
  amountNote: { color: '#94A3B8', fontSize: 10, lineHeight: 15, marginTop: 6 },
  payBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -5 }, elevation: 14 },
  payLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  payAmount: { color: '#0F172A', fontSize: 21, fontWeight: '900', marginTop: 2 },
  payButton: { minWidth: 154, height: 54, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D7192D' },
  payButtonDisabled: { opacity: 0.7 },
  payButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.48)' },
  leaveDialog: { borderRadius: 24, padding: 22, backgroundColor: '#FFFFFF' },
  leaveDialogIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F2' },
  leaveDialogTitle: { color: '#0F172A', fontSize: 22, fontWeight: '900', marginTop: 16 },
  leaveDialogText: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  leavePrimary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D7192D' },
  leavePrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  leaveSecondary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  leaveSecondaryText: { color: '#C9152B', fontSize: 14, fontWeight: '800' },
  statePage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F8FAFC' },
  stateIcon: { width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F2' },
  stateTitle: { color: '#0F172A', fontSize: 23, fontWeight: '900', textAlign: 'center', marginTop: 20 },
  stateText: { color: '#64748B', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 24 },
  statePrimary: { width: '100%', minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D7192D' },
  statePrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  stateSecondary: { width: '100%', minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  stateSecondaryText: { color: '#C9152B', fontSize: 15, fontWeight: '700' },
});

export default CheckoutScreen;
