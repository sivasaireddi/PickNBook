# Hotel Supplier Payload Fix

## Root cause

The failed mobile booking reused the selected provider GUID as the final supplier `RoomIndex`, trusted a stale `SrdvIndex`, emitted empty optional passenger strings, and allowed an internal Pick&Book hotel ID to reach final supplier booking as `HotelCode`.

The backend-confirmed contract separates SearchHotels `hotelCode` (the internal Pick&Book catalog ID) from the supplier HotelCode. Mobile now resolves the supplier code from BlockRoom first, HotelInfo second, and the validated `ResultIndex` suffix last. A BlockRoom/suffix mismatch fails closed.

## Failed mobile payload vs fixed payload

| Field | Failed behavior | Fixed behavior |
|---|---|---|
| `RoomIndex` | Selected rate GUID | Sequential Book position (`"1"`, `"2"`, …) |
| `RoomTypeCode` | Could be overwritten by blocked representation | Preserved original selected provider GUID |
| `OptionId` | Could be overwritten by blocked representation | Preserved original selected provider GUID |
| `SrdvIndex` | Stale `"15"` | Prefix before `_` in the verbatim `ResultIndex` |
| `HotelCode` | Internal database property code | BlockRoom supplier code, HotelInfo code, or validated `ResultIndex` suffix |
| Optional passenger strings | Empty strings emitted | Omitted when empty |
| Email | Any syntactically valid placeholder accepted | Primary guest email only; known placeholders rejected |

## RoomIndex behavior

BlockRoom identity is unchanged and continues to correlate the selected and blocked rates using:

```text
RatePlanCode + RoomTypeName + MealBasis
```

That merge preserves the original selected `RoomIndex`, `RoomTypeCode`, and `OptionId` for rate identity. Only the final supplier Book payload transforms `RoomIndex` to `String(roomPosition + 1)`. `RoomTypeCode` and `OptionId` remain the selected provider GUIDs.

## HotelCode source

The upstream Info/Rooms/BlockRoom request path continues using the internal SearchHotels `hotelCode` because that is the backend contract for those session endpoints. Final supplier Book resolves its separate supplier code in this priority:

```text
BlockRoomResult.supplierHotelCode
→ BlockRoomResult.hotelCode
→ GetHotelInfo hotelInfoResult.hotelDetails.hotelCode
→ validated suffix of the unchanged ResultIndex
```

SearchHotels `hotelCode`, `canonicalHotelCode`, `hotelId`, `id`, and internal database IDs are never used as final supplier `BookingPayloadJson.HotelCode`. If BlockRoom supplies a code that differs from the ResultIndex suffix, checkout fails closed with a customer-safe inconsistency message.

## SrdvIndex derivation

`SrdvIndex` is derived from the exact, otherwise unchanged `ResultIndex` prefix before the first underscore. A missing/invalid separator fails closed.

## Passenger email source

The manually entered Room 1 lead guest email drives `CustomerEmail`, top-level `GuestEmail`, and `HotelPassenger[0].Email`. The physical sanitized audit confirmed both equality checks. Known placeholder addresses are rejected before review.

## Optional-field sanitation

Hotel passengers are constructed explicitly. Empty optional values are omitted for `MiddleName`, PAN, passport fields, and GST fields. Required title, structured first/last name, age, PaxType, and lead-passenger fields remain mandatory.

## Title/Gender/PaxType/LeadPassenger mapping

- Title normalizes to `Mr`, `Ms`, or `Mrs`.
- Gender follows the normalized selected title.
- Adult maps to string `"1"`; child maps to string `"2"`.
- Exactly one lead passenger is required, and it must be Room 1 passenger 1.

## Final BookingPayloadJson structure

The final payload preserves TraceId and ResultIndex, derives SrdvIndex, requires explicit supplier HotelCode, sequences final RoomIndex, preserves selected GUIDs in RoomTypeCode/OptionId, includes authoritative pricing, and contains explicitly constructed passenger objects. Checkout still stringifies `BookingPayloadJson` exactly once.

## Single-room fixture result

PASS for supplier HotelCode `100001721899`, SrdvIndex `60`, sequential `RoomIndex = "1"`, selected GUID preservation, passenger sanitation, and exactly one lead passenger. A mismatching BlockRoom supplier code is rejected.

## Multi-room fixture result

PASS for `RoomIndex = "1"`/`"2"`, independent selected GUIDs, and exactly one lead passenger across both rooms.

## Physical one-room validation

| Check | Result |
|---|---|
| Room selection → BlockRoom → pricing preview | PASS |
| RoomIndex fixed | PASS (`"1"`) |
| RoomTypeCode fixed | PASS (selected GUID present) |
| OptionId fixed | PASS (same selected GUID present) |
| Supplier HotelCode | PASS (BlockRoom preferred; validated against ResultIndex suffix) |
| ResultIndex suffix fallback | PASS |
| BlockRoom vs ResultIndex cross-check | PASS |
| SrdvIndex | PASS (matched ResultIndex prefix) |
| Real guest email propagation | PASS |
| Optional empty strings removed | PASS |
| Title mapping | PASS |
| Adult PaxType | PASS (`"1"`) |
| Exactly one lead passenger | PASS |
| TraceId continuity | PASS (present through final payload) |
| Pricing unchanged | PASS (physical preview and Review both ₹3,276.55) |
| BlockRoom matcher untouched | PASS |
| Payment/polling untouched | PASS |

## Protected payment/BlockRoom behavior

No Cashfree endpoint, SDK, payment hook, polling behavior, pricing authority, or BlockRoom matcher was changed. No payment or create-order request was initiated during validation.

## Validation results

The exact failed single-room fixture and two-room fixture pass the local supplier-payload contract tests. Babel and `git diff --check` results are recorded at final handoff.

## Remaining blocker

No supplier payload blocker remains before another controlled live Hotel payment. Payment was not initiated during this validation.
