# Pick&Book — Phase 0 baseline

Recorded 2026-10-06 from the live working copy at `C:\Users\ADMIN\Documents\PickNBook`.

**Outcome:** the current Android debug build succeeds. Expo Doctor passes all 18 checks. No Android device was visible to ADB during this phase, so installation, application startup, launch timing, memory and real payment behavior remain unverified. This is a build and static architecture baseline, not release certification.

Only `.gitignore`, `.env.example` and this document are deliverable changes. No application behavior, dependency, endpoint, payment environment, navigation, permission, native toolchain setting or asset was changed during Phase 0. Phase 1 has not started.

## 1. Scope, Git state and evidence

At the start, `git status` was clean on `main`, up to date with the locally recorded `origin/main`. No remote fetch was needed or performed. There were 442 tracked files. The five latest commits were:

| Commit | Subject |
| --- | --- |
| `c2ed934` | updated production required files |
| `a62f8e6` | Merge branch 'main' of the PickNBook repository |
| `7ca27e6` | project sync update |
| `d58e4d9` | ui final update |
| `f83502c` | splashscreen animation |

Inspection covered `package.json`, `package-lock.json`, installed package manifests, `app.config.js`, `eas.json`, `.gitignore`, `.easignore`, the local environment variable names/configuration agreement, `babel.config.js`, `index.js`, `App.js`, Android Gradle/configuration files, all `src` JS/JSX files, asset metadata, repository helper scripts and both existing flight-results test files. Architecture, payment, network, provider, timer and logging hotspots were read in detail.

Static counts use Babel AST parsing of 237 JS/JSX files: 235 under `src` plus `App.js` and `index.js`, totaling 62,430 physical lines including comments, blank lines and styles. One of those files is a colocated test; the additional root `__tests__` file is inspected separately. All 237 parsed successfully. Import traversal starts at `index.js`, follows relative imports/re-exports/literal requires and includes Android/native/web suffix alternatives. It does not prove runtime reachability of computed imports, external consumers or persisted OS tasks. Asset sizes are encoded file bytes, not decoded image memory or APK contribution.

Temporary analysis scripts, raw health output and build logs are under the already ignored `.android-toolchain/phase0/`. They are local evidence, not deliverable source; raw public config output can contain client configuration and should not be published. No secret values or real local API origin are reproduced here. Pattern scanning of 253 tracked text files was supplementary, not a complete credential/history audit; binary/generated bundles, large generated files and Git history were not exhaustively inspected for secrets.

## 2. Versions and configuration

| Item | Current live value |
| --- | --- |
| Expo | SDK 54; installed/locked package `54.0.37`, requested `~54.0.37` |
| React | `19.1.0` |
| React Native | `0.81.5` |
| Cashfree native SDK | `react-native-cashfree-pg-sdk` installed `2.4.0`, requested `^2.4.0` |
| Cashfree contract | `cashfree-pg-api-contract` installed `2.1.1` |
| `expo-system-ui` | Installed `6.0.9`; retained |
| `expo-clipboard` | Installed `8.0.8`; retained |
| App/package version | `1.0.0` |
| Android application ID | `com.picknbook.com` |
| EAS project ID | `da0b7bca-5e66-408e-a791-cadfb95f1661` |
| EAS version source | `cli.appVersionSource: "remote"` |
| Production distribution/build | `store`, Android `app-bundle` |
| Production increment | `autoIncrement: true` |
| EAS CLI requirement | `>= 20.0.0` |
| Node / npm | `v24.14.1` / `11.11.0` |
| Local Expo CLI | `54.0.27` |
| Babel | `babel-preset-expo`, `react-native-reanimated/plugin` |

The production profile contains `EXPO_PUBLIC_API_BASE_URL`; the current local `.env` value matches it. Values are deliberately omitted. `src/constants/config.js` resolves the process variable first, then Expo config extras (`EXPO_PUBLIC_API_BASE_URL`/`apiBaseUrl`), then legacy manifest extras; it throws when no URL exists. `app.config.js` passes the process value into extras. Domain service aliases mostly use this central origin. This confirms configuration agreement, not API availability or backend correctness.

`EXPO_PUBLIC_*` variables become client-visible bundle values and cannot protect provider passwords. See [Expo environment-variable documentation](https://docs.expo.dev/guides/environment-variables/). The existing EAS production changes and installed system UI package were preserved. The live project ID above supersedes older snapshots.

## 3. Health checks and warnings

| Check | Result |
| --- | --- |
| `node -v`, `npm -v`, `npx.cmd expo --version` | Versions above; succeeded |
| `npx.cmd expo-doctor` | **18/18 passed**, no reported issues |
| `npm.cmd ls --depth=0` | Exit 0; no missing/invalid direct dependency or peer errors reported |
| `npx.cmd expo config --type public --json` | Exit 0; public config resolved; inspected without publishing values |
| `npm.cmd audit --json` | Exit 1 because vulnerabilities were reported; no fix applied |

Audit snapshot: **49 vulnerable package entries: 32 high, 17 moderate, 0 critical, 0 low** in a reported 770-dependency graph. These are package-level findings, not 49 independently demonstrated application exploits. Direct packages flagged include datetimepicker, axios, Expo, expo-constants, expo-dev-client, expo-splash-screen, React Native and Reanimated. Tooling and runtime exposure need separate triage. Automated proposals include incompatible major changes/downgrades, so they are not an approved upgrade plan.

Expo Doctor's React Native Directory check explicitly excludes `react-native-cashfree-pg-sdk` in `package.json:69–74`; passing Doctor does not validate Cashfree's integration. No test/lint script is defined in `package.json`. Existing hook tests were inspected but not executed, and the native baseline command skips lint/tests. No dependency repair/update commands were run.

Fresh build warnings, retained as baseline:

- `NODE_ENV` was not set for the direct Gradle invocation; Expo reported using `.env.local` and `.env`. This was nonfatal.
- Three debug-manifest merge warnings: `usesCleartextTraffic`, image picker's crop activity `exported`, and filesystem provider `authorities` had replacement markers without another matching declaration.
- Gradle reports deprecated features incompatible with a future Gradle 9 upgrade. No Gradle upgrade was attempted.
- Gradle configuration-on-demand is incubating; the generated local problems report is under `android/build/reports/problems/`.

## 4. Android/Java toolchain and build

| Item | Observed baseline |
| --- | --- |
| Global `java -version` | Oracle Java `26`, build `26+35-2893` |
| `where.exe java` | `C:\Program Files\Common Files\Oracle\Java\javapath\java.exe` |
| `JAVA_HOME` | Unset |
| `ANDROID_HOME` / `ANDROID_SDK_ROOT` | Unset; local SDK configured through `android/local.properties` |
| Android SDK | `C:\Users\ADMIN\AppData\Local\Android\Sdk` |
| Gradle wrapper | `8.14.3` |
| Gradle launcher JVM | Oracle `26` |
| **Gradle daemon/build JVM** | **Microsoft OpenJDK `17.0.20.1+1`** via `org.gradle.java.home` |
| Local JDK location | `.android-toolchain/jdk-17.0.20.1+1` |
| Android Gradle Plugin | `8.11.0` from installed React Native Gradle plugin catalog |
| Project Kotlin | `2.1.20` (Gradle's own embedded Kotlin is `2.0.21`) |
| Native dependencies | NDK `27.1.12297006`, CMake `3.22.1`; installed SDK platforms/build tools 35 and 36 |
| ADB | Works through its full SDK path; not available as bare `adb` on PATH |
| ADB devices | Empty device list; no `device`, `unauthorized` or `offline` entry |

The project-local JDK pin was already present when Phase 0 began. Java 26 remains installed globally. The successful build uses JDK 17; reporting the launcher's Java 26 alone would misidentify the compiler/runtime used by Gradle. Run the wrapper from `android`, or pass `-p android`, so the project property is loaded. No Java/Android Studio reinstall or toolchain change was made in this phase.

Fresh command, run from `android` in PowerShell:

```powershell
.\gradlew.bat app:assembleDebug -x lint -x test --configure-on-demand --build-cache -PreactNativeDevServerPort=8081 '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a' --console=plain
```

**BUILD SUCCESSFUL in 4m 10s**, 538 actionable tasks: 52 executed, 486 up to date. APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 119,588,991 bytes. This is a cached, two-ABI development build; duration is not clean-build performance and size is not the Play Store download size. Log: `.android-toolchain/phase0/android-build.log`.

No physical device was connected, so `npx expo run:android --device` was not run during this phase. A previous task's Expo build log ended after successful compilation when the phone disconnected before installation; that is historical evidence, not a successful Phase 0 app launch. No EAS production build, store installation or payment transaction was attempted.

## 5. Startup and memory baseline

| Measurement | Result |
| --- | --- |
| Installed app/main activity | Not available to resolve: no connected device |
| Launch result | Not measured |
| `TotalTime` | Not measured |
| `WaitTime` | Not measured |
| Memory/PSS/native/Java heap | Not measured |
| Visual startup, navigation, API/payment behavior | Not verified on device |

Reproduction procedure when the phone is available (future diagnostic steps, not executed results):

```powershell
$phase0Adb = 'C:\Users\ADMIN\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $phase0Adb devices -l
npx.cmd expo run:android --device
# With Metro running and installation confirmed:
& $phase0Adb shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER com.picknbook.com
# Copy the actual resolved package/activity; do not assume MainActivity.
& $phase0Adb shell am force-stop com.picknbook.com
& $phase0Adb shell am start -W -n '<resolved-package/activity>'
& $phase0Adb shell dumpsys meminfo com.picknbook.com
```

If multiple devices appear, add `-s <serial>` to ADB commands. This installed Expo CLI accepts the previously connected model name `CPH2381` for its `--device` selector; ADB uses the serial. Record build variant, device/OS, Metro state, logged-in/out state and elapsed time before memory capture. Android activity launch timing does not establish when the React UI has finished loading or when the custom splash completes.

Static startup observations: `App.js` waits for five bundled font faces (Space Grotesk 600/700 and Inter 400/500/600) or a font error before hiding the native splash. `src/screens/auth/SplashScreen.jsx:9` adds a **3,400 ms** custom navigation delay, alongside animation timers. This is a configured delay, not measured cold-start time. Root navigation eagerly imports the screen graph. Home loads large local images and uses a 500 ms simulated loading timeout; that timeout is not a network request.

## 6. Navigation map

`index.js` registers `App`; `App.js` renders `NavigationContainer` around `src/navigation/StackNavigation.jsx`. The root is a native stack with initial route `SplashScreen`.

| Area | Routes/ownership |
| --- | --- |
| Authentication | Splash checks stored token/expiry and chooses `Login` or `DashBoard`; `Login` maps to `UserLoginScreen`. Other root routes: `MobileLoginScreen`, `VerifyMobileOtpScreen`, `ForgotPassword`, `VerifyOtp`, `ChangePassword`, `OTP`, `Register`, `CreateAccount` |
| Bottom tabs | `DashBoard` -> `BottomTabNavigation`: `Home`, `Bookings`, `Offers`, `Help`, `Account` |
| Home stack | Defined inside BottomTabNavigation: `HomeScreenMain`, `Hotels`, hotel results/details/passenger/confirmation, `BusScreen`, `FlightScreen`, `BusLocationSearchScreen` |
| Bus | Root `BusScreen`, `BusListScreen`, `BordingNDroppingPoints`, `BusSeats`, `Seater`, `Sleeper`, `SeaterSleeper2Plus1Standard`, `SeaterSleeper2Plus1Hybrid`, `SeaterSleeper`, `PostBusBooking` |
| Hotels | Root and Home stack both register `Hotels`, `HotelSearchResultsScreen`, `HotelOfferDetails`, `HotelPassengerDetails`, `HotelBookingConfirmation` |
| Flights | Root `FlightScreen`, `FlightListingScreen`, `FlightPassengerDetailsScreen`, `FlightSeatSelectionScreen`, `FlightPaymentScreen`, `FlightPaymentProcessingScreen`, `FlightConfirmationScreen`, `FlightDetailsScreen` |
| Shared payment/bookings | Root `CheckoutScreen`, `BookingConfirmationScreen`, `BookingFailureScreen`, `BookingDetailsScreen`; Bookings tab aggregates categories |
| Account/utility | Root `NotificationsScreen`, `TravelersScreen`, `WalletScreen`, `WalletTransactionsScreen`, `search`, `Travel` |
| Drawer | Root `sidebar` -> `SideBarNavigation` + `CustomDrawer`; routes `DashBoards`, `BookingList`, `MarkupList`, `DiscountList`, `CouponList`, `UsedCouponList`, `ConvenienceFee`, `CancellationList`, `PopularRoutes`, `SearchHistory`, `VoucherSetting` |

Ownership risks: hotel routes and bus/flight entry routes exist in both root and Home stack; navigation resolution can depend on the current stack and create separate screen instances. `BusLocationSearchScreen` exists only in Home stack, so entry through root bus routes deserves a navigation test. `Register` and `CreateAccount` are aliases; `SeaterSleeper` aliases the standard layout. `DashBoard` (tabs) and `DashBoards` (drawer dashboard) are distinct. Drawer screens include administrative/mock-looking content and are still registered; do not label them dead by appearance. No central authenticated/role-gated navigator encloses these declarations; backend authorization must be checked separately, and unauthorized access was not demonstrated.

## 7. Providers, auth and hooks

Provider order is `GestureHandlerRootView` -> `BottomSheetModalProvider` -> `HotelBookingProvider` -> `NotificationProvider` -> `NavigationContainer` -> root stack.

| Context/provider | Ownership and baseline concern |
| --- | --- |
| `src/context/HotelBookingContext.js` | Search dates/guests, trace/session, hotel selection/info, rooms, block response, pricing and passengers; reset/setter helpers. One shared in-memory value object; changes can rerender every consumer. Reset is not bound centrally to logout |
| `src/context/NotificationContext.js` | Unread count, refresh helper and immediate/30-second polling at root. Lives across screens; no auth/focus/AppState gating |
| `src/context/AuthContext.js` | Default auth state/no-op sign-in/sign-out. **No AuthContext.Provider is mounted.** Login, OTP, ChangePassword and Profile consume the defaults |
| `src/utils/authSession.js` | Actual session handling uses SecureStore and manual navigation. Keys include token, login flag, user/profile, challenge, role and user-ID aliases. Logout clears its known keys with settled promises |
| Flight flow store | Separate SecureStore booking-flow snapshot and confirmed-booking storage under flight services; can contain traveler/booking information. Lifecycle/account scoping should be reviewed |

Profile logout resets navigation to Login after clearing known auth storage. It does not centrally reset hotel context, every flight snapshot/cache or explicitly stop background location. `isJwtExpired` treats a malformed/no-expiry token as not expired; this is a local routing heuristic, not server validation. No backend authorization conclusions can be drawn from it alone.

| Hook | Responsibility |
| --- | --- |
| `src/hooks/useCashfreePayment.js` | Shared native bus/hotel order creation, SDK callback lifecycle, verification and UI payment status |
| `src/hooks/useCashfreePayment.web.js` | Deliberate web platform fallback; not Android dead code |
| `src/hooks/useFlightSearch.js` | Search-form state, travelers/cabin/date/multicity validation; used by FlightSearchScreen |
| `src/screens/dashboard/bottomTabScreens/flights/hooks/useFlightResults.js` | Fare/result normalization and memoized filtering/sorting for FlightListingScreen |
| `src/hooks/useFlightResults.js` | Re-export compatibility wrapper used by the root hook test; not currently imported by the app entry graph |
| `useHotelBooking` / `useNotifications` | Context accessors colocated with their providers |

## 8. Service/API inventory

There are 12 root service files and 3 flight-local service/store files.

| Group/file | Role and request handling |
| --- | --- |
| `src/services/authService.js` | Shared fetch-based `requestAuth`, login/register/OTP helpers, JSON/text message extraction; AbortController timeout 15 s and cleanup in finally |
| `src/services/busService.js` | Cities, search, layouts, boarding, block/book, pricing, history/cancel/offers; Axios instance with 120 s timeout; token headers added in selected methods rather than a common interceptor |
| `src/services/hotelService.js` | Cities/search/info/rooms/block/pricing/book/history/cancel/coupons; direct Axios, repeated SecureStore/header handling, no explicit request timeout; module-level `lastTraceId` and provider defaults |
| `src/services/FlightService.js` | Places/offers/search/fare quote/rules/SSR/seat maps/LCC ticket/GDS hold-ticket/history/cancel; Axios 120 s and token interceptor; substantial request/response logging |
| `src/services/cashfreeApi.js` | Shared bus/hotel create-order and verify calls using fetch, explicit passed token, no AbortController/timeout |
| `src/services/cashfreeService.js` | Flight create-order/verify/coupons/my-bookings; Axios 30 s and SecureStore token interceptor; exports client also used by wallet |
| `src/services/WalletService.js` | Wallet summary, deposits, paginated transactions; imports Cashfree service's Axios client, coupling unrelated domains |
| `src/services/travelerService.js` | Traveler list/search/CRUD and normalization; Axios 30 s; repeated manual token headers and Bearer normalization |
| `src/services/notificationService.js` | Unread count, paginated list, mark read/all; authenticated wrapper around requestAuth |
| `src/services/locationService.js` | Permissions, foreground/background location setup and uploads; direct Axios 10 s, retry and movement/time dedupe |
| `src/services/couponService.js` | Coupons through Axios 30 s; in-memory Map cache without TTL/account reset; expiry filtering on fetch does not re-run on cache hit |
| `src/services/flightCouponService.js` | Alternative flight coupon/fare helpers; no inbound app import found |
| `flights/services/flightCouponService.js` | Active flight-local coupon/fare helpers; differs from root service (not a byte-identical duplicate) |
| `flights/services/flightBookingService.js` | Active compatibility wrapper forwarding booking operations to FlightService; do not remove just because it wraps another module |
| `flights/services/flightBookingFlowStore.js` | SecureStore persistence of flow and booking records; not another HTTP client |

Here and below, `flights/` means `src/screens/dashboard/bottomTabScreens/flights/`.

**Five `axios.create` sites:** busService:10 (120 s), FlightService:9 (120 s), travelerService:9 (30 s), cashfreeService:20 (30 s), couponService:4 (30 s). Recognized direct calls include 13 `axios.post`, 4 `axios.get`, 8 `fetch`, and instance calls `client.get` 18 / `post` 23 / `put` 1 / `delete` 1. These syntax counts exclude calls hidden behind SDK/helper aliases; they are not request volume.

Direct calls outside services:

| File/line | Direct call |
| --- | --- |
| `src/screens/dashboard/bottomTabScreens/BookingsScreen.jsx:160` | fetch flight booking history, manual Authorization |
| `src/screens/dashboard/bottomTabScreens/ProfileScreen.jsx:191,252` | fetch profile GET and multipart PUT |
| `src/screens/auth/OTPScreen.jsx:32` | fetch admin OTP verification; root route remains registered |
| `src/screens/auth/LoginScreen.jsx:392` | fetch admin OTP request; currently unreachable old screen |
| `src/screens/auth/LoginScreen2.jsx:136` | Axios admin OTP request; currently unreachable old screen |
| `src/screens/dashboard/bottomTabScreens/RideScreen.jsx:79` | Axios location upload; currently unreachable screen |

`fetchPlaces.js` is a standalone helper, not an app route; it calls `axios.get` without importing axios, and was not executed. `test_api.js` is an empty/cleaned helper.

SecureStore has 24 direct reads, 24 writes and 14 deletes in the parsed application source. Token loading is repeated across screens and services. Some callers pass tokens, some use interceptors, some build headers locally; error unwrapping and empty-array fallbacks differ by domain. There is no shared refresh/401 invalidation/request-cancellation strategy evident across them. Two-minute flight/bus timeouts can extend perceived stalls; hotel and raw fetch calls often have no explicit bound. Search screens generally debounce, but cancellation/stale-response protection varies.

Concrete static defect: `busService.js` declares `trimmed` inside the `try` at line 79 but references it in the `catch` at line 102. A failed city request can produce a ReferenceError that obscures the original failure. Recorded only; not repaired in this phase.

## 9. Cashfree architecture and correctness baseline

Bus/hotel and flights have **separate client implementations**, even though both reach the same backend create-order and order-payment routes. Backend webhook handlers, idempotency and fulfillment code are not in this repository and were not verified.

| Flow | Current path |
| --- | --- |
| Bus | Results/seat selection -> `src/practice/PostBusBookingScreen.jsx` -> block seats/pricing/review -> root `CheckoutScreen` with Bus payload, amount/customer/token -> shared hook -> cashfreeApi |
| Hotel | Search/results/details -> `HotelPassengerDetailsScreen.jsx` block-room/pricing/guest payload -> root `CheckoutScreen` with Hotel payload, amount/customer/token -> same shared hook/API |
| Flight | Fare/SSR/passengers/review -> `flights/FlightPaymentScreen.jsx` -> cashfreeService create order -> inline native SDK launch attempt -> `FlightPaymentProcessingScreen` verification polling -> booking lookup -> `FlightConfirmationScreen` |

Shared bus/hotel flow:

1. `CheckoutScreen.js` invokes `useCashfreePayment`; `cashfreeApi.js:66` posts `/api/cashfree/create-order` with booking type, amount/customer and serialized booking payload. It carries a hardcoded notification webhook origin rather than deriving every callback from central configuration; Checkout also has a placeholder return URL. Origins are intentionally not reproduced.
2. The hook imports `CFSession`/`CFEnvironment` from `cashfree-pg-api-contract`, and the gateway from `react-native-cashfree-pg-sdk`; it launches `doWebPayment(session)`.
3. A singleton SDK callback is installed at hook line 67 and removed at line 72 on cleanup. On verify callback, it GETs `/api/cashfree/orders/{orderId}/payments` through `cashfreeApi.js:101`.
4. **Verification-body gap:** hook lines 42–45 set success whenever `verifyPayment` resolves. The fetch helper rejects non-2xx HTTP but does not require a paid/success status in the body. Whether this produces false success depends on the backend contract; a 200/pending or 200/failed test is needed in Phase 1.
5. Checkout renders success/order information inline. Separate generic confirmation/failure routes are registered; they are not evidence that the hook checked actual ticket/room fulfillment. Shared checkout does not perform the flight-style booking lookup/poll.

Flight flow:

1. `cashfreeService.createCashfreeOrder` posts the shared create-order endpoint with Flight data; the screen presently passes `useWallet: false`. The screen has a wallet-fully-paid branch but validates both order ID and payment session before that branch, which should be checked against a wallet-only backend response later.
2. **Installed-SDK mismatch:** `FlightPaymentScreen.jsx:607–617` requires `CFSession` and `CFEnvironment` from `react-native-cashfree-pg-sdk`, then calls `doPayment(session)`. Installed SDK 2.4.0's `node_modules/react-native-cashfree-pg-sdk/src/index.ts` and type declarations do not export those contract constructors; `doPayment` expects a checkout-payment object, while `doWebPayment` accepts a session. This is a concrete static integration mismatch. The SDK exception is caught and only warned, then the app still navigates to polling. No device execution was available to confirm the user-visible failure.
3. Processing calls `verifyFlightPayment` after 3.5 s and then after pending responses (4.5 s on network error), at most 20 attempts. It inspects normalized `Success`/`Failed`/pending status. Requests themselves can last 30 s, so the total window is not a strict 70-second deadline.
4. **Fulfillment-correlation gap:** on success, processing lines 123–159 fetch `/api/flight/srdv/my-bookings` and use `bookings[0]`, not a record explicitly matched to this order. Missing data still gets a default `Booked` label; the catch fallback also supplies `Booked`. The service can return `[]` on lookup error. This can associate a payment with an older booking or imply fulfillment without evidence. Payment success and booking confirmation need independent tests.
5. No separate native SDK callback setup is present in the flight screen. Flow state/session details also pass through navigation and SecureStore snapshots; lifecycle and data retention need review.

Hardcoded environments in application code:

| File | Line | Environment |
| --- | --- | --- |
| `src/hooks/useCashfreePayment.js` | 121 | `CFEnvironment.PRODUCTION` |
| `src/screens/dashboard/bottomTabScreens/flights/FlightPaymentScreen.jsx` | 613 | `CFEnvironment.PRODUCTION` |

No application `CFEnvironment.SANDBOX` occurrence was found. SDK internals are not application configuration. The web hook is a platform fallback, not a third native integration to delete.

The installed SDK is the version-specific source of truth for the mismatch above. Cashfree's [React Native integration guide](https://www.cashfree.com/docs/payments/online/mobile/react-native) also documents server-side order creation, client checkout and server-side confirmation as distinct steps. Environment, backend endpoints and trusted-source requirements were left unchanged. No bypass or live payment was attempted.

## 10. Scrolling and future virtualization candidates

AST totals: **78 ScrollView, 11 FlatList, 1 BottomSheetFlatList and 1 KeyboardAwareScrollView** JSX instances across 70 files; no SectionList JSX found. A complete per-file inventory is in Appendix A. Counts include unreachable screens and alternative render branches, not just simultaneously mounted lists.

| Priority | Area | Evidence and appropriate later work |
| --- | --- | --- |
| High | `BookingsScreen.jsx:352` | Category booking history rendered as mapped cards in ScrollView; history size can grow. Measure and virtualize while preserving category/filter/loading behavior |
| High | `src/screens/wallet/WalletTransactionsScreen.jsx:48` | Page size 20; on-scroll pagination appends items into ScrollView/map, so rendered views grow with every page |
| Medium | `OffersScreen.jsx:54` | Dynamic offer cards mapped vertically, horizontal category controls; assess actual result size first |
| Medium | Hotel image galleries/markers | `HotelHero` maps remote gallery images; results map renders markers. Cap/measure image and marker counts, without replacing the already virtualized results list |
| Measure first | Wallet deposits and detail/history sublists | Can be dynamic, but actual cardinality needs backend/device observation |
| Keep unless evidence changes | Passenger forms, checkout/review, small modal choices, Home's four destination cards, bus/flight seat grids | Bounded forms/content or geometric seat layouts; converting every ScrollView would not be justified |

Already virtualized: bus results `BusCards.jsx:905`, hotel results `HotelSearchResultsScreen.jsx:664` (BottomSheetFlatList), flight results `FlightListingScreen.jsx:654`, boarding/drop points `BordingNDroppingPoints.jsx:683`, Travelers main list `TravelersScreen.js:549`, Notifications, airport search and bus city search. FlightListing also has a horizontal leg list. Travelers' skeleton ScrollView and main FlatList are alternate render branches, not an automatically nested list defect.

Nested scrolling observed in Home/Offers horizontal carousels, hotel results quick filters inside the list header, Hotels and FilterModal dropdowns, `BusSeats`/`Sleeper` two-axis geometry, and flight passenger/cabin/SSR/seat sections. `OffersCarousel` is a nested horizontal scroller. Same-axis dropdowns deserve gesture/content-height testing; cross-axis small controls can be valid. Cross-component nesting is not fully captured by AST ancestors alone.

## 11. Large source files and assets

The largest-file table is in Appendix B. **23 files exceed 700 lines, 9 exceed 1,000, and 1 exceeds 2,000.** The requested old-snapshot hotspots still exist: PostBusBooking (3,342), HotelSearchResults (1,244), BusCards (1,217), Travelers (1,211), Bookings (1,181), BordingNDroppingPoints (1,153), FlightPayment (1,151), HotelPassengerDetails (1,130), busService (968), FlightService (908), hotelService (895), and Home (904). File size suggests responsibility/testability concerns, not proof of slow rendering.

Assets: **42 files, 32,960,364 bytes (31.43 MiB)**. **19 exceed 500 KiB**, totaling 29,154,263 bytes (27.80 MiB); all are in Appendix C with exact bytes/type. `busBanner.jpg` is 4.99 MiB, `DashBoard.png` 2.43 MiB and `flightBanner.png` 1.85 MiB. Destination photos are roughly 0.93–1.12 MiB each. `apartments-rent-greens-area.jpg` and `HotelBanner1.jsx.jpg` are byte-identical SHA-256 duplicates at 2,425,172 bytes each; removal still requires reference review. The name `HotelBanner1.jsx.jpg` is an image, not source code.

Home/hero/banner images and galleries are good later resize/compression/cache candidates. Encoded image bytes underestimate decoded pixel memory; no actual decode dimensions, frame-time or heap profile was measured. No images were compressed/replaced and no duplicates were deleted.

## 12. Logging baseline

**359 active console calls** in the parsed files: 256 log, 51 warn, 52 error. AST counting excludes commented-out calls; it includes unreachable code. Runtime frequency depends on navigation/network activity. Highest-count files are in Appendix D.

Sensitive/expensive log areas:

- `FlightService.js` logs full normalized/sanitized request and response objects; its redaction does not cover every traveler identity/contact/passport field. Flight passenger/payment/seat/listing screens also log passengers, fare/SSR selections and flow data.
- `busService.js` recursively redacts several token/contact/address keys, but booking names/IDs/traces and large response shapes remain. PostBusBooking and BusCards add block/layout/booking logs.
- `hotelService.js:26–44` uses case-sensitive redaction, omits provider username/client-ID and some guest fields, and falls back to logging raw data if serialization/redaction throws.
- `useCashfreePayment.js:105–109` can serialize/log an unexpected create-order response when required session data is missing. A propagated error string may carry that data. Normal happy-path shared payment logs are more limited metadata; they do not all dump sessions.
- `src/tasks/backgroundLocationTask.js:16` logs precise coordinates; location-service error logging can include backend response data.
- Coupon logging can serialize whole responses. Many calls are unguarded by `__DEV__`; Babel does not configure a console-removal plugin.

This is an exposure/performance review of potential log contents, not a claim that every log leaked a live secret. Values are excluded from this report; logs were not mass-deleted.

## 13. Timers, polling, listeners and background work

AST found 114 useEffect, 4 useFocusEffect and 1 useLayoutEffect calls. No application AppState handling was found. A mounted screen/provider can continue work when it loses focus; Android may throttle/suspend JS timers in background, so absence of gating does not guarantee an exact background cadence.

| Task/location | Interval/trigger | Cleanup and inactive behavior |
| --- | --- | --- |
| NotificationContext:28 | Immediate unread refresh, then 30 s while root provider is mounted | Clears interval on provider unmount, mounted guard; no auth/AppState/focus gate. No-token service throws before HTTP; provider swallows failures |
| FlightPaymentProcessingScreen:181,192,203 | Initial/pending 3.5 s; error 4.5 s; max 20 attempts | Clears stored poll timer on unmount and guards state updates; no focus/AppState pause and no cancellation of an already running request |
| Flight processing confirmation navigation | 2 s after lookup/success | Mounted guard, but these timeout handles are not separately cleared |
| RideScreen:311 | 10 s foreground upload plus watchPosition callbacks (requested 1 s / 3 m) after destination/permission initialization | Clears interval/removes subscription and stops background task on effect cleanup. No focus/AppState gate; async setup can finish after cleanup. Screen is currently unreachable from app entry graph |
| locationService background registration | Requested 15 min, Balanced accuracy, persistent Android foreground-service notification | Explicit stop function exists; OS scheduling varies. Registration starts from RideScreen, not merely from importing the task |
| locationService upload retry/dedupe | Up to 2 attempts with 5 s retry delay; skip condition combines under 10 m and under 9 s | Retry delay not tied to screen cancellation. An unused 14-minute constant does not implement that throttle |
| RideScreen marker animation/retry | Recursive roughly 80 ms movement animation; upload retry delays | Some animation timeout handles are not tracked; review together with ride lifecycle |
| OffersCarousel:32 | Auto-scroll every 3.5 s | Clears interval on unmount; no focus pause; UI-only, not API polling |
| Travelers search:236 | 400 ms debounce before query | Clears prior debounce; no debounce unmount cleanup found. In-flight stale responses remain possible |
| AirportSearchModal:53,76 | 400 ms autocomplete debounce | Prior/unmount cleanup exists; empty-query early return precedes clearing old debounce. Hiding a still-mounted modal is different from unmount |
| HotelsScreen:126,171 | 400 ms city suggestions debounce | Prior/unmount timeout cleanup; empty input can return before canceling pending work. In-flight requests not canceled |
| BusLocationSearchScreen:33–40 | 400 ms debounce | Effect cleanup clears timeout; sequence guard helps prevent older response overwrites |
| SplashScreen | Animation stages 600/1,400/2,200 ms; navigation at 3,400 ms | Clears all timers on cleanup |
| OTP screens/modal | 1 s countdown/cooldown | Expiry/unmount clear intervals; display timers, not repeated OTP API calls |
| authService requestAuth | 15 s AbortController timeout per request | Cleared in finally; request timeout, not polling |
| Home / UI detail delays | 500 ms simulated loading; smaller one-shot modal/marker/selection/navigation delays | Home uses isActive guard; not all one-shot handles are cleared. No evidence these constitute recurring network polls |
| `src/utils/responsive.js:6` | Module-scope Dimensions change listener | Process-lifetime listener, no removal; not a network poll |
| BusBookingSection:126 | Navigation blur listener dismisses keyboard | Returns unsubscribe in effect cleanup |
| Cashfree shared hook | Global SDK callback set on mount/token change | removeCallback on cleanup; singleton ownership matters if multiple payment screens can coexist |

`index.js` imports `src/tasks/backgroundLocationTask.js` at startup, defining the task through TaskManager. The task reads location updates and delegates saving to locationService. **Definition is not activation.** The only discovered activation path is the currently unreferenced RideScreen; a previously persisted OS registration can still matter on an existing installation, so this does not justify deleting location code. No expo-notifications dependency or application push-registration implementation was found; current notification code is API polling/list updates.

No additional recurring booking-fulfillment poll was found in bus/hotel checkout. Flight's recurring operation is payment verification, followed by one booking-history lookup, not an order-correlated fulfillment poll. Live backend/task registration state was not observable without a device.

## 14. Security and release hygiene

| Severity/area | Location | Finding; no sensitive values shown |
| --- | --- | --- |
| High: provider credentials | `src/services/hotelService.js:8–10` | Literal fallback provider client ID, username and password. Public environment overrides are also client-visible; moving these into EXPO_PUBLIC variables would not make them secret |
| High: repeated provider credentials | `src/screens/HotelPassengerDetailsScreen.jsx:111–113,558–560` | Provider client ID/username/password repeated directly in block-room and book payloads. Validate whether credentials are active and plan backend ownership/rotation if so |
| High: sensitive logs | Payment/flight/hotel/location areas in section 12 | Booking/customer/session error data and coordinates may reach console output |
| Tracked environment | `.env` | Already tracked at Phase 0 start and still tracked. Currently contains the known public API variable. New ignore rules do not untrack it or erase Git history; real local file preserved |
| EAS upload exclusions | `.easignore:1–7` | Excludes native dirs, .expo, dist, web-build and node_modules, but not `.env`, `.android-toolchain` or `.expo-*` export folders. Local SDK/log/bundle material can inflate uploads or expose configuration; actual cloud archive not built/inspected |
| Generated artifacts tracked | `.expo-check` (54), `.expo-hotel-check` (82), `.expo-preview-check` (12) | 148 tracked generated files including bundle/Hermes artifacts and copied assets; they may retain historical client configuration. No cleanup/history rewrite performed |
| Dependency advisories | `package-lock.json` / npm audit | 32 high and 17 moderate package entries; assess reachable runtime exposure and compatible remediation later |
| Maps client key | `app.config.js:27` | Android Google Maps key present directly in config; not a normal server secret. Retained. Check application restriction for `com.picknbook.com` and correct debug/release/Play app-signing certificate fingerprints, plus API restrictions |
| Release/signing validation | EAS and native build | Store AAB configuration is present, but production signing, Play trusted-source behavior and remote project/Maps settings were not verified by this debug build |

The new `.gitignore` rules are `.env`, `.env.*`, `!.env.example`; `.env*.local` is retained. `.env.example` contains only the variable name and a nonfunctional placeholder. No secrets were committed, removed from source, rotated or transmitted to external services by this audit. Credential candidates were classified by location/type only; no claim is made that all credentials or historical artifacts are clean. No Cashfree server-secret literal or private-key block was found in the inspected application/config text; this is a bounded scan result, not a security guarantee.

Expo prioritizes `.easignore` over `.gitignore`, so the Git ignore fix alone does not protect EAS uploads; see [Expo's upload-ignore documentation](https://docs.expo.dev/build-reference/easignore/). `.easignore` was left unchanged because changing which local configuration reaches a build requires a deliberate build-input review. Google Maps console restrictions were not accessible in this local inspection.

## 15. Dead/duplicate candidates — retain pending review

52 files were outside the static entry-point graph, including the two test/compatibility exceptions described below. That is not a deletion list. Appendix E names every candidate and the graph evidence. Confidence is confidence in **current static non-use**, not permission or certainty that removal is safe.

- **HIGH:** no inbound import/re-export/literal require in the parsed source and no navigator registration: old LoginScreen/LoginScreen1/LoginScreen2; the five redesign components; several superseded hotel/form/flight widgets; WomenZoneBadge; old BottomBar/CancelledBookings/CheckIn/PickCash/styles modules. Before deletion, still check historical feature plans, external usage, runtime-computed references and all supported platform builds.
- **MEDIUM:** orphan ride screens/components, because OS task registration/history and future feature wiring require device review; flight utility/component clusters with only internal orphan imports; alternative root flightCouponService, whose logic differs from the active nested implementation; standalone utility/theme helpers that may be compatibility surfaces.
- **LOW / retain:** `src/hooks/useFlightResults.js` is imported by root `__tests__/useFlightResults.test.js`; the colocated hook test is discovered by test runners rather than app imports. No production inbound import is normal for a test.
- **Explicitly live:** all five `src/practice` files are imported and registered in StackNavigation. PostBusBooking is the active bus booking/review screen. Seater, Sleeper, standard and hybrid layouts are selected routes. Do not delete by folder name or perceived age.
- **Not safe duplicates:** native/web hooks and screens are platform variants; generic checkout and flight payment are both wired; flightBookingService is an active wrapper; top-level and hotelDetails AmenitiesBottomSheet are different components. Consolidation must preserve behavior and references.
- **Asset duplication:** the two hotel images identified above are byte-identical, but source references must be migrated deliberately before deletion.

## 16. Current technical risks and limits

| Priority | Risk | Evidence/next validation |
| --- | --- | --- |
| Highest correctness | Flight SDK mismatch; weak shared verification-body handling; flight booking correlation/default success | Installed SDK/source comparison; later contract-driven tests for pending/failed/paid-but-not-ticketed states |
| Highest release/security | Hotel credentials in client, broad logs, tracked env/generated output and EAS upload exclusions | Locations above; credentials/archives/backend ownership require review before release |
| High architecture | Five Axios clients plus raw fetch, inconsistent auth/timeouts/errors, wallet depending on payment client | Service/direct-call inventory; no common session lifecycle |
| High architecture | AuthContext not provided, duplicated route ownership, broad hotel context and flow data in navigation/storage | Provider/navigation review; test logout and cross-account reset |
| Likely performance | 31.43 MiB asset folder, 19 large media files, eager screen imports and 3.4 s custom splash delay | Static evidence; decode/startup/frame/memory profiling still needed |
| Likely performance | Growing ScrollView booking/transaction lists, large screens and 359 console calls | Prioritize dynamic lists/log volume after correctness; line count itself is not a runtime metric |
| Background/battery | Root 30 s notification poll; payment lifecycle and potential existing location registration | Device/AppState/task-state measurements still required |
| Reliability | Bus city-search catch scope bug, inconsistent stale-search handling, long/unbounded request waits | Static findings; reproduce error/cancellation cases in later phases |
| Verification gap | No device/app launch/memory numbers, no automated payment test harness, no release/store validation | Explicitly unmeasured, not inferred from build success |

## 17. Changes and command ledger

Deliverable modifications:

1. `.gitignore`: three lines added to protect local environment filenames while allowing the example.
2. `.env.example`: three-line public API-origin placeholder and comments; no real value.
3. `docs/PHASE_0_BASELINE.md`: this baseline, inventories, findings and future work order.

Additional ignored local artifacts: `.android-toolchain/phase0/` analysis scripts/JSON/logs, and normal Gradle-generated outputs including the debug APK. Existing runtime/native source/configuration, EAS production settings, package manifests/lockfile and assets were preserved. No commit was created and no files were staged. Initial user working tree was clean; there were no pre-existing uncommitted changes to preserve.

`git diff --stat` (tracked changes only):

```text
 .gitignore | 3 +++
 1 file changed, 3 insertions(+)
```

The new `.env.example` and baseline document are untracked additions, so ordinary `git diff --stat` omits them. Final whitespace validation passes; Git emits only the existing Windows LF-to-CRLF conversion notice. Ignore-rule verification confirms `.env`/`.env.*` are ignored by pattern and `.env.example` is excepted; the already tracked `.env` remains tracked. The report was checked against detected hotel/Maps credential literals and the real local API origin: none appear in it.

Commands executed or their PowerShell equivalents:

```powershell
git status
git branch --show-current
git log -5 --oneline
git ls-files
node -v
npm.cmd -v
npx.cmd expo --version
npx.cmd expo-doctor
npm.cmd ls --depth=0
npx.cmd expo config --type public --json
npm.cmd audit --json
java -version
where.exe java
# Inspected $env:JAVA_HOME, $env:ANDROID_HOME and $env:ANDROID_SDK_ROOT
& 'C:\Users\ADMIN\AppData\Local\Android\Sdk\platform-tools\adb.exe' devices -l
# From android:
.\gradlew.bat -version
.\gradlew.bat app:assembleDebug -x lint -x test --configure-on-demand --build-cache -PreactNativeDevServerPort=8081 '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a' --console=plain
# Repository inspection: rg/rg --files, Get-Content, redacted readers,
# Babel AST/import analysis, file byte/line counts and duplicate SHA-256 checks.
# Final validation:
git diff --check
git check-ignore --no-index -v .env .env.phase0-test .env.example
git diff --stat
git status --short
```

The first native command attempt needed PowerShell quoting around the comma-separated ABI property; the corrected command above is the successful baseline. Read-only inspection path/quoting errors were corrected and do not represent project failures. No `npm audit fix`, upgrade, cleanup/reset, API mutation, production build or payment transaction was performed. No device was available for the conditional install/measurement commands.

## 18. Recommended future phase order — not implemented

| Phase | Work and completion evidence to seek |
| --- | --- |
| 1 — Payments | Reconcile installed Cashfree API usage and the two flows; define verification/fulfillment contracts, idempotency and order correlation; tests for cancellation, pending, failed verification, retries and paid-but-unfulfilled orders |
| 2 — Networking | Shared client/auth/error/timeout/cancellation policy; repair city-search error path; separate wallet from payment transport; validate backend handling of provider credentials |
| 3 — Startup/Home/images | First obtain device launch/PSS/frame baseline; measure splash/fonts/eager imports; resize/encode large assets against visual checks |
| 4 — Bus results | Profile existing FlatList/card rendering, filters/search/debounce and API waits; preserve result behavior |
| 5 — Bus seats | Test all active layouts and booking contracts; optimize geometric layout/rendering only with measurements |
| 6 — Passenger/review/checkout | Separate large form/booking responsibilities with behavioral tests; preserve authoritative pricing, traveler and coupon rules |
| 7 — Bookings | Virtualize large history/transactions, add pagination/loading correctness and correlate confirmed records to orders |
| 8 — Hotels | Session ownership, room/block/pricing flow, gallery/marker measurement and provider-credential backend boundary |
| 9 — Flights | Results/passenger/SSR/seat state, persisted flow lifecycle, confirmation and logging cleanup after payment contract work |
| 10 — Background | Auth/focus/AppState-aware notification/payment work, explicit location registration/stop policy, listener/retry cleanup |
| 11 — Dead/duplicate code | Validate static candidates against tests, all platforms and product intent; remove only confirmed unused artifacts/code |
| 12 — Release verification | Compatible dependency remediation, credential/log/archive review, signing/Maps restrictions, store/trusted-source payment checks, repeat performance and regression measurements |

Credential exposure and release blockers should be reviewed before any production distribution; their review must not be deferred merely because the final release-verification phase is numbered 12. No phase has been started beyond this baseline.

<!-- Generated inventory appendices follow. -->

## Appendix A. All scroll/list JSX locations

Exact JSX element locations; "outside graph" means static entry-point non-reachability, not safe-to-delete. Nested JSX ancestors are syntactic evidence only; cross-component nesting requires the review in section 10. A .map count is lexical and includes transformations, not only rendered cards.

| File | Elements at line | Nested JSX evidence | Map calls | Entry graph |
| --- | --- | --- | --- | --- |
| `src/components/AirportSearchModal.js` | `FlatList:154` | None within this file | 0 | Reachable |
| `src/components/busSeats/SeatBottomSheet.jsx` | `ScrollView:76` | None within this file | 1 | Reachable |
| `src/components/HotelGallery.jsx` | `FlatList:53`, `FlatList:77` | None within this file | 1 | Outside graph |
| `src/components/OffersCarousel.jsx` | `ScrollView:56` | None within this file | 2 | Reachable |
| `src/navigation/CustomDrawer.jsx` | `ScrollView:45` | None within this file | 2 | Reachable |
| `src/practice/PostBusBookingScreen.jsx` | `ScrollView:1768` | None within this file | 29 | Reachable |
| `src/practice/Seater.jsx` | `ScrollView:167` | None within this file | 3 | Reachable |
| `src/practice/SeaterSleeper2Plus1Hybrid.jsx` | `ScrollView:409` | None within this file | 9 | Reachable |
| `src/practice/SeaterSleeper2Plus1Standard.jsx` | `ScrollView:556` | None within this file | 6 | Reachable |
| `src/practice/Sleeper.jsx` | `ScrollView:366`, `ScrollView:368` | ScrollView:368 inside ScrollView | 7 | Reachable |
| `src/screens/auth/user/ChangePassword.jsx` | `ScrollView:204` | None within this file | 0 | Reachable |
| `src/screens/auth/user/CreateAccount.jsx` | `ScrollView:167` | None within this file | 1 | Reachable |
| `src/screens/auth/user/ForgotPassword.jsx` | `ScrollView:80` | None within this file | 0 | Reachable |
| `src/screens/auth/user/MobileLoginScreen.jsx` | `ScrollView:198` | None within this file | 0 | Reachable |
| `src/screens/auth/user/UserLoginScreen.jsx` | `ScrollView:434` | None within this file | 0 | Reachable |
| `src/screens/auth/user/VerifyMobileOtpScreen.jsx` | `ScrollView:251` | None within this file | 0 | Reachable |
| `src/screens/auth/user/VerifyOtp.jsx` | `ScrollView:140` | None within this file | 0 | Reachable |
| `src/screens/booking/BookingDetailsScreen.jsx` | `ScrollView:208` | None within this file | 0 | Reachable |
| `src/screens/dashboard/bottomTabScreens/BookingsScreen.jsx` | `ScrollView:352`, `ScrollView:502` | None within this file | 3 | Reachable |
| `src/screens/dashboard/bottomTabScreens/BordingNDroppingPoints.jsx` | `FlatList:683` | None within this file | 5 | Reachable |
| `src/screens/dashboard/bottomTabScreens/BusBoardingDroppingModal.jsx` | `ScrollView:155` | None within this file | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/BusBookingSection.jsx` | `ScrollView:335` | None within this file | 0 | Reachable |
| `src/screens/dashboard/bottomTabScreens/BusCards.jsx` | `FlatList:905` | None within this file | 0 | Reachable |
| `src/screens/dashboard/bottomTabScreens/BusLocationSearchScreen.jsx` | `FlatList:257` | None within this file | 3 | Reachable |
| `src/screens/dashboard/bottomTabScreens/BusPoliciesModal.jsx` | `ScrollView:207` | None within this file | 1 | Reachable |
| `src/screens/dashboard/bottomTabScreens/BusSeats.jsx` | `ScrollView:179`, `ScrollView:185` | ScrollView:185 inside ScrollView | 3 | Reachable |
| `src/screens/dashboard/bottomTabScreens/CancelledBookings.jsx` | `FlatList:85` | None within this file | 0 | Outside graph |
| `src/screens/dashboard/bottomTabScreens/CheckInScreen.jsx` | `FlatList:88` | None within this file | 0 | Outside graph |
| `src/screens/dashboard/bottomTabScreens/FilterModal.jsx` | `ScrollView:388`, `ScrollView:432`, `ScrollView:499` | ScrollView:499 inside ScrollView | 5 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/components/AirportInput.jsx` | `ScrollView:68` | None within this file | 1 | Outside graph |
| `src/screens/dashboard/bottomTabScreens/flights/components/CompactFlightCard.jsx` | `ScrollView:216` | None within this file | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/components/FareRuleModal.jsx` | `ScrollView:70` | None within this file | 4 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/components/FilterBar.jsx` | `ScrollView:31` | None within this file | 0 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/components/FilterSheet.jsx` | `ScrollView:138` | None within this file | 6 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/components/FlightCard.jsx` | `ScrollView:175`, `ScrollView:211` | None within this file | 2 | Outside graph |
| `src/screens/dashboard/bottomTabScreens/flights/components/FlightItineraryCard.jsx` | `ScrollView:377` | None within this file | 4 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/FlightConfirmationScreen.jsx` | `ScrollView:78` | None within this file | 1 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/FlightDetailsScreen.jsx` | `ScrollView:245` | None within this file | 1 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/FlightListingScreen.jsx` | `ScrollView:568`, `FlatList:654` | None within this file | 5 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/FlightPassengerDetailsScreen.jsx` | `KeyboardAwareScrollView:398` | None within this file | 4 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/FlightPaymentScreen.jsx` | `ScrollView:661` | None within this file | 7 | Reachable |
| `src/screens/dashboard/bottomTabScreens/flights/FlightSeatSelectionScreen.jsx` | `ScrollView:506`, `ScrollView:538`, `ScrollView:544`, `ScrollView:612`, `ScrollView:665`, `ScrollView:689` | ScrollView:544 inside ScrollView; ScrollView:612 inside ScrollView; ScrollView:665 inside ScrollView; ScrollView:689 inside ScrollView | 7 | Reachable |
| `src/screens/dashboard/bottomTabScreens/HelpScreen.jsx` | `ScrollView:84` | None within this file | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/HomeScreen.jsx` | `ScrollView:283`, `ScrollView:343` | ScrollView:343 inside ScrollView | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/HomeScreen.web.jsx` | `ScrollView:62` | None within this file | 1 | Reachable |
| `src/screens/dashboard/bottomTabScreens/HotelBookingConfirmationScreen.jsx` | `ScrollView:89` | None within this file | 0 | Reachable |
| `src/screens/dashboard/bottomTabScreens/hotelCheckoutComponents/CancellationPolicySheet.jsx` | `ScrollView:30` | None within this file | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/hotelCheckoutComponents/CouponBottomSheet.jsx` | `ScrollView:19` | None within this file | 1 | Reachable |
| `src/screens/dashboard/bottomTabScreens/hotelDetailsComponents/AmenitiesBottomSheet.jsx` | `ScrollView:41` | None within this file | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/hotelDetailsComponents/AttractionsPreview.jsx` | `ScrollView:148` | None within this file | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/hotelDetailsComponents/HotelHero.jsx` | `ScrollView:28` | None within this file | 4 | Reachable |
| `src/screens/dashboard/bottomTabScreens/hotelDetailsComponents/RoomSelectionSheet.jsx` | `ScrollView:24` | None within this file | 1 | Reachable |
| `src/screens/dashboard/bottomTabScreens/HotelFilterModal.jsx` | `ScrollView:239` | None within this file | 5 | Reachable |
| `src/screens/dashboard/bottomTabScreens/HotelOfferDetailsScreen.jsx` | `ScrollView:363` | None within this file | 4 | Reachable |
| `src/screens/dashboard/bottomTabScreens/HotelSearchResultsScreen.jsx` | `ScrollView:535`, `BottomSheetFlatList:664`, `ScrollView:712` | ScrollView:712 inside BottomSheetFlatList | 11 | Reachable |
| `src/screens/dashboard/bottomTabScreens/HotelsScreen.jsx` | `ScrollView:346`, `ScrollView:425` | ScrollView:425 inside ScrollView | 6 | Reachable |
| `src/screens/dashboard/bottomTabScreens/NotificationsScreen.jsx` | `FlatList:25` | None within this file | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/OffersScreen.jsx` | `ScrollView:54`, `ScrollView:56` | ScrollView:56 inside ScrollView | 2 | Reachable |
| `src/screens/dashboard/bottomTabScreens/PickCashScreen.jsx` | `ScrollView:59` | None within this file | 1 | Outside graph |
| `src/screens/dashboard/bottomTabScreens/ProfileScreen.jsx` | `ScrollView:333` | None within this file | 0 | Reachable |
| `src/screens/dashboard/bottomTabScreens/RouteHeader.jsx` | `ScrollView:175` | None within this file | 1 | Reachable |
| `src/screens/dashboard/bottomTabScreens/SearchScreen.jsx` | `ScrollView:193` | None within this file | 6 | Reachable |
| `src/screens/dashboard/bottomTabScreens/SortBar.jsx` | `ScrollView:142` | None within this file | 1 | Reachable |
| `src/screens/dashboard/sideBarScreens/B2CBusManagement/PopularRoutes.jsx` | `ScrollView:107`, `ScrollView:184` | None within this file | 2 | Reachable |
| `src/screens/dashboard/sideBarScreens/DashBoards.jsx` | `ScrollView:36` | None within this file | 1 | Reachable |
| `src/screens/FlightSearchScreen.js` | `ScrollView:205` | None within this file | 3 | Reachable |
| `src/screens/HotelPassengerDetailsScreen.jsx` | `ScrollView:639` | None within this file | 2 | Reachable |
| `src/screens/TravelersScreen.js` | `ScrollView:540`, `FlatList:549`, `ScrollView:620` | None within this file | 1 | Reachable |
| `src/screens/wallet/WalletScreen.jsx` | `ScrollView:69` | None within this file | 1 | Reachable |
| `src/screens/wallet/WalletTransactionsScreen.jsx` | `ScrollView:48` | None within this file | 2 | Reachable |

## Appendix B. Twenty largest application source files

Physical line counts include comments/styles/blanks. All requested large-file hotspots are included.

| File | Lines | Classification |
| --- | --- | --- |
| `src/practice/PostBusBookingScreen.jsx` | 3342 | Screen / booking logic |
| `src/screens/dashboard/bottomTabScreens/HotelSearchResultsScreen.jsx` | 1244 | Screen |
| `src/screens/dashboard/bottomTabScreens/BusCards.jsx` | 1217 | Reusable results component |
| `src/screens/TravelersScreen.js` | 1211 | Screen |
| `src/screens/dashboard/bottomTabScreens/BookingsScreen.jsx` | 1181 | Screen |
| `src/screens/dashboard/bottomTabScreens/BordingNDroppingPoints.jsx` | 1153 | Screen / boarding selection |
| `src/screens/dashboard/bottomTabScreens/flights/FlightPaymentScreen.jsx` | 1151 | Screen / payment flow |
| `src/screens/HotelPassengerDetailsScreen.jsx` | 1130 | Screen / booking form |
| `src/screens/dashboard/bottomTabScreens/HotelsScreen.jsx` | 1006 | Screen |
| `src/screens/dashboard/bottomTabScreens/SearchScreen.jsx` | 996 | Screen |
| `src/services/busService.js` | 968 | Service |
| `src/screens/auth/user/UserLoginScreen.jsx` | 960 | Screen |
| `src/screens/dashboard/bottomTabScreens/ProfileScreen.jsx` | 959 | Screen |
| `src/screens/dashboard/bottomTabScreens/flights/FlightListingScreen.jsx` | 942 | Screen |
| `src/services/FlightService.js` | 908 | Service |
| `src/screens/dashboard/bottomTabScreens/HomeScreen.jsx` | 904 | Screen |
| `src/services/hotelService.js` | 895 | Service |
| `src/screens/dashboard/bottomTabScreens/flights/FlightSeatSelectionScreen.jsx` | 790 | Screen |
| `src/practice/SeaterSleeper2Plus1Hybrid.jsx` | 757 | Seat layout |
| `src/screens/dashboard/bottomTabScreens/FilterModal.jsx` | 754 | Reusable filter component |

## Appendix C. Assets over 500 KiB

Threshold: 500 × 1,024 = 512,000 bytes. MiB = bytes / 1,048,576. All files below are images except the MP4.

| Path | Bytes | MiB | Type |
| --- | --- | --- | --- |
| `assets/busBanner.jpg` | 5,234,831 | 4.99 | JPG |
| `assets/Generated image_ Twilight Bayfront Luxury Terrace.png` | 2,974,899 | 2.84 | PNG |
| `assets/DashBoard.png` | 2,549,736 | 2.43 | PNG |
| `assets/apartments-rent-greens-area.jpg` | 2,425,172 | 2.31 | JPG |
| `assets/HotelBanner1.jsx.jpg` | 2,425,172 | 2.31 | JPG |
| `assets/flightBanner.png` | 1,936,967 | 1.85 | PNG |
| `assets/dest_manali.jpg` | 1,171,425 | 1.12 | JPG |
| `assets/loginimage.png` | 1,040,997 | 0.99 | PNG |
| `assets/dest_kerala.jpg` | 1,007,743 | 0.96 | JPG |
| `assets/HotelBanner.jpg` | 987,407 | 0.94 | JPG |
| `assets/dest_goa.jpg` | 975,038 | 0.93 | JPG |
| `assets/BusdrivingAnimation.mp4` | 973,651 | 0.93 | MP4 |
| `assets/hero_bus.jpg` | 958,228 | 0.91 | JPG |
| `assets/mybookings.png` | 888,644 | 0.85 | PNG |
| `assets/hotel.png` | 869,010 | 0.83 | PNG |
| `assets/hero_bg.jpg` | 842,093 | 0.80 | JPG |
| `assets/splash/hotel-hero.jpg` | 648,834 | 0.62 | JPG |
| `assets/offer4.jpg` | 636,306 | 0.61 | JPG |
| `assets/BusListDataLoader.jpg` | 608,110 | 0.58 | JPG |

## Appendix D. Console call hotspots

AST calls to console.log/warn/error only; commented-out code excluded. Counts are call sites, not log events per second.

| File | Total | log / warn / error |
| --- | --- | --- |
| `src/screens/dashboard/bottomTabScreens/flights/FlightPaymentScreen.jsx` | 36 | 33 / 1 / 2 |
| `src/screens/dashboard/bottomTabScreens/flights/FlightPassengerDetailsScreen.jsx` | 30 | 28 / 1 / 1 |
| `src/services/FlightService.js` | 28 | 3 / 8 / 17 |
| `src/screens/dashboard/bottomTabScreens/flights/FlightSeatSelectionScreen.jsx` | 27 | 25 / 2 / 0 |
| `src/screens/dashboard/bottomTabScreens/flights/FlightListingScreen.jsx` | 23 | 16 / 4 / 3 |
| `src/services/locationService.js` | 20 | 12 / 7 / 1 |
| `src/services/busService.js` | 17 | 4 / 6 / 7 |
| `src/practice/PostBusBookingScreen.jsx` | 17 | 14 / 2 / 1 |
| `src/screens/dashboard/bottomTabScreens/BusCards.jsx` | 16 | 15 / 0 / 1 |
| `src/screens/dashboard/bottomTabScreens/flights/FlightConfirmationScreen.jsx` | 11 | 11 / 0 / 0 |
| `src/hooks/useCashfreePayment.js` | 10 | 9 / 0 / 1 |
| `src/services/travelerService.js` | 9 | 0 / 2 / 7 |
| `src/screens/dashboard/bottomTabScreens/flights/services/flightBookingFlowStore.js` | 9 | 5 / 4 / 0 |
| `src/screens/dashboard/bottomTabScreens/RideScreen.jsx` | 8 | 5 / 2 / 1 |
| `src/screens/dashboard/bottomTabScreens/HotelOfferDetailsScreen.jsx` | 8 | 8 / 0 / 0 |

## Appendix E. Static non-reachability candidates

All 52 files outside the application entry graph are listed, including tests/compatibility exceptions. HIGH means strong static evidence of current non-use, not authorization to delete. Platform variants were included in resolution.

| File | Confidence | Evidence / required verification |
| --- | --- | --- |
| `src/components/AirportCard.js` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/AmenitiesBottomSheet.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/busSeats/WomenZoneBadge.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/CabinClassCard.js` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/FareSummaryCard.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/GuestDetailsForm.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/HostCard.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/HotelGallery.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/HotelInfoCard.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/redesign/Header.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/redesign/OptionRow.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/redesign/PrimaryButton.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/redesign/SegmentedControl.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/redesign/TicketCard.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/ride/CustomMarkers.jsx` | MEDIUM | Only inbound from outside-graph module(s): `src/components/ride/RideMap.jsx`. Review whole feature cluster and platform use. |
| `src/components/ride/DriverMarker.jsx` | MEDIUM | Only inbound from outside-graph module(s): `src/components/ride/RideMap.jsx`. Review whole feature cluster and platform use. |
| `src/components/ride/FloatingControls.jsx` | MEDIUM | No inbound app import or navigator registration. Verify persisted location tasks, all platforms and ride feature plans. |
| `src/components/ride/RideBottomSheet.jsx` | MEDIUM | No inbound app import or navigator registration. Verify persisted location tasks, all platforms and ride feature plans. |
| `src/components/ride/RideMap.jsx` | MEDIUM | No inbound app import or navigator registration. Verify persisted location tasks, all platforms and ride feature plans. |
| `src/components/ride/RideStatusBanner.jsx` | MEDIUM | No inbound app import or navigator registration. Verify persisted location tasks, all platforms and ride feature plans. |
| `src/components/ride/TripProgress.jsx` | MEDIUM | Only inbound from outside-graph module(s): `src/components/ride/RideBottomSheet.jsx`. Review whole feature cluster and platform use. |
| `src/components/ride/TripStats.jsx` | MEDIUM | Only inbound from outside-graph module(s): `src/components/ride/RideBottomSheet.jsx`. Review whole feature cluster and platform use. |
| `src/components/RoomCard.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/StayHighlights.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/TravellerCard.js` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/components/TripTypeToggle.js` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/hooks/useFlightResults.js` | LOW — retain | Root __tests__/useFlightResults.test.js imports this compatibility re-export; retain. |
| `src/screens/auth/LoginScreen.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/auth/LoginScreen1.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/auth/LoginScreen2.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/BottomBar.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/CancelledBookings.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/CheckInScreen.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/components/AirportInput.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/components/CabinClassSelector.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/components/FlightCard.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/components/SearchButton.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/components/SeatPopup.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/components/TravellerSelector.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/components/TripTypeSelector.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/constants/travelClasses.js` | MEDIUM | Only inbound from outside-graph module(s): `src/screens/dashboard/bottomTabScreens/flights/utils/validation.js`, `src/screens/dashboard/bottomTabScreens/flights/components/CabinClassSelector.jsx`. Review whole feature cluster and platform use. |
| `src/screens/dashboard/bottomTabScreens/flights/FlightResultsScreen.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/flights/hooks/__tests__/useFlightResults.test.js` | LOW — retain | Test-runner entry; no app import expected. Verify test harness, retain. |
| `src/screens/dashboard/bottomTabScreens/flights/utils/dateUtils.js` | MEDIUM | No inbound app import found. Utility/theme compatibility and external consumers need checking. |
| `src/screens/dashboard/bottomTabScreens/flights/utils/validation.js` | MEDIUM | No inbound app import found. Utility/theme compatibility and external consumers need checking. |
| `src/screens/dashboard/bottomTabScreens/PickCashScreen.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/screens/dashboard/bottomTabScreens/RideScreen.jsx` | MEDIUM | No inbound app import or navigator registration. Verify persisted location tasks, all platforms and ride feature plans. |
| `src/screens/dashboard/bottomTabScreens/RideScreen.web.jsx` | MEDIUM | No inbound app import or navigator registration. Verify persisted location tasks, all platforms and ride feature plans. |
| `src/screens/dashboard/bottomTabScreens/styles.jsx` | HIGH | No inbound import/re-export/literal require in parsed app graph; not registered by navigators. Verify dynamic/external/test consumers before removal. |
| `src/services/flightCouponService.js` | MEDIUM | No inbound app import; active nested implementation differs. Compare public contracts and external consumers. |
| `src/theme/flightTheme.js` | MEDIUM | No inbound app import found. Utility/theme compatibility and external consumers need checking. |
| `src/utils/travelerSelectionHelper.js` | MEDIUM | No inbound app import found. Utility/theme compatibility and external consumers need checking. |

## Appendix F. Source inspection coverage

All JS/JSX files in these directories were included in AST/import/logging/scroll/timer scanning. Files relevant to the findings were also read directly; this table does not claim manual line-by-line review of every style declaration. Root count is App.js and index.js; the separate root test/helper scripts were inspected outside these counts.

| Directory | JS/JSX files |
| --- | --- |
| `.` | 2 |
| `src/bottomSheets` | 2 |
| `src/components` | 19 |
| `src/components/busSeats` | 8 |
| `src/components/redesign` | 5 |
| `src/components/ride` | 8 |
| `src/constants` | 3 |
| `src/context` | 3 |
| `src/hooks` | 4 |
| `src/navigation` | 4 |
| `src/practice` | 5 |
| `src/screens` | 6 |
| `src/screens/auth` | 5 |
| `src/screens/auth/user` | 10 |
| `src/screens/booking` | 1 |
| `src/screens/dashboard/bottomTabScreens` | 35 |
| `src/screens/dashboard/bottomTabScreens/flights` | 9 |
| `src/screens/dashboard/bottomTabScreens/flights/components` | 32 |
| `src/screens/dashboard/bottomTabScreens/flights/constants` | 3 |
| `src/screens/dashboard/bottomTabScreens/flights/hooks` | 1 |
| `src/screens/dashboard/bottomTabScreens/flights/hooks/__tests__` | 1 |
| `src/screens/dashboard/bottomTabScreens/flights/services` | 3 |
| `src/screens/dashboard/bottomTabScreens/flights/theme` | 1 |
| `src/screens/dashboard/bottomTabScreens/flights/utils` | 6 |
| `src/screens/dashboard/bottomTabScreens/hotelCheckoutComponents` | 10 |
| `src/screens/dashboard/bottomTabScreens/hotelDetailsComponents` | 12 |
| `src/screens/dashboard/sideBarScreens` | 1 |
| `src/screens/dashboard/sideBarScreens/B2CBusManagement` | 10 |
| `src/screens/wallet` | 3 |
| `src/services` | 12 |
| `src/tasks` | 1 |
| `src/theme` | 3 |
| `src/utils` | 9 |
