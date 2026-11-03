# Hotel Pre-Live Targeted Fix Report

**Date:** 2026-11-03  
**Scope:** Only B1, H1–H4, M2, M3, M4, M6, and L1 from `HOTEL_FINAL_PRODUCTION_AUDIT.md`. No live payment, native rebuild, commit, or push was performed.

## Results

### B1 — PASS

- **Files changed:** `src/screens/HotelPassengerDetailsScreen.jsx`
- **What changed:** BlockRoom rooms are matched to the originally selected rooms by exact `RoomIndex + RoomTypeCode`; the selected `OptionId` is then preserved as immutable booking identity. Array-index matching and inference are not used.
- **Evidence:** A local representative case retained `OPT-123` when BlockRoom omitted `OptionId`; an identity mismatch failed closed. Every final room is revalidated for all three identifiers before Checkout.
- **Remaining risk:** Ambiguous duplicate provider identities fail closed and require room reselection rather than guessing.

### H1 — PASS

- **Files changed:** `src/services/hotelService.js`, `src/screens/dashboard/bottomTabScreens/HotelSearchResultsScreen.jsx`, `src/screens/dashboard/bottomTabScreens/HotelOfferDetailsScreen.jsx`, `src/screens/HotelPassengerDetailsScreen.jsx`
- **What changed:** `resultIndex` and `hotelCode` now normalize only from their own casing variants. Required identifiers are checked independently at critical boundaries.
- **Evidence:** No reciprocal fallback remains in the booking path; missing identifiers produce a safe session error.
- **Remaining risk:** M1 trace-ID numeric normalization remains intentionally deferred.

### H2 — PASS

- **Files changed:** `src/screens/HotelPassengerDetailsScreen.jsx`
- **What changed:** Added authoritative pricing validity plus a monotonically increasing request sequence. Apply/remove immediately clears the old payable preview; only the latest successful preview can restore checkout. Invalid coupons clear the active coupon and trigger a fresh no-coupon preview.
- **Evidence:** Continue requires `pricingStatus === "valid"`, a current preview, and no active validation. Older async responses cannot commit after a newer request.
- **Remaining risk:** Backend/network failure intentionally leaves checkout disabled until pricing can be refreshed.

### H3 — PASS

- **Files changed:** `src/screens/HotelPassengerDetailsScreen.jsx`
- **What changed:** BlockRoom now requires finite `ErrorCode === 0`, `AvailabilityType === "Confirm"`, `canProceedToBook === true`, and a nonempty blocked-room list.
- **Evidence:** Missing or negative success fields, API failure, identity mismatch, and absent `OptionId` all stop pricing and Checkout.
- **Remaining risk:** None identified in the requested mobile gate.

### H4 — PASS

- **Files changed:** `src/screens/dashboard/bottomTabScreens/BookingsScreen.jsx`
- **What changed:** Added explicit Hotel normalization and Pending/Failed tabs while preserving a useful backend status label.
- **Evidence:** Targeted cases map Confirmed/Booked→Upcoming, Pending→Pending, Failed/Payment Failed→Failed, Completed→Past, and Cancelled→Cancelled.
- **Remaining risk:** Unknown statuses are shown as Pending, which is deliberately fail-safe rather than inventing confirmation.

### M2 — PASS

- **Files changed:** `src/screens/HotelPassengerDetailsScreen.jsx`
- **What changed:** Removed position-derived RoomIndex behavior. Final payload identifiers come only from validated provider room identity.
- **Evidence:** No `${index + 1}`/array-position RoomIndex fallback remains in this path.
- **Remaining risk:** Missing provider identity stops Checkout.

### M3 — PASS

- **Files changed:** `src/screens/CheckoutScreen.js`
- **What changed:** Hotel presentation remembers a durable `booking_pending` state while a subsequent verification request temporarily reports `verifying`.
- **Evidence:** The confirming screen remains selected and shows its loading state; the review/pay UI is not rendered between Hotel fulfillment polls.
- **Remaining risk:** Payment/fulfillment polling logic itself was intentionally unchanged.

### M4 — PASS

- **Files changed:** `src/screens/dashboard/bottomTabScreens/HotelBookingConfirmationScreen.jsx`
- **What changed:** Added backend `providerBookingId`/`srdvBookingId` and `paymentReference` when present, without generated fallbacks.
- **Evidence:** Both are conditionally rendered alongside existing authoritative references and payment details.
- **Remaining risk:** Fields remain hidden when the backend does not return them.

### M6 — PASS

- **Files changed:** `src/services/hotelService.js`, `src/screens/dashboard/bottomTabScreens/BookingsScreen.jsx`
- **What changed:** Cancellation quote/cancel URLs require the Pick&Book internal `bookingId`. Provider IDs are display-only; cancellation is blocked with a safe message when the internal ID is absent.
- **Evidence:** The cancellation service no longer reads `providerBookingId` as an ID fallback.
- **Remaining risk:** Historical records without internal IDs require support rather than unsafe cancellation.

### L1 — PASS

- **Files changed:** `src/context/HotelBookingContext.js`
- **What changed:** `setSelectedHotel` now clears the context `passengers` array with other hotel-scoped state.
- **Evidence:** Switching hotels resets passengers, rooms, block result, and pricing.
- **Remaining risk:** None identified.

## Regression and Validation

- Hotel map visuals and marker/card selection behavior were not modified; only the invalid identifier fallback was removed from the results selection boundary.
- `useCashfreePayment.js` was not changed for these fixes. The M3 presentation guard is Hotel-only, so Bus and Flight semantics remain unchanged.
- Babel parsing passed for all eight files changed by this targeted pass.
- Targeted local scenarios passed for OptionId preservation, identity mismatch fail-closed, BlockRoom positive gates, pricing request validity/race guards, Hotel status mapping, internal cancellation ID, and stable polling presentation.
- `git diff --check` passed (the only output was Git's existing LF→CRLF working-copy warning for `HotelSearchResultsScreen.jsx`).

## Deferred Audit Notes

M1 (trace-ID safe-integer normalization), M5 (refund tracking presentation), L2 (obsolete throwing exports), and L3 (duplicate confirmation route registration) remain deferred exactly as requested.

# READY FOR FINAL READ-ONLY RE-AUDIT

This is a re-audit readiness statement, not authorization or a declaration that the app is ready for a real payment.
