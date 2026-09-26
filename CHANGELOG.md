# Changelog

All notable changes to the Integrated Travel Support Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
