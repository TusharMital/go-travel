# Integrated Travel Support Platform

A modern web application unifying trip/itinerary planning, luggage storage discovery & booking, and last-mile transport discovery & booking into one cohesive workflow.

---

## System Architecture & Monorepo Structure

```
integrated-travel-platform/
├── apps/
│   ├── api/                  # Node.js + TypeScript, Express REST API, Prisma ORM
│   │   ├── prisma/
│   │   │   └── schema.prisma # PostgreSQL domain model & relationships
│   │   └── src/
│   │       ├── adapters/     # Swappable interfaces (Maps, Payments, Notifications, Transport)
│   │       ├── config/       # Environment & configuration validation
│   │       ├── middlewares/  # Auth, Audit, Idempotency, Error Handler
│   │       ├── modules/      # Vertical domain slices (Auth, Trips, Storage, Transport, etc.)
│   │       ├── app.ts        # Express application factory
│   │       └── server.ts     # Process bootstrap & graceful shutdown
│   ├── web/                  # Traveler client (React + Vite + TailwindCSS)
│   ├── partner-portal/       # Storage & Transport Partner portal (React + Vite + TailwindCSS)
│   └── admin/                # Platform Admin & Staff console (React + Vite + TailwindCSS)
├── packages/
│   └── shared/               # Shared domain types, enums, adapter interfaces, and contracts
├── package.json              # Monorepo workspace configuration
├── tsconfig.base.json        # Base strict TypeScript settings
└── .env.example              # Environment variables template
```

---

## Core Build Principles

1. **Vertical Slices over Horizontal Layers**: Each module (Auth, Storage, Transport, Trips, Payments) is built end-to-end: DB schema & migrations $\rightarrow$ API endpoints $\rightarrow$ integration tests $\rightarrow$ frontend screens.
2. **Pluggable Adapter Interfaces**: External services (Maps/Geocoding, Payments, Transport aggregation, Notifications) implement uniform contracts (`IMapsProvider`, `IPaymentsProvider`, `ITransportProviderAdapter`, `INotificationsProvider`) so mock adapters can be swapped for production providers (Stripe, Twilio, SendGrid, Google Maps) without modifying business logic.
3. **Audit Trails for All State Changes**: Every state change (booking created/cancelled, partner verified/suspended, payments captured) generates an immutable `AuditEvent` with actor, action, entity, before/after snapshots, and distributed correlation ID.
4. **Idempotency on Critical Actions**: All booking and payment workflows enforce an `idempotency_key` to guarantee safety against duplicate retries and network race conditions.
5. **Soft-Delete Support**: Core user data and bookings preserve historic integrity via `deleted_at` timestamps.

---

## CI & Developer Commands

```bash
# Install all dependencies across monorepo
npm install

# Start all workspaces concurrently in dev mode
npm run dev

# Run individual apps
npm run dev:api       # Express API on http://localhost:4000
npm run dev:web       # Traveler Web app on http://localhost:3000
npm run dev:partner   # Partner Portal on http://localhost:3001
npm run dev:admin     # Admin & Staff Console on http://localhost:3002

# Run tests
npm run test

# Database management (Prisma)
npm run db:generate   # Generate Prisma Client
npm run db:migrate    # Apply migrations
npm run db:seed       # Seed database with realistic demo data
npm run db:studio     # Launch Prisma Studio GUI
```
