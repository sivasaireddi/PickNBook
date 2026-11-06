# Hotel Cancellation and Refund Validation

Validated on 2026-11-06 against the current Pick&Book Mobile working tree. No Hotel cancellation or refund was submitted.

## Backend contract implemented

- Customer cancellation APIs use the internal PickNBook booking ID. `bk-381` is normalized to `381`; the provider booking ID is never used as the cancellation API identifier.
- Quote: `GET /api/Hotels/bookings/{bookingId}/cancellation-quote`.
- Cancel: `POST /api/Hotels/bookings/{bookingId}/cancel` with only `reason` and `refundPreference`.
- Allowed refund preferences are exactly `ORIGINAL_PAYMENT_METHOD` and `WALLET`.
- Quote fields are rendered directly: `totalPaid`, `cancellationFee`, `supplierCancellationCharge`, `serviceCharge`, `markupRetained`, `refundAmount`, `lastCancellationDate`, `isFreeCancellation`, and `currency`.
- `refundAmount` is never derived from other fields. `cancellationFee` is the authoritative total deduction.
- Quotes older than two minutes are refetched. A changed quote is displayed and must be reviewed again before the destructive confirmation can proceed.
- A successful cancellation triggers one authoritative booking-detail refetch. Refund settlement is presented separately from booking cancellation.

## Physical-device safe validation

The Android device was connected and recognized by ADB. Booking `381` appeared under Hotels → Upcoming as Confirmed. Opening its cancellation screen produced one initial quote request for that screen mount. Temporary safe diagnostics recorded:

```text
bookingId: 381
requestId: 1
quote result: success
refundAmount: 1971
quoteError: null
quoteLoading: false
reason present: true
refundPreference: ORIGINAL_PAYMENT_METHOD
confirmDisabled: false
```

The physical UI displayed `₹2,006.44` total paid, `₹0.00` supplier charge, `₹35.00` service/total deduction, and the backend-authoritative whole-rupee refund `₹1,971.00`. The Confirm cancellation button was visibly enabled. It was not pressed, the final destructive dialog was not opened, and no request was made to `POST /api/Hotels/bookings/381/cancel`. Temporary diagnostics were removed.

### Disabled-button root cause

The former `quoteComplete` predicate required `Boolean(currency)`. The live quote's monetary fields were all valid, including legitimate zero values, but `currency` was omitted. That made `quoteComplete === false`, which both disabled Confirm and rendered the inline calculation-error copy. No quote request had failed. Quote validity now checks only the required monetary fields by explicit finite-number presence; display currency uses quote currency, then booking currency, then the existing INR Hotel fallback.

## Static cases

| Case | Result | Evidence |
| --- | --- | --- |
| A — current live quote | PASS | Currency omission no longer invalidates otherwise complete quote data; values render as `₹2,006.44`, `₹0.00`, `₹35.00`, and backend-returned `₹1,971.00`. |
| B — charged cancellation | PASS | The UI binds directly to `quote.refundAmount` and `quote.cancellationFee`; no refund arithmetic is present. |
| C — non-refundable | PASS | A zero-refund warning is shown, while eligibility and submission do not depend on refund being greater than zero. |
| D — initial quote failure | PASS | No stale monetary quote is presented, Retry is visible, and Confirm stays disabled. |
| E — stale refresh failure | PASS | Existing quote remains visible with an explicit refresh-failure message and Retry; Confirm stays disabled. |
| F — retry succeeds | PASS | Success explicitly clears the error, stores the fresh timestamp, and enables Confirm. |
| G — stale identical quote | PASS | Timestamp refreshes and the final confirmation can open immediately without a review deadlock. |
| H — stale changed quote | PASS | New values replace old values, a visible review alert stops submission, and the next explicit Confirm tap is the clear continuation path. |

Additional checks passed for strict eligibility, ID normalization, optional reason trimming/2000-character maximum, duplicate-submit protection, stale-quote comparison, POST field allowlist, and both refund-destination enums.

## Tool validation

- Babel transformation succeeded for the four changed source files and `BookingsScreen.jsx` (the latter remained unchanged after the temporary diagnostic was removed).
- `git diff --check` passed; only line-ending conversion warnings were reported.

## Remaining live-test blocker

The remaining blocker is explicit authorization to perform the irreversible real cancellation. Booking `381`, its quote, and the enabled Confirm state are now physically verified. This validation deliberately stopped before opening or accepting the destructive confirmation.
