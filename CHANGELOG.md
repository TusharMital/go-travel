# Changelog

All notable changes to the Integrated Travel Support Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Module 4.4: Storage Module (Discovery, Inventory, Booking)**:
  - Discovery endpoint: `GET /api/v1/storage/locations` with geo-radius search, date/time window check, opening hours filter, bag size validation, and weighted composite relevance ranking ($50\%$ distance, $30\%$ rating, $20\%$ price).
  - Location details endpoint: `GET /api/v1/storage/locations/:id` with 14-day upcoming inventory.
  - Partner inventory endpoint: `POST /api/v1/storage/locations/:id/inventory` allowing verified storage partners/admins to configure capacity and pricing per date.
  - Idempotent booking endpoint: `POST /api/v1/storage/bookings` protected by `Idempotency-Key` and executed in an atomic DB transaction with optimistic version checking (`version Int @default(0)` on `StorageInventory`) to prevent overbooking under high concurrency.
  - Concurrency validation: 20 simultaneous requests against 5 remaining slots test asserting exactly 5 succeed (201) and 15 fail safely (409) without overbooking.
  - State machine transitions (`pending` $\rightarrow$ `confirmed` $\rightarrow$ `checked_in` $\rightarrow$ `checked_out`, plus `cancelled`/`expired`) with allowed-transition validation (`canTransitionStorageBooking`).
  - Cancellation flow restoring inventory capacity atomically and initiating payment refund via `IPaymentsProvider`.
  - Immutable audit logs for `STORAGE_BOOKING_CREATED`, `STORAGE_INVENTORY_UPDATED`, `STORAGE_BOOKING_CHECKED_IN`, `STORAGE_BOOKING_CHECKED_OUT`, and `STORAGE_BOOKING_CANCELLED`.
  - Frontend screens in `@travel/web`:
    - `StorageDiscovery`: Split interactive SVG city radar map + responsive card list with filters (dates, bags, size, price, city).
    - `StorageDetailModal`: Comprehensive photo gallery, operating hours, security badges, and direct booking CTA.
    - `StorageBookingModal`: Real-time price breakdown, bag counter, digital payment preview, and instant QR booking pass confirmation.
    - `MyStorageBookings`: Reservation dashboard with status filter tabs, digital pass view, and refund-enabled cancellation action.
    - Deep-link integration from Itinerary gap alert cards ("Find Nearby Storage").
  - Automated tests in `apps/api/tests/storage.test.ts` (14 tests covering discovery, partner auth, idempotency, concurrency, state machine, and cancellation).
  - OpenAPI 3.0.3 specification updated with Storage endpoints and schemas.
- **Module 4.3: Mapping & Location Services**:
  - `LocationProvider` interface in `@travel/shared` with:
    - `geocode(address)`
    - `reverseGeocode(lat, lng)`
    - `distance(a, b)`
    - `estimateWalkingTime(a, b)`
  - Deterministic `MockLocationProvider` implementing `LocationProvider` and backward-compatible `IMapsProvider`:
    - Preset landmark geocoding & reverse geocoding for Berlin, Paris, Tokyo, London, and New York.
    - Deterministic polynomial hash fallback for arbitrary addresses.
    - Haversine distance calculations with meter and kilometer outputs.
    - Pedestrian walking time estimation using 1.2x urban street routing factor and 4.8 km/h walking speed.
  - Pluggable provider factory `getLocationProvider()` in `apps/api/src/adapters/location/` respecting `LOCATION_PROVIDER` / `MAPS_PROVIDER`.
  - Integration with `TripsService` to auto-geocode itinerary item addresses when latitude/longitude are omitted.
  - Dedicated Location REST API endpoints:
    - `GET /api/v1/location/geocode`
    - `GET /api/v1/location/reverse-geocode`
    - `GET` & `POST /api/v1/location/distance`
    - `GET` & `POST /api/v1/location/walking-time`
  - Automated unit and integration tests in `apps/api/tests/location.test.ts` (21 tests).
  - Updated OpenAPI 3.0.3 specification with Location endpoints and schemas.
- **Module 4.2: Trip & Itinerary Planning**:
  - Trip CRUD endpoints: `POST /api/v1/trips`, `GET /api/v1/trips`, `GET /api/v1/trips/:id`, `PUT /api/v1/trips/:id`, `DELETE /api/v1/trips/:id`.
  - Itinerary item CRUD endpoints: `POST /api/v1/trips/:id/itinerary`, `PUT /api/v1/trips/:id/itinerary/:itemId`, `DELETE /api/v1/trips/:id/itinerary/:itemId`.
  - Automated Itinerary Gap Detection endpoint: `GET /api/v1/trips/:id/gaps` detecting arrival-to-checkin and checkout-to-departure gaps with storage and transport recommendations.
  - Full idempotency protection on all mutating trip & itinerary endpoints via `Idempotency-Key` header.
  - Audit logging for `TRIP_CREATED`, `TRIP_UPDATED`, `TRIP_DELETED`, `ITINERARY_ITEM_CREATED`, `ITINERARY_ITEM_UPDATED`, and `ITINERARY_ITEM_DELETED`.
  - Frontend screens:
    - `TripList`: Interactive trips grid with date ranges, stop counts, and new trip modal.
    - `TripTimeline`: Chronological visual stop timeline with highlighted gap warning cards and direct "Find Nearby Storage" CTAs.
    - Add / Edit / Delete itinerary stop modals.
  - Unit and integration tests in `apps/api/tests/trips.test.ts` (12 tests covering CRUD, idempotency, date validation, and gap detection).
- **Module 4.1: Authentication & Users**:
  - Endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
  - Password reset flow: `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`.
  - Email verification flow: `POST /api/v1/auth/verify-email/request`, `POST /api/v1/auth/verify-email/confirm`.
  - Rate limiting on login attempts (max 5 failed attempts per 15 minutes, returning 429 with `Retry-After`).
  - Unit and integration tests in `apps/api/tests/auth.test.ts` (24 tests covering happy and negative paths).
  - Frontend Auth UI with 1-click quick demo logins, password reset, and email verification tokens.
- Monorepo architecture setup (`/apps/api`, `/apps/web`, `/apps/partner-portal`, `/apps/admin`, `/packages/shared`).
- Comprehensive PostgreSQL database schema via Prisma with UUID primary keys, timestamps, soft-delete, and indexes.
- Decoupled external adapter interfaces: `IMapsProvider`, `IPaymentsProvider`, `ITransportProviderAdapter`, and `INotificationsProvider`.
- Core Express middlewares: `authenticate`, `authorize`, `requireVerifiedEmail`, `requireIdempotencyKey`, `correlationIdMiddleware`, and `errorHandler`.
- Incremental OpenAPI 3.0.3 specification at `/apps/api/openapi.yaml`.
