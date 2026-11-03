# Pick&Book Mobile Hotel Booking — Final Production Audit

**Audit date:** 2026-11-03  
**Scope:** Current mobile Hotel booking flow plus shared Cashfree code required to verify payment behavior.  
**Method:** Read-only source and current-diff inspection. No live payment, API mutation, code fix, commit, or push was performed.

## Executive Verdict

# NOT READY FOR MANUAL LIVE TEST

The primary production sequence is present: search, info, rooms, block, pricing, guest payload, Cashfree order creation, SDK checkout, payment/fulfillment polling, correlated booking fetch, and confirmation gating. The mobile no longer calls provider `/BookRoom`, no supplier credentials remain, `finalTotal` is used as the payable amount, and the Cashfree result is correlated through `bookingReferenceId`.

However, one live-test blocker remains: the selected room's `OptionId` can be lost when the BlockRoom response replaces the originally selected room object. The authoritative BlockRoom response documented for this audit does not echo `OptionId`, yet the create-order booking payload is constructed from that response. This can produce an empty `OptionId` for the exact rate option being booked.

Finding totals:

| Severity | Count |
|---|---:|
| BLOCKER | 1 |
| HIGH | 4 |
| MEDIUM | 6 |
| LOW | 3 |

## Production Flow

The current mobile path is:

```text
HotelsScreen
  -> GET /api/Places (city autocomplete)
  -> POST /api/Hotels/SearchHotels
  -> HotelBookingContext.setSearchSession
  -> HotelSearchResultsScreen
  -> HotelOfferDetailsScreen
       -> GET /api/Hotels/GetHotelInfo
       -> GET /api/Hotels/rooms
       -> select room/rate option
  -> HotelPassengerDetailsScreen
       -> POST /api/Hotels/BlockRoom
       -> POST /api/Hotels/pricing-preview
       -> validate and map guests per room
  -> CheckoutScreen
       -> POST /api/cashfree/create-order
       -> Cashfree production SDK
       -> GET /api/cashfree/orders/{orderId}/payments
          every 5 seconds, maximum 24 attempts
       -> require payment Success + fulfillment Success
       -> GET /api/Hotels/bookings/{bookingReferenceId}
       -> require reservation status Confirmed or Booked
  -> HotelBookingConfirmationScreen
```

Provider fulfillment is backend-owned. `bookHotelOffer`/`bookHotel` still exist as exported compatibility functions, but they only throw and cannot call `/BookRoom` (`src/services/hotelService.js`, lines 524–533).

## Requirement Matrix

| Requirement | Current implementation | File + relevant function | Result | Evidence |
|---|---|---|---|---|
| City autocomplete contract | Sends `query`, `tripType=hotel`, `field=all`, and `limit=20`. | `hotelService.js`, `searchCities`, lines 131–139 | PASS | Uses `GET /api/Places` with the required query parameters. |
| Hotel search endpoint | Sends search dates, city, room guests, nationality, room count, and related filters to the backend. | `hotelService.js`, `searchHotelOffers`, lines 155–252 | PASS | Uses `POST /api/Hotels/SearchHotels`; no supplier credentials are included. |
| Preserve `traceId` | Stored in the search result/context and forwarded through details, rooms, block, and booking payload. It is normalized to a JavaScript safe integer. | `hotelService.js`, `normalizeTraceId`, lines 20–29; `HotelBookingContext.js`, `setSearchSession` | RISK | No regeneration occurs, but numeric-string values are converted and values outside JS safe-integer range are rejected. See M1. |
| Preserve `resultIndex` verbatim | Normally forwarded, but several fallbacks substitute `hotelCode` when it is absent. | `hotelService.js`, lines 282–289, 318–325, 415–422; `HotelOfferDetailsScreen.jsx`, lines 57–61; `HotelSearchResultsScreen.jsx`, selection handler | FAIL / HIGH | A composite result index can be replaced by a different identifier. See H1. |
| Preserve `hotelCode` | Normally forwarded, but reciprocal fallbacks can substitute `resultIndex`. | Same locations as above | FAIL / HIGH | The two identifiers are treated as interchangeable in fallback branches. See H1. |
| Preserve `srdvIndex` / `srdvType` | Search values are stored and forwarded as metadata. Defaults are used only when absent. | `hotelService.js`, lines 272–288; `HotelBookingContext.js`; `HotelOfferDetailsScreen.jsx`, lines 57–61 | PASS with defaulting noted | The contract permits preserving returned values and defaults `srdvType` to `MixAPI`; `srdvIndex` defaults to `15`. |
| Different-hotel state reset | Selecting a hotel clears hotel info, rooms, selected rooms, BlockRoom response, and pricing. Passenger state is local to the passenger screen. | `HotelBookingContext.js`, `setSelectedHotel`, lines 52–63 | PASS with LOW residual risk | Old block/pricing/room state cannot enter the next hotel path. The unused context `passengers` array is not cleared here; see L1. |
| Room-change behavior | Room selection stores the same session identifiers; `setSelectedRooms` clears block/pricing; entering passenger details executes a new block and new pricing call. | `HotelOfferDetailsScreen.jsx`, `handleSelectRoomForSlot` and `handleContinue`, lines 214–275; `HotelBookingContext.js`, lines 72–79; `HotelPassengerDetailsScreen.jsx`, `executeBlockRoom` | PASS | No active BlockRoom response is reused after `setSelectedRooms`. |
| Preserve `RoomIndex`, `RoomTypeCode`, `OptionId` through BlockRoom | Block request maps all three and rejects empty values. | `hotelService.js`, `blockHotelRoom`, lines 415–448 | PASS for BlockRoom | The block request is strict and uses the selected room data. |
| Preserve `OptionId` through create-order | Create-order room data is rebuilt from BlockRoom rooms, which may not contain `OptionId`. | `HotelPassengerDetailsScreen.jsx`, lines 145–147, 301–304, 425–438 | FAIL / BLOCKER | The documented BlockRoom response omits `OptionId`, so the final payload can contain `OptionId: ""`. See B1. |
| Mandatory BlockRoom before payment | Passenger screen blocks on entry; a thrown block error renders an error-only screen. | `HotelPassengerDetailsScreen.jsx`, lines 104–180 and 516–540 | PASS with HIGH validation gap | HTTP/API failures stop checkout, but the response gate does not require success fields to be present. See H3. |
| BlockRoom success semantics | Rejects nonzero error, explicit `canProceedToBook=false`, and a present availability value other than `Confirm`. | `HotelPassengerDetailsScreen.jsx`, lines 131–140 | RISK / HIGH | Missing `availabilityType` and missing `canProceedToBook` both pass. See H3. |
| Trace expiry | Converts HTTP 410 or `TRACE_ID_EXPIRED` into `isTraceExpired`, shows the required customer message, and does not render checkout. | `hotelService.js`, `toHotelFlowError`, lines 31–40; `HotelOfferDetailsScreen.jsx`, lines 197–208; `HotelPassengerDetailsScreen.jsx`, lines 175–184 | PASS | Expired sessions return to room selection/details and cannot create an order from the error state. |
| Backend pricing authority | Calls pricing-preview after BlockRoom and reads `finalTotal`; fare display and checkout amount use the same value. | `hotelService.js`, `getHotelPricingPreview`, lines 489–521; `HotelPassengerDetailsScreen.jsx`, lines 148–159, 366–374, 451–503 | PASS | No local formula becomes the Cashfree `orderAmount`. Local sums are display-only for the price-change notice and pricing request inputs. |
| Coupon pricing | Coupon is sent to pricing-preview and the accepted coupon plus `finalTotal` are forwarded to checkout/create-order. | `HotelPassengerDetailsScreen.jsx`, lines 245–299, 475–501 | FAIL / HIGH | Invalid/rejected coupon attempts retain the previous discounted preview; remove-coupon refresh also leaves a brief stale-payable window. See H2. |
| Create-order backend rejection | Non-2xx create-order responses throw and prevent SDK launch. | `cashfreeApi.js`, `createOrder`, lines 45–79; `useCashfreePayment.js`, `startPayment` | PASS | Coupon expiry, usage rejection, or price mismatch cannot open Cashfree. |
| Supplier credentials absent | No Hotel/Cashfree application payload contains SRDV `ClientId`, `UserName`, `Password`, `ApiToken`, or `Api-Token`. | Hotel-flow source scan | PASS | The only match is a redaction-key string in `hotelService.js`; it is not a credential or outgoing field. |
| Guest validation | Titles, names, Indian phone, email, adult/child ages, conditional PAN/passport, and pax types are validated/mapped. | `HotelPassengerDetailsScreen.jsx`, lines 306–364 and 385–438; `GuestForm.jsx` | PASS | One lead is initialized at room 0/adult 0; the UI does not expose lead mutation. Adults use PaxType `"1"`, children `"2"`. |
| Multi-room passenger mapping | Each room builds its own `HotelPassenger` array using that room's guest configuration. | `HotelPassengerDetailsScreen.jsx`, lines 385–440 | PASS | Passenger keys include room and pax indexes. |
| Create-order booking payload | Contains dates, session identifiers, hotel data, room data, guests, coupon, and authoritative price. | `HotelPassengerDetailsScreen.jsx`, lines 455–503; `CheckoutScreen.js`, lines 383–398 | PASS with identifier findings | No synthetic PNR/reference exists. A fallback room index remains; see M2. |
| Duplicate create-order protection | Checkout uses a synchronous ref before starting payment and disables the button during order/payment/verification. | `CheckoutScreen.js`, lines 113, 329–331, 383–398, 545; `useCashfreePayment.js`, `launchInProgress` | PASS | Rapid Pay taps cannot issue two create-order calls from the same mounted checkout. |
| Parse Cashfree response body | Verification reads payment and fulfillment fields from the body; HTTP 200 alone is not success. | `useCashfreePayment.js`, `classifyVerification`, lines 24–37; `cashfreeApi.js`, `verifyPayment` | PASS | `status` must normalize to success/paid before success is possible. |
| Poll every 5 seconds / max 24 | Pending and transient-error paths schedule `verifyOrder` with a 5-second timeout while attempt count is below 24. | `useCashfreePayment.js`, lines 40–41, 66–124 | PASS | The first call is immediate, followed by at most 23 delayed calls (~115 seconds plus request time). Terminal states clear the timer. |
| Payment success + fulfillment pending | Classified as `booking_pending`, not success; polling continues. | `useCashfreePayment.js`, lines 30–36, 95–107; `CheckoutScreen.js`, `StatusScreen` | PASS with UI issue | Confirmation is blocked, but the UI briefly returns to review during each `verifying` request. See M3. |
| Full success | Requires fulfillment `success`, then fetches the correlated booking and requires reservation status Confirmed/Booked. | `useCashfreePayment.js`, line 34; `CheckoutScreen.js`, lines 200–231 and 402–423 | PASS | Final Hotel confirmation is double-gated. |
| Exact booking correlation | Uses `bookingReferenceId` from this order's verification response for a single-booking GET. | `CheckoutScreen.js`, lines 200–218; `hotelService.js`, `getHotelBookingById`, lines 590–602 | PASS | No “latest booking”, hotel-name match, or `my-bookings[0]` correlation is used. |
| Final confirmation content | Uses backend booking data and does not invent confirmation/reference IDs. | `HotelBookingConfirmationScreen.jsx`, lines 42–132 | PARTIAL / MEDIUM | Provider booking ID and payment reference are not shown. See M4. |
| Shared Cashfree isolation | Hotel booking fetch and Hotel supplier-failure copy are guarded by `isHotel`; success classification requires fulfillment for Bus and Hotel only. | `useCashfreePayment.js`, lines 24–37; `CheckoutScreen.js`, lines 47–69 and 402–423 | PASS with regression risk | Auto-polling itself is shared and changes pending behavior for Bus/Flight. |
| Hotel booking history | Calls `/api/Hotels/my-bookings`. | `hotelService.js`, lines 605–624; `BookingsScreen.jsx`, line 112 | ENDPOINT PASS / PRESENTATION FAIL | Status grouping collapses all non-cancelled statuses to Upcoming. See H4. |
| Full-booking cancellation | Fetches quote, disables confirmation until quote exists, then posts reason/refund preference to the full-booking cancel endpoint. | `BookingsScreen.jsx`, lines 148–180 and 242–258; `hotelService.js`, lines 539–587 | PASS with ID risk | No room/guest selection or partial payload exists. See M6. |
| Refund authority | Displays quote fields directly; no refund formula is calculated. | `BookingsScreen.jsx`, lines 248–254 | PASS on calculation / PARTIAL on display | Several required tracking/status fields are omitted. See M5. |
| Results/map booking navigation | Selected card forwards the selected hotel's identifiers into the details route. | `HotelSearchResultsScreen.jsx`, selection handler, lines 457–510 | PASS with H1 fallback risk | Map rendering was not audited; booking navigation still has identifier substitution fallbacks. |
| Obsolete direct booking path | Direct booking exports throw; no current caller invokes them. | `hotelService.js`, lines 524–533; repository usage scan | PASS | No mobile `/BookRoom` request remains. |

## Identifier Trace

### `traceId`

```text
Search response
  -> normalizeTraceId()
  -> search result hotel.traceId + session.traceId
  -> HotelSearchResults route
  -> HotelOfferDetails targetTraceId
  -> info/rooms requests
  -> selected room slots
  -> HotelPassengerDetails targetTraceId
  -> BlockRoom TraceId
  -> bookingPayloadJson TraceId
```

No trace is regenerated. Risk: `normalizeTraceId` changes numeric strings into JavaScript numbers and rejects valid C# `long` values outside the safe-integer range (M1).

### `resultIndex`

```text
Search hotel.resultIndex
  -> normalized resultIndex
  -> selected result route payload
  -> details/rooms
  -> selected room slots
  -> BlockRoom ResultIndex
  -> bookingPayloadJson ResultIndex
```

The normal path preserves the composite string, including values such as `60_100000030851`. The path is not strict: missing values are replaced with `hotelCode` at multiple stages (H1).

### `hotelCode`

```text
Search hotel.hotelCode
  -> selected hotel route
  -> details screen
  -> BlockRoom / pricing-preview
  -> bookingPayloadJson
```

The normal path is preserved, but fallback branches replace it with `resultIndex` (H1).

### `RoomIndex`, `RoomTypeCode`, `OptionId`

```text
/api/Hotels/rooms selected room
  -> selectedRoomSlots
  -> BlockRoom HotelRoomsDetails
  -> BlockRoom response becomes authoritativeRoomList
  -> create-order HotelRoomsDetails
```

`RoomIndex` and `RoomTypeCode` are normally echoed by BlockRoom. `OptionId` is not present in the documented BlockRoom response, so it is lost when `authoritativeRoomList` switches from `selectedRoomSlots` to the BlockRoom rooms. This is B1.

### `orderId` and `bookingReferenceId`

```text
create-order response orderId
  -> Cashfree SDK CFSession
  -> verify GET /api/cashfree/orders/{orderId}/payments
  -> verification response bookingReferenceId
  -> GET /api/Hotels/bookings/{bookingReferenceId}
  -> reservation status Confirmed/Booked
  -> final confirmation screen
```

This correlation is exact and does not inspect `my-bookings` or choose a “latest” record.

## Different-Hotel and Room-Change Review

### Hotel A → Back → Hotel B

`setSelectedHotel` clears hotel info, available rooms, selected rooms, BlockRoom response, and pricing. Hotel B's selection route also carries B's own identifiers. Coupon and passenger form state live inside the unmounted Hotel A passenger screen. Therefore stale A room/block/pricing/coupon/passenger data does not currently reach B checkout.

The context `passengers` field is not cleared by `setSelectedHotel`, but the active passenger screen neither reads nor writes that context field. This is a dormant-state cleanup risk, not an active checkout mix-up (L1).

### Change room in the same hotel

The details screen replaces the selected slot with the newly selected room while retaining the same trace/result session. `setSelectedRooms` clears the previous context block and pricing. A newly mounted passenger screen calls BlockRoom and pricing-preview again. There is no reachable current path that intentionally reuses the prior BlockRoom response.

## Payment State Machine

| Backend/SDK state | Mobile classification and action | Result |
|---|---|---|
| `status=Pending` | `payment_pending`; save response; schedule next verification if attempt < 24. | PASS — no confirmation. |
| `status=Success`, fulfillment `Pending` / `InProgress` / `Pending_Reconciliation` / empty | `booking_pending`; display Hotel confirming copy; schedule next verification. | PASS — no Hotel success. UI flicker noted in M3. |
| `status=Success`, `fulfillmentStatus=Success` | Terminal `success`; stop timer; fetch `bookingReferenceId`; require Hotel status Confirmed/Booked. | PASS. |
| `status=Failed` | Terminal `failed`; stop timer; render payment failure screen. | PASS. |
| Verification body `Cancelled` / `Canceled` / `Expired` | Terminal `failed`; stop timer; never show confirmation. | PASS for safety; cancellation is presented as failure when returned by verification. |
| Cashfree SDK onError containing cancel/drop/abort | `cancelled`; no verification or confirmation. | PASS. |
| `status=Success`, fulfillment begins with `Failed` | Terminal `booking_failed`; Hotel-specific “could not be confirmed” and refund-initiated message; no mobile refund request. | PASS. |
| 24 pending/error attempts exhausted | Last pending/error state remains; no more timer, no false success, no second payment. User can manually check again or use My Bookings. | PASS. |

Polling is driven by control flow, not merely constants: `verifyOrder` increments the attempt counter, calls the authenticated verification endpoint, classifies the body, marks only terminal states processed, and schedules another timeout only for nonterminal states under the limit.

## Shared Cashfree Regression Review

### Hotel

- Fulfillment is required.
- Hotel-specific pending/failure copy is guarded by `isHotel`.
- Correlated Hotel booking lookup and Hotel confirmation screen are guarded by `isHotel`.

### Bus

**Bus regression risk: LOW.** Bus still requires fulfillment success, as it did before the latest diff. It now automatically repeats pending/error verification every five seconds rather than waiting only for a manual recheck. Hotel lookup and Hotel confirmation are not used for Bus.

### Flight

**Flight regression risk: LOW.** A successful Flight payment still becomes success without requiring Hotel/Bus fulfillment. Hotel lookup and Hotel copy are not used. A pending Flight payment now auto-polls because the timer is shared; this is a behavioral change, but it does not apply Hotel confirmation semantics.

## Findings

### B1 — `OptionId` can be lost before create-order

- **Severity:** BLOCKER
- **File:** `src/screens/HotelPassengerDetailsScreen.jsx`
- **Function / location:** `executeBlockRoom`, `authoritativeRoomList`, and `handleBookRoom`; approximately lines 145–147, 301–304, and 425–438
- **Current behavior:** After BlockRoom, the screen prefers `blockRoomResult.hotelRoomsDetails` over the originally selected room slots. The documented production BlockRoom response does not echo `OptionId`. The create-order room mapper then reads `OptionId` only from the BlockRoom room and produces an empty string.
- **Expected behavior:** The exact selected rate option's `OptionId` must survive from `/rooms` through BlockRoom and `bookingPayloadJson`.
- **Why it matters:** `OptionId` identifies the exact provider rate option. Losing it can make the paid booking payload ambiguous or invalid and can break fulfillment after payment.
- **Suggested correction:** Merge each BlockRoom room with its corresponding selected room's immutable identifiers, or carry a separate selected-rate identity object through create-order construction. Do not infer the option by index unless it is validated against `RoomIndex`/`RoomTypeCode`.

### H1 — `resultIndex` and `hotelCode` are used as reciprocal fallbacks

- **Severity:** HIGH
- **Files:** `src/services/hotelService.js`, `HotelSearchResultsScreen.jsx`, `HotelOfferDetailsScreen.jsx`, `HotelPassengerDetailsScreen.jsx`
- **Function / location:** Search normalization and identifier initialization; service lines 282–289, 318–325, 415–422; details lines 57–61
- **Current behavior:** Missing `resultIndex` falls back to `hotelCode`; missing `hotelCode` can fall back to `resultIndex`.
- **Expected behavior:** Preserve and validate each identifier independently. A composite `resultIndex` must never be reconstructed from a property code.
- **Why it matters:** The provider session is keyed by the exact result index. Substitution can query, block, or price the wrong session entry or cause backend rejection.
- **Suggested correction:** Fail closed when either required identifier is absent; remove reciprocal fallbacks throughout the route and service chain.

### H2 — Invalid or removed coupons can leave stale discounted pricing active

- **Severity:** HIGH
- **File:** `src/screens/HotelPassengerDetailsScreen.jsx`
- **Function / location:** `handleApplyCoupon` and `handleRemoveCoupon`, approximately lines 245–299
- **Current behavior:** If pricing-preview returns `isCouponValid=false` or throws, the previous `pricingPreview` and previous `appliedCoupon` remain active. Removing a coupon starts an async refresh but leaves the old preview active until it completes. The booking button is not disabled by `validatingCoupon`.
- **Expected behavior:** An invalid/rejected/removed coupon must invalidate the stale discounted payable state immediately and block checkout until a fresh authoritative no-coupon or corrected preview succeeds.
- **Why it matters:** The user can proceed with an old discounted amount/coupon after backend rejection. Create-order should reject it before payment, but the mobile behavior violates the contract and produces a failed checkout attempt.
- **Suggested correction:** Introduce a pricing-validity state, clear/disable the authoritative payable while coupon pricing is unresolved, and only re-enable checkout after a successful pricing-preview matching the active coupon input.

### H3 — BlockRoom success fields are optional in the current gate

- **Severity:** HIGH
- **File:** `src/screens/HotelPassengerDetailsScreen.jsx`
- **Function / location:** `executeBlockRoom`, approximately lines 131–140
- **Current behavior:** Explicit errors, `canProceedToBook=false`, and non-Confirm availability are rejected. If `canProceedToBook` and `availabilityType` are both missing, the response passes and the code can price the originally selected rooms.
- **Expected behavior:** Require positive proof: zero error, `AvailabilityType=Confirm`, and `canProceedToBook=true` (or the exact validated backend equivalent).
- **Why it matters:** A malformed/partial 200 response is treated as a successful hold. Backend create-order validation should prevent payment without a DB hold, but mobile can still enter checkout incorrectly.
- **Suggested correction:** Require all positive success predicates and a valid nonempty blocked-room list before pricing or guest entry.

### H4 — Hotel booking history collapses pending, failed, past, and completed into Upcoming

- **Severity:** HIGH
- **File:** `src/screens/dashboard/bottomTabScreens/BookingsScreen.jsx`
- **Function / location:** `groupHotelBookings`, lines 45–63
- **Current behavior:** Every status other than Cancelled/Partially Cancelled is assigned `status: "Upcoming"`. Pending, Failed, Payment Failed, Past, and Completed are therefore shown as upcoming reservations.
- **Expected behavior:** Normalize every backend Hotel status to the correct client tab/presentation without treating Pending as Failed or Failed as Upcoming.
- **Why it matters:** A supplier-failed/refunding or still-pending Hotel booking may be presented as an active upcoming stay.
- **Suggested correction:** Add explicit Hotel status normalization for Confirmed/Booked/Upcoming, Pending, Failed/Payment Failed, Past/Completed, Cancelled, and Partially Cancelled.

### M1 — `traceId` is coerced to a JavaScript safe integer

- **Severity:** MEDIUM
- **File:** `src/services/hotelService.js`
- **Function / location:** `normalizeTraceId`, lines 20–29
- **Current behavior:** Numeric strings become Numbers; values outside `Number.isSafeInteger` are rejected.
- **Expected behavior:** Preserve the exact backend integer semantics without precision loss.
- **Why it matters:** The backend defines a C# `long`; a valid value outside JavaScript's safe range cannot be represented exactly by this code.
- **Suggested correction:** Confirm the backend's maximum trace range. If it can exceed the JS safe range, preserve it as a canonical decimal string until serialization support is agreed with the backend.

### M2 — Create-order room mapping contains a synthetic `RoomIndex` fallback

- **Severity:** MEDIUM
- **File:** `src/screens/HotelPassengerDetailsScreen.jsx`
- **Function / location:** `handleBookRoom`, line 425
- **Current behavior:** Missing provider `RoomIndex` is replaced with `${rIdx + 1}`.
- **Expected behavior:** Missing provider identifiers must fail closed; no array-position-derived room index should enter `bookingPayloadJson`.
- **Why it matters:** It masks correlation loss and can address the wrong provider room.
- **Suggested correction:** Remove the fallback and validate the authoritative room identifiers before navigating to checkout.

### M3 — Poll requests temporarily replace the confirming screen with checkout

- **Severity:** MEDIUM
- **Files:** `src/hooks/useCashfreePayment.js`, `src/screens/CheckoutScreen.js`
- **Function / location:** `verifyOrder` sets `status='verifying'`; Checkout only renders `StatusScreen` for pending/error/cancel states
- **Current behavior:** Each scheduled poll changes `booking_pending` to `verifying`. `CheckoutScreen` falls through to the review page during the network request, then returns to the confirming screen.
- **Expected behavior:** Once payment is received, the app should remain continuously in the confirming-reservation state while background polling occurs.
- **Why it matters:** The user sees repeated navigation-like flicker during a sensitive paid-but-unconfirmed period.
- **Suggested correction:** Separate “poll request in progress” from the durable payment/fulfillment presentation state, or render verifying as part of the pending status screen.

### M4 — Confirmation omits provider booking ID and payment reference

- **Severity:** MEDIUM
- **File:** `src/screens/dashboard/bottomTabScreens/HotelBookingConfirmationScreen.jsx`
- **Function / location:** Booking/reference and payment cards, approximately lines 57–132
- **Current behavior:** Displays booking reference, confirmation number, status, hotel, room, dates, guest contact, total paid, and cancellation deadline. It does not display `providerBookingId`/`srdvBookingId` or `paymentReference`.
- **Expected behavior:** Display the authoritative provider and payment references available in the final booking response.
- **Why it matters:** Support and customer reconciliation have incomplete identifiers on the final ticket screen.
- **Suggested correction:** Add rows using the backend fields without generated fallbacks.

### M5 — Hotel refund tracking fields are not presented

- **Severity:** MEDIUM
- **File:** `src/screens/dashboard/bottomTabScreens/BookingsScreen.jsx`
- **Function / location:** Cancellation quote modal and `groupHotelBookings`, lines 45–63 and 242–258
- **Current behavior:** Quote UI shows `totalPaid`, supplier charge, service charge, and refund amount. Hotel history does not carry/display `refundStatus`, `cashfreeRefundId`, `cancelledAt`, or `cancellationReason`.
- **Expected behavior:** Display all backend-authoritative refund tracking fields where available; never calculate replacements locally.
- **Why it matters:** Customers cannot verify whether the refund is initiated/completed or provide a gateway reference to support.
- **Suggested correction:** Preserve and render the additional backend fields in the cancelled Hotel detail/history presentation.

### M6 — Cancellation can fall back from internal booking ID to provider booking ID

- **Severity:** MEDIUM
- **Files:** `src/screens/dashboard/bottomTabScreens/BookingsScreen.jsx`, `src/services/hotelService.js`
- **Function / location:** `groupHotelBookings` line 52; `cancelHotelBooking` line 541
- **Current behavior:** History item ID falls back to `providerBookingId`; quote/cancel then use that value as `{bookingId}` in the Pick&Book booking endpoint.
- **Expected behavior:** Full-booking quote/cancel must use the backend's internal Hotel booking ID.
- **Why it matters:** Provider and Pick&Book booking IDs are not guaranteed to share a namespace; fallback can quote/cancel the wrong identifier or fail unexpectedly.
- **Suggested correction:** Require `bookingId` for quote/cancel and keep provider IDs separate for display only.

### L1 — Different-hotel reset leaves the unused context passenger array intact

- **Severity:** LOW
- **File:** `src/context/HotelBookingContext.js`
- **Function / location:** `setSelectedHotel`, lines 52–63
- **Current behavior:** Clears selected rooms, block, pricing, and hotel detail state but not `passengers`.
- **Expected behavior:** Reset all hotel-scoped state when switching hotels.
- **Why it matters:** The current passenger screen uses local state, so no active leak occurs, but future context usage could revive stale Hotel A passengers.
- **Suggested correction:** Clear `passengers` in `setSelectedHotel`.

### L2 — Obsolete direct-booking exports remain

- **Severity:** LOW
- **File:** `src/services/hotelService.js`
- **Function / location:** `bookHotelOffer` / `bookHotel`, lines 524–533
- **Current behavior:** Exports remain but always throw; no caller exists.
- **Expected behavior:** No reachable direct provider booking path.
- **Why it matters:** They cannot currently bypass the flow, but their names invite future misuse.
- **Suggested correction:** Remove them after confirming no compatibility consumer depends on the exports.

### L3 — Confirmation route is registered twice and the screen itself assumes success

- **Severity:** LOW
- **Files:** `src/navigation/StackNavigation.jsx`, `src/navigation/BottomTabNavigation.jsx`, `HotelBookingConfirmationScreen.jsx`
- **Function / location:** Route registrations; confirmation hero
- **Current behavior:** The screen is registered in root and Home stacks and always renders “Booking Confirmed!” for any supplied route object. Current code does not navigate to these registered routes; Checkout renders the component only after its gate.
- **Expected behavior:** Final confirmation should only be reachable through the correlated confirmation gate.
- **Why it matters:** No current bypass exists, but a future direct navigation call could display success without revalidating.
- **Suggested correction:** Consolidate the route and make the screen reject missing/non-confirmed data defensively.

## Live-Test Blockers

1. **B1 — Preserve the exact selected `OptionId` through BlockRoom response normalization and into `bookingPayloadJson`.**

The four HIGH findings should also be resolved before a real-money test because they violate identifier, block-success, coupon, or booking-status requirements even where backend validation reduces payment risk.

## Recommended Manual Live-Test Sequence

Do not execute this sequence until B1 and the HIGH findings are corrected and re-audited.

1. Start from a fresh signed-in app session and perform a new Hotel search with future check-in/out dates, one room, and a testable guest configuration.
2. Capture the returned `traceId`, one hotel's exact composite `resultIndex`, `hotelCode`, `srdvIndex`, and `srdvType`; confirm the values remain identical on info and rooms calls.
3. Select a room/rate with a known, distinctive `RoomIndex`, `RoomTypeCode`, and `OptionId`.
4. Continue to guest details and inspect the BlockRoom request. Confirm all three room identifiers match the chosen rate exactly.
5. Inspect the BlockRoom response and then the pricing-preview request. Confirm the room identity is retained and pricing inputs come from the block result.
6. Confirm displayed Total Payable exactly equals pricing-preview `finalTotal`.
7. Test an invalid coupon and coupon removal before payment. Confirm checkout becomes unavailable until a fresh authoritative preview succeeds and no old discount remains.
8. For a multi-room test, enter adults/children per room and verify exactly one lead passenger exists globally and every guest appears under the correct room.
9. On the review screen, inspect `bookingPayloadJson`. Verify dates, trace/result/hotel identifiers, room identifiers including nonempty exact `OptionId`, guest data, coupon, and `Price=finalTotal`.
10. Rapidly tap Pay twice and verify exactly one `/api/cashfree/create-order` request and one Cashfree SDK session.
11. Complete one intentionally low-value live Cashfree payment only after the request inspection passes.
12. Observe `status=Success` with pending fulfillment: remain on the confirming-reservation screen while five-second polling continues; do not show confirmation.
13. On fulfillment success, verify the app uses this order's `bookingReferenceId` for `GET /api/Hotels/bookings/{bookingId}`.
14. Confirm the fetched reservation status is `Confirmed` or `Booked`, then compare booking reference, confirmation number, provider booking ID, hotel, room, dates, guest, total, payment reference, and cancellation deadline to the backend response.
15. Open My Bookings and verify the same booking appears in the correct status group. If fulfillment is deliberately delayed or failed in a controlled environment, verify Pending and Failed are not shown as Upcoming.
16. Request a cancellation quote without confirming cancellation. Verify total paid, supplier charge, service charge, refund amount, refund status, and gateway refund ID are backend values. Only test actual cancellation with explicit business authorization.

