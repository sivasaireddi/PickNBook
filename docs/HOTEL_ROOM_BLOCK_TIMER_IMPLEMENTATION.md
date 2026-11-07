# Hotel Room Block Timer Implementation

Date: 2026-11-07

## Scope and files

- `src/context/HotelBookingContext.js` — memory-only Hotel hold expiry and successful BlockRoom request snapshot.
- `src/utils/hotelRoomBlock.js` — pure absolute-time helpers plus the existing shared room/rate correlation and pricing-input logic.
- `src/screens/HotelPassengerDetailsScreen.jsx` — starts the hold immediately after a validated successful BlockRoom response, before pricing-preview.
- `src/screens/CheckoutScreen.js` — Hotel-only timer UI, AppState sync, payment guard, explicit recheck, refreshed pricing, and room-selection recovery.
- `src/services/hotelService.js` — preserves BlockRoom supplier error codes needed for customer-safe recovery.

No Bus, Flight, supplier booking-payload, Cashfree contract/reconciliation, cancellation, or refund behavior was changed.

## Implementation results

1. **Timer start:** PASS — `setSuccessfulBlockHold(blockRoomPayload)` runs immediately after successful BlockRoom response validation/correlation and before `pricing-preview`.
2. **State ownership:** `blockExpiresAtMs` and `successfulBlockRequestSnapshot` live only in `HotelBookingContext`; neither is persisted.
3. **Checkout mount:** PASS — Checkout reads the existing absolute expiry and never manufactures or resets it on mount.
4. **Pricing-preview:** PASS — pricing calls do not update the expiry.
5. **Coupons:** PASS — applying/removing coupons only refreshes pricing and does not update the expiry.
6. **Background/resume:** PASS by pure absolute-time validation and AppState implementation — an 08:30 hold resumed 60 seconds later derives 07:30.
7. **Back/forward:** PASS by state-flow/static validation — Checkout back/forward retains the context timestamp and does not call BlockRoom; 07:40 plus 20 elapsed seconds derives 07:20.
8. **Normal state:** PASS — `> 120s`, calm green/neutral card, Pay available when pricing is authoritative.
9. **Warning state:** PASS — `31–120s`, amber card, Pay remains available.
10. **Critical state:** PASS — `1–30s`, red card, Pay disabled, Recheck Room visible.
11. **Expired state:** PASS — `0s`, red expired state, Pay disabled, Recheck Room visible.
12. **Pay runtime guard:** PASS — the Hotel handler recalculates from `blockExpiresAtMs` immediately before create-order and returns without payment when `<= 30s`, pricing is not fresh, or recheck is active.
13. **Recheck Room:** Uses the preserved successful BlockRoom request snapshot and the existing `blockHotelRoom` service; it is invoked only by explicit user action.
14. **Successful recheck reset:** PASS — a new 10-minute expiry is created only after the new BlockRoom response is successfully validated.
15. **Pricing refresh:** PASS — every successful re-block is followed by `pricing-preview` using newly blocked authoritative rooms and the current coupon.
16. **Price change:** PASS — fare rows, Total Payable, Cashfree amount, and booking payload `Price` update together; a review notice is displayed and payment is not auto-started.
17. **`TRACE_ID_EXPIRED`:** PASS — shows the expired-search message and `Choose Room Again`, returning through the existing `HotelOfferDetails` route.
18. **Supplier unavailable:** PASS — `SUPPLIER_ERROR_101`/unavailable response shows the customer-safe unavailable message and the same room-selection action.
19. **Missing expiry:** PASS — timer shows verification required, Pay is disabled, and no artificial timestamp is created.
20. **Cashfree cancel/dismiss:** PASS by state-flow/static validation — reset returns to Review while the same context expiry continues and is recalculated by the running interval/AppState sync.
21. **Payment success:** PASS — clears the pre-payment Hotel hold while existing Hotel confirmation/reconciliation continues unchanged.
22. **Multi-room:** PASS — one expiry and one card are held for the entire BlockRoom request.
23. **Bus regression:** PASS static/Babel — existing Bus timer and validation remain guarded by `isBus`; no Bus code was changed.
24. **Flight regression:** PASS static/Babel — Hotel behavior is guarded by `isHotel`; no Flight code was changed.

## Validation

Pure helper checks passed:

- Initial checkout after three seconds: `09:57`.
- Ordinary countdown: `09:55`.
- Warning at 119 seconds: `01:59`.
- Critical at 30 seconds: `00:30`.
- Expired: `00:00`.
- Missing expiry: fail-closed.
- Background elapsed-time case: `07:30`.
- Back/forward elapsed-time case: `07:20`.

Babel syntax validation: **PASS** for all five changed JS/JSX source files.

`git diff --check`: **PASS**.

Temporary diagnostics added by this task: **NO**.

Physical no-payment validation: **BLOCKED** — the standard Android SDK ADB executable was found, but `adb devices` returned no connected devices at validation time. No Android rebuild, payment, Hotel booking, cancellation, or refund was performed.

Remaining blocker: reconnect/authorize an Android device, then run the fresh Hotel flow and background/back-forward checks without pressing Pay Now.
