# Hotel Guest Form — Saved Traveler, Validation, and Keyboard

## Scope and contract

- Mobile files changed: `HotelPassengerDetailsScreen.jsx`, `GuestForm.jsx`, `GuestAccordion.jsx`, `BookingPolicySection.jsx`, and `hotelGuestForm.js`.
- Web reference: `frontend/src/pages/booking/HotelPassengerDetailsPage.js` and `frontend/src/services/travelerService.js` in the supplied Web project.
- Saved traveler API: authenticated `GET /api/travelers`; no user ID is sent by the caller. Web fetches on the passenger page/current-step load.
- Normalized response: `id`, `type`, `title`, `firstName`, `lastName`, `name`, `gender`, `dob`, `email`, `mobile`/`phone`, `passportNo`, `country`, and derived `age` where DOB is present.
- Web behavior: primary guest only; no automatic first choice; selecting a profile replaces the primary guest fields; fields remain editable; turning the selector off clears the selected ID but intentionally preserves the visible editable values.
- Mobile mapping: actual returned title/name or first/last name, age or DOB-derived age, email, and phone populate only `room-0-pax-0`. Missing data stays empty. A → B fully replaces all mapped fields. Local edits affect only the booking form and never update the saved profile.
- Loading, empty, and error states are inline and never block manual guest entry.

## Validation and phone behavior

- Initial untouched validation hidden: **PASS**.
- Invalid-on-blur validation: **PASS**.
- Submit-attempt validation for every required guest field: **PASS**; the first invalid field is expanded, scrolled, and focused when focusable.
- Errors clear immediately when the current value becomes valid: **PASS**.
- Policy checkbox has no initial error and shows its specific error only after submit: **PASS**.
- First/last name: required, at least two Latin letters, letters only: **PASS**.
- Adult age: integer 18–99; child age remains 0–17: **PASS**.
- Email: required structure plus existing placeholder/test-email rejection: **PASS**.
- Mobile: Indian mobile validation (`^[6-9]\d{9}$`): **PASS**.
- `+91` is a static, non-editable display prefix. UI state and supplier `HotelPassenger.Phoneno` remain the proven 10 local digits (example `9398649798`), not `+919398649798`.
- Multi-room/multi-guest state remains keyed by room and passenger; saved-profile population is lead-only: **PASS**.
- Saved Traveler A → B replacement: **PASS** (executable assertion).
- Saved traveler manual edit safety: **PASS** (form state only; no profile mutation call).

## Keyboard implementation and physical Android result

- Uses the already-installed `KeyboardAwareScrollView`, measured input refs, delayed Android focused-input scrolling, `keyboardShouldPersistTaps="handled"`, and explicit keyboard submit behavior.
- Next order: First Name → Last Name → Age → Email → Mobile. Mobile Done dismisses only; it does not submit.
- Sticky payable/Confirm bar is hidden while the keyboard is open and returns after dismissal.
- Physical device: OPPO CPH2381 (`9ab5c41`).
- First Name visible: **PASS**.
- Last Name visible: **PASS**.
- Age label/input visible: **PASS** after the minimal delayed-scroll correction.
- Email label/input/error area visible: **PASS**.
- Mobile label/input/static `+91` visible: **PASS**.
- Keyboard Next sequence: **PASS**; focused controls were Last Name, Age, Email, then Mobile in order.
- Keyboard-open scrolling/taps: **PASS**.
- Footer overlap: **PASS** (footer absent with keyboard, restored after Done).
- Done did not navigate or submit: **PASS**; Checkout remained open.

## Regression protection and checks

- Hotel BlockRoom correlation/timer/hold code: **untouched**.
- Hotel pricing, coupons, payment, supplier booking, cancellation, and refund logic: **untouched**.
- Bus and Flight: **untouched**.
- Static assertions: **PASS** (`node scripts/verify-hotel-guest-form.cjs`).
- Babel syntax validation: **PASS**.
- `git diff --check`: **PASS**.
- Remaining blocker: **none**. Saved-traveler API behavior was verified from source/static mapping only, as requested; no booking, payment, or destructive profile action was performed.
