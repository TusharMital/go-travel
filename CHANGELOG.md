# Changelog

All notable changes to the Integrated Travel Support Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Monorepo architecture setup (`/apps/api`, `/apps/web`, `/apps/partner-portal`, `/apps/admin`, `/packages/shared`).
- Comprehensive PostgreSQL database schema via Prisma with UUID primary keys, timestamps, soft-delete, and indexes.
- Database models: `User`, `RefreshToken`, `PartnerAccount`, `StorageProvider`, `StorageLocation`, `StorageInventory`, `Trip`, `ItineraryItem`, `StorageBooking`, `TransportProvider`, `TransportOption`, `TransportBooking`, `Payment`, `Review`, `Notification`, and `AuditEvent`.
- Decoupled external adapter interfaces: `IMapsProvider`, `IPaymentsProvider`, `ITransportProviderAdapter`, and `INotificationsProvider`.
- Default mock adapters with Haversine distance calculations, Stripe-shaped payment intents, console notifications, and transport quotes.
- Core Express middlewares:
  - `authenticate` & `authorize`: Reusable JWT Bearer auth and RBAC guards.
  - `requireIdempotencyKey`: Enforces `Idempotency-Key` header on mutating actions.
  - `correlationIdMiddleware`: Edge generation and response attachment of `X-Correlation-Id`.
  - `errorHandler`: Standardized error responses adhering strictly to `{ error: { code, message, details? } }`.
- Pagination helper: `parsePagination` and `formatPaginatedResponse` supporting `?page=&limit=` returning `{ data, meta: { total, page, limit, totalPages } }`.
- Authentication vertical slice:
  - `POST /api/v1/auth/register` (registers user, creates partner profile if applicable, writes audit log, returns JWT pair).
  - `POST /api/v1/auth/login` (validates credentials, writes audit log, returns JWT pair).
  - `POST /api/v1/auth/refresh` (refresh token rotation with revocation).
  - `POST /api/v1/auth/logout` (revokes refresh token and writes audit event).
  - `GET /api/v1/auth/me` (retrieves authenticated profile with partner linkages).
- Unit and API integration test suite (`apps/api/tests/auth.test.ts`) covering all auth routes, token verification, RBAC, header propagation, and error formatting (11 passing tests).
- Seed script (`apps/api/prisma/seed.ts`) populating 5 users across 5 roles, 10 locations in Berlin and Paris with 14-day inventories, 5 transport options, 3 trips with itinerary gaps, and sample bookings.
- Incremental OpenAPI 3.0.3 specification at `/apps/api/openapi.yaml`.
- CI-ready developer scripts for dev, test, build, migrate, and seed.
