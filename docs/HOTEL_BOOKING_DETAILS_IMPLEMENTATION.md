# Hotel Booking Details Implementation

## Scope

This implementation covers the mobile post-booking journey:

`Bookings → Hotels → Hotel booking details → Full booking cancellation → Refreshed details`

It does not change Hotel search, pricing preview, BlockRoom, passenger details, Cashfree payment, fulfillment polling, OptionId preservation, or booking-reference correlation.

## API and mobile field mapping

| API field | Mobile label/use | Endpoint/source |
|---|---|---|
| `bookingId` | Booking ID; the only identifier used for details, quote, and cancellation requests | Hotel booking list/details |
| `bookingReference` | Booking reference | `GET /api/Hotels/bookings/{bookingId}` |
| `confirmationNo` / `confirmationNumber` / `pnr` | Confirmation number | Booking details |
| `providerBookingId` / `srdvBookingId` | Provider booking ID | Booking details |
| `hotelName` / `propertyName` | Hotel name | Booking details |
| `hotelAddress` / `address` | Hotel address | Booking details |
| `checkInDate`, `checkOutDate` | Check-in and check-out | Booking details |
| room and guest count/details fields | Rooms, room type, meal plan, lead guest, guest summary | Booking details |
| `totalPriceInr` / `totalPrice` / `totalPaid` | Total paid | Booking details |
| payment method fields | Payment method | Booking details/payment breakdown |
| payment reference/transaction/payment ID fields | Payment reference | Booking details/payment breakdown |
| payment status fields | Payment status and failed-booking messaging | Booking details/payment breakdown |
| `cancellationPolicy` | Current cancellation policy, only for an active booking | Booking details |
| `totalPaid` / `totalPriceInr` | Total paid in the current quote | `GET /api/Hotels/bookings/{bookingId}/cancellation-quote` |
| `supplierCancellationCharge` | Supplier cancellation charge | Cancellation quote |
| `serviceCharge` | Service charge | Cancellation quote |
| `cancellationChargeInr` / total cancellation charge field | Total cancellation deduction, when explicitly returned | Cancellation quote |
| `refundAmount` / `customerRefundAmount` | Current quoted refund | Cancellation quote |
| quote policy windows | Cancellation windows; `CURRENT` appears only when the backend marks a window active | Cancellation quote |
| root `cancellationChargeInr` / cancellation charge field | Historical cancellation deductions | Cancelled booking details |
| `cancellationAudit.customerRefundAmount` / historical refund field | Historical refund amount | Cancelled booking details |
| `cancellationAudit.refundStatus` / historical refund status | Refund Processing, Refund Credited, No Refund Applicable, or Refund Under Review | Cancelled/failed booking details |
| `cashfreeRefundId` / refund ID | Refund reference | Cancelled/failed booking details |
| `cancellationReason`, `cancelledAt` | Cancellation reason and date | Cancelled booking details |
| lifecycle stage key/title/status/timestamp/summary | Collapsible booking lifecycle | Backend lifecycle/timeline only |
| semantic `REFUND_SETTLEMENT` + `COMPLETED` stage | Refund completion timestamp | Backend lifecycle; no fixed array index |

Missing or null optional fields are hidden. The mobile app does not fabricate references, amounts, dates, policy windows, or lifecycle stages.

## Customer states

| Backend state | Mobile treatment |
|---|---|
| Upcoming / confirmed | `CONFIRMED`; cancellation is offered only with an internal ID and no explicit backend/business-rule denial |
| Pending | `CONFIRMATION PENDING`; never shown as confirmed |
| Pending reconciliation | `RECONCILIATION PENDING`; never shown as confirmed |
| Payment failed | `BOOKING FAILED` and `Payment Not Completed`; never grouped as upcoming |
| Supplier fulfillment failed after confirmed payment | `Hotel Booking Could Not Be Confirmed`; refund information is shown only when returned by the backend |
| Past / completed / checked out | `COMPLETED`; no cancellation action |
| Cancelled | `CANCELLED`; historical cancellation/refund values only; no cancellation action |
| Refund initiated / pending / processing | `Refund Processing` |
| Refund completed / refunded | `Refund Credited` |

## Cancellation behavior

- The flow is full-booking cancellation only. There are no room or guest selectors.
- Quote request: `GET /api/Hotels/bookings/{bookingId}/cancellation-quote`.
- Cancellation request: `POST /api/Hotels/bookings/{bookingId}/cancel` with:

```json
{
  "reason": "...",
  "refundPreference": "ORIGINAL_PAYMENT_METHOD"
}
```

- Both endpoints use the Pick&Book internal `bookingId`, never the provider ID, PNR, confirmation number, or booking reference.
- Quote values are rendered directly. The app does not calculate refund or service charges.
- A reason and explicit destructive confirmation are required.
- Submission is guarded against duplicate requests and shows a loader while running.
- After success, the app refetches booking details rather than locally mutating the booking to cancelled.
- A current quote is never used to overwrite a cancelled booking's historical refund result.

## Lifecycle

The lifecycle is rendered only when returned by the backend. It is collapsible and shows customer-useful stage title, status, timestamp, and summary. Raw lifecycle metadata and JSON are not displayed.

## Validation

Static state-matrix coverage includes confirmed/upcoming, pending reconciliation, payment failure, paid supplier failure, past/completed, cancelled with refund processing/completed, cancellation-ineligible, and missing-internal-ID fail-closed cases. No real payment or cancellation request was executed during validation.
