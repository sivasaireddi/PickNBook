# Pick&Book Hotel Final Pre-Live Re-Audit

**Date:** 2026-11-03  
**Scope:** Read-only verification of the targeted fix set in the current working tree. No application source was changed, no native build or live payment was run, and no commit or push was performed.

## Targeted Findings

| Finding | Result | Verified source evidence |
|---|---|---|
| B1 — Preserve exact OptionId | **PASS** | `HotelPassengerDetailsScreen.jsx` matches BlockRoom rooms to selected rooms by exact `RoomIndex + RoomTypeCode`, requires one unambiguous selected `OptionId`, and explicitly restores that identity into the merged room and final create-order room payload. No array-position matching is used. Missing/mismatched/ambiguous identity throws before pricing or Checkout. A local representative `OPT-123` scenario passed. |
| H1 — Independent resultIndex/hotelCode | **PASS** | Search normalization, results navigation, details, passenger flow, Hotel Info, Rooms, and BlockRoom normalize each identifier only from its own casing variants. Required boundaries fail closed. `resultIndex` remains a string, so composite values such as `60_100000030851` are not parsed or reconstructed. |
| H2 — No stale coupon pricing | **PASS** | Every pricing request immediately sets pricing to loading and clears local/context previews. A monotonically increasing request sequence prevents stale responses from committing. Invalid and removed coupons cannot reuse the old preview; both require a successful fresh no-coupon preview. Continue requires valid current pricing, a preview, and no validation in progress; Checkout amount comes only from `pricingPreview.finalTotal`. |
| H3 — Positive BlockRoom success | **PASS** | The gate requires finite `ErrorCode === 0`, `AvailabilityType === "Confirm"`, `canProceedToBook === true`, and a nonempty blocked-room array before merge/pricing. Missing fields, false/nonzero values, empty rooms, identity mismatch, and missing/ambiguous OptionId all fail closed. |
| H4 — Hotel status normalization | **PASS** | Confirmed/Booked/Upcoming map to Upcoming; Pending/Pending_Reconciliation to Pending; Failed/Payment Failed/Failed_SupplierError to Failed; Past/Completed to Past; Cancelled/Partially Cancelled to Cancelled. Unknown status defaults to Pending, never Upcoming. Targeted status cases passed. |
| M2 — No synthetic RoomIndex | **PASS** | Final room identifiers come from validated provider identity. No array-position-generated `RoomIndex` fallback exists; a missing RoomIndex blocks Checkout. |
| M3 — Stable paid/confirming UI | **PASS** | `CheckoutScreen.js` keeps a Hotel-only durable `booking_pending` presentation while polling temporarily reports `verifying`. The StatusScreen remains mounted with confirming copy/loading; review and Pay UI are not rendered between Hotel fulfillment polls. Polling logic itself is unchanged. |
| M4 — Confirmation references | **PASS** | The confirmed Hotel screen renders backend `bookingReference`, `confirmationNo`, `providerBookingId` or `srdvBookingId`, and `paymentReference` when present. No generated reference is used. |
| M6 — Internal cancellation ID | **PASS** | Booking history stores `item.bookingId` as the cancellation ID and does not substitute `providerBookingId`. Quote/cancel endpoints receive that internal ID; missing internal ID makes cancellation unavailable. For `381` and provider `10098234`, paths resolve to `/api/Hotels/bookings/381/cancellation-quote` and `/api/Hotels/bookings/381/cancel`. |
| L1 — Clear Hotel passenger context | **PASS** | `setSelectedHotel()` clears passengers, selected rooms, blocked result, pricing preview, Hotel info, and available rooms. |

## Final Payment Gates

**Payment state machine: PASS**

- Verification classifies the response body, not HTTP success alone.
- Pending payment continues polling.
- Successful payment with Hotel fulfillment Pending, InProgress, Pending_Reconciliation, or another nonterminal value remains booking-pending and continues polling.
- Successful payment plus fulfillment Success is the only Hotel payment state classified as success.
- Failed/Cancelled payment stops without confirmation.
- Successful payment plus Failed_SupplierError becomes booking-failed/refund-initiated and stops.

**Booking correlation: PASS**

The active order ID is verified through `GET /api/cashfree/orders/{orderId}/payments`; its `bookingReferenceId` is passed directly to `GET /api/Hotels/bookings/{bookingReferenceId}`. No latest booking, `my-bookings[0]`, hotel-name, or date matching is used.

**Final confirmation gate: PASS**

The Hotel confirmation component is reached only after payment Success, fulfillment Success, the correlated booking fetch, and reservation status Confirmed or Booked. Empty/other reservation status throws and leaves the user on the confirming screen. No `status || "Booked"` or `status ?? "Confirmed"` fallback exists in this path.

## Shared Payment Regression

- **Bus regression risk: NONE.** The new durable confirming presentation is guarded by `isHotel`; Bus classification, fulfillment requirement, review UI, and confirmation path are unchanged by this targeted pass.
- **Flight regression risk: NONE.** The Hotel presentation and correlated Hotel lookup are guarded by `isHotel`; Flight continues to use its existing non-Hotel success semantics.

## Deferred Items

M1 (theoretical trace-ID safe-integer risk), M5 (refund tracking presentation), L2 (obsolete throwing direct-booking exports), and L3 (duplicate confirmation route registration) remain deferred. No reachable live-payment correctness blocker was found from these deferred items in this targeted re-audit.

## Validation

- Targeted source inspection completed for the ten permitted files.
- Targeted local/static cases passed for OptionId preservation/fail-closed identity, Hotel status normalization, synthetic RoomIndex absence, and payment/fulfillment classification.
- Babel parsing passed for all ten inspected JavaScript/JSX files.
- `git diff --check` passed; the only output was Git's existing LF-to-CRLF working-copy warning for `HotelSearchResultsScreen.jsx`.

## Remaining Live-Test Blockers

**BLOCKER: 0**  
**HIGH: 0**

# READY FOR ONE MANUAL LIVE HOTEL BOOKING TEST
