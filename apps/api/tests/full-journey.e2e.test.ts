import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { resetRateLimits } from '../src/middlewares/rate-limit.middleware.js';
import { UserRole, StorageBookingStatus, TransportBookingStatus, PaymentStatus } from '@travel/shared';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

// Hoisted schema-compliant in-memory store and Prisma mock
const { db, mockPrismaClient } = vi.hoisted(() => {
  const nodeCrypto = require('node:crypto');
  const uuid = () => nodeCrypto.randomUUID();

  const db = {
    users: [] as any[],
    refreshTokens: [] as any[],
    partnerAccounts: [] as any[],
    trips: [] as any[],
    itineraryItems: [] as any[],
    storageLocations: [] as any[],
    storageInventories: [] as any[],
    storageBookings: [] as any[],
    transportOptions: [] as any[],
    transportProviders: [] as any[],
    transportBookings: [] as any[],
    payments: [] as any[],
    reviews: [] as any[],
    auditEvents: [] as any[],
  };

  const client: any = {
    user: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.email) return db.users.find((u) => u.email === where.email.toLowerCase()) || null;
        if (where?.id) return db.users.find((u) => u.id === where.id) || null;
        if (where?.role) return db.users.find((u) => u.role === where.role) || null;
        return db.users[0] || null;
      }),
      findUnique: vi.fn(async ({ where }: any = {}) => {
        if (where?.id) return db.users.find((u) => u.id === where.id) || null;
        if (where?.email) return db.users.find((u) => u.email === where.email.toLowerCase()) || null;
        return null;
      }),
      findMany: vi.fn(async () => db.users),
      create: vi.fn(async ({ data }: any) => {
        const user = {
          id: uuid(),
          email: data.email.toLowerCase(),
          password_hash: data.password_hash,
          full_name: data.full_name,
          phone: data.phone || null,
          role: data.role || 'traveler',
          email_verified_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        };
        db.users.push(user);
        return user;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const u = db.users.find((user) => user.id === where.id || user.email === where.email?.toLowerCase());
        if (u) Object.assign(u, data, { updated_at: new Date() });
        return u;
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 'deleted' }),
      count: vi.fn(async () => db.users.length),
    },
    refreshToken: {
      findUnique: vi.fn(async () => ({ id: 'rt-1', token_hash: 'hash', expires_at: new Date(Date.now() + 100000) })),
      create: vi.fn().mockResolvedValue({ id: 'rt-1', token_hash: 'hash' }),
      update: vi.fn().mockResolvedValue({ id: 'rt-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    passwordResetToken: {
      findUnique: vi.fn().mockResolvedValue({ id: 'prt-1', token_hash: 'hash', expires_at: new Date(Date.now() + 100000) }),
      create: vi.fn().mockResolvedValue({ id: 'prt-1' }),
      delete: vi.fn().mockResolvedValue({ id: 'prt-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    emailVerificationToken: {
      findUnique: vi.fn().mockResolvedValue({ id: 'evt-1', token_hash: 'hash', expires_at: new Date(Date.now() + 100000) }),
      create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
      delete: vi.fn().mockResolvedValue({ id: 'evt-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    partnerAccount: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.user_id) return db.partnerAccounts.find((p) => p.user_id === where.user_id) || null;
        if (where?.type) return db.partnerAccounts.find((p) => p.type === where.type) || db.partnerAccounts[0] || null;
        return db.partnerAccounts[0] || null;
      }),
      findUnique: vi.fn(async ({ where }: any = {}) => {
        if (where?.id) return db.partnerAccounts.find((p) => p.id === where.id) || null;
        if (where?.user_id) return db.partnerAccounts.find((p) => p.user_id === where.user_id) || null;
        return null;
      }),
      findMany: vi.fn(async () => db.partnerAccounts),
      create: vi.fn(async ({ data }: any) => {
        const pa = { id: uuid(), status: 'verified', created_at: new Date(), ...data };
        db.partnerAccounts.push(pa);
        return pa;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const pa = db.partnerAccounts.find((p) => p.id === where.id);
        if (pa) Object.assign(pa, data);
        return pa;
      }),
      count: vi.fn(async () => db.partnerAccounts.length),
      groupBy: vi.fn(async () => []),
    },
    trip: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.id) return db.trips.find((t) => t.id === where.id) || null;
        return db.trips[0] || null;
      }),
      findUnique: vi.fn(async ({ where }: any = {}) => {
        return db.trips.find((t) => t.id === where.id) || null;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        if (where?.user_id) return db.trips.filter((t) => t.user_id === where.user_id);
        return db.trips;
      }),
      create: vi.fn(async ({ data }: any) => {
        const trip = {
          id: uuid(),
          user_id: data.user_id,
          title: data.title,
          origin_place: data.origin_place,
          destination_place: data.destination_place,
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
          timezone: data.timezone || 'UTC',
          status: data.status || 'planning',
          created_at: new Date(),
          updated_at: new Date(),
          itinerary_items: [],
        };
        db.trips.push(trip);
        return trip;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const trip = db.trips.find((t) => t.id === where.id);
        if (trip) Object.assign(trip, data, { updated_at: new Date() });
        return trip;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const idx = db.trips.findIndex((t) => t.id === where.id);
        if (idx !== -1) return db.trips.splice(idx, 1)[0];
        return null;
      }),
      count: vi.fn(async () => db.trips.length),
    },
    itineraryItem: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        return db.itineraryItems.find((i) => i.id === where?.id) || null;
      }),
      findUnique: vi.fn(async ({ where }: any = {}) => {
        return db.itineraryItems.find((i) => i.id === where.id) || null;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        if (where?.trip_id) return db.itineraryItems.filter((i) => i.trip_id === where.trip_id);
        return db.itineraryItems;
      }),
      create: vi.fn(async ({ data }: any) => {
        const item = { id: uuid(), created_at: new Date(), updated_at: new Date(), ...data };
        db.itineraryItems.push(item);
        return item;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const item = db.itineraryItems.find((i) => i.id === where.id);
        if (item) Object.assign(item, data, { updated_at: new Date() });
        return item;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const idx = db.itineraryItems.findIndex((i) => i.id === where.id);
        if (idx !== -1) return db.itineraryItems.splice(idx, 1)[0];
        return null;
      }),
      count: vi.fn(async () => db.itineraryItems.length),
    },
    storageLocation: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.id) return db.storageLocations.find((l) => l.id === where.id) || null;
        return db.storageLocations[0] || null;
      }),
      findUnique: vi.fn(async ({ where }: any = {}) => {
        return db.storageLocations.find((l) => l.id === where.id) || null;
      }),
      findMany: vi.fn(async () => db.storageLocations),
      create: vi.fn(async ({ data }: any) => {
        const loc = { id: uuid(), ...data };
        db.storageLocations.push(loc);
        return loc;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const loc = db.storageLocations.find((l) => l.id === where.id);
        if (loc) Object.assign(loc, data);
        return loc;
      }),
      count: vi.fn(async () => db.storageLocations.length),
    },
    storageInventory: {
      findUnique: vi.fn(async ({ where }: any = {}) => {
        const locId = where?.location_id_date?.location_id || where?.location_id;
        return db.storageInventories.find((i) => i.location_id === locId) || null;
      }),
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.location_id) return db.storageInventories.find((i) => i.location_id === where.location_id) || null;
        return db.storageInventories[0] || null;
      }),
      findMany: vi.fn(async () => db.storageInventories),
      create: vi.fn(async ({ data }: any) => {
        const inv = { id: uuid(), ...data, version: 0 };
        db.storageInventories.push(inv);
        return inv;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const inv = db.storageInventories.find((i) => i.id === where.id);
        if (inv) Object.assign(inv, data);
        return inv;
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 'deleted' }),
      count: vi.fn(async () => db.storageInventories.length),
    },
    storageBooking: {
      findUnique: vi.fn(async ({ where }: any = {}) => {
        if (where?.id) return db.storageBookings.find((b) => b.id === where.id) || null;
        if (where?.idempotency_key) return db.storageBookings.find((b) => b.idempotency_key === where.idempotency_key) || null;
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.id) return db.storageBookings.find((b) => b.id === where.id) || null;
        return db.storageBookings[0] || null;
      }),
      findMany: vi.fn(async () => db.storageBookings),
      create: vi.fn(async ({ data }: any) => {
        const booking = {
          id: uuid(),
          status: 'confirmed',
          created_at: new Date(),
          updated_at: new Date(),
          ...data,
          location: db.storageLocations.find((l) => l.id === data.location_id) || db.storageLocations[0],
        };
        db.storageBookings.push(booking);
        return booking;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const booking = db.storageBookings.find((b) => b.id === where.id);
        if (booking) {
          Object.assign(booking, data, { updated_at: new Date() });
        }
        return booking;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const b of db.storageBookings) {
          if (!where?.id || b.id === where.id) {
            Object.assign(b, data);
            count++;
          }
        }
        return { count };
      }),
      count: vi.fn(async () => db.storageBookings.length),
      aggregate: vi.fn(async () => ({ _sum: { price_total: 100 }, _count: { _all: db.storageBookings.length } })),
    },
    transportOption: {
      findMany: vi.fn(async () => db.transportOptions),
      findUnique: vi.fn(async ({ where }: any = {}) => {
        return db.transportOptions.find((t) => t.id === where.id) || null;
      }),
      findFirst: vi.fn(async ({ where }: any = {}) => {
        return db.transportOptions.find((t) => t.id === where?.id) || db.transportOptions[0] || null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const opt = {
          id: data.id || uuid(),
          ...data,
          provider: { name: 'Berlin City Taxi eG', verification_status: 'VERIFIED' },
        };
        db.transportOptions.push(opt);
        return opt;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const opt = db.transportOptions.find((t) => t.id === where.id);
        if (opt) Object.assign(opt, data);
        return opt;
      }),
      count: vi.fn(async () => db.transportOptions.length),
    },
    transportProvider: {
      findFirst: vi.fn(async () => db.transportProviders[0] || { id: 'tp-1', name: 'Berlin City Taxi eG', verification_status: 'verified' }),
      findUnique: vi.fn(async ({ where }: any = {}) => db.transportProviders.find((p) => p.id === where.id) || { id: where.id, name: 'Berlin City Taxi eG' }),
      findMany: vi.fn(async () => db.transportProviders),
      create: vi.fn(async ({ data }: any) => {
        const p = { id: uuid(), ...data };
        db.transportProviders.push(p);
        return p;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const p = db.transportProviders.find((item) => item.id === where.id);
        if (p) Object.assign(p, data);
        return p;
      }),
      count: vi.fn(async () => db.transportProviders.length),
    },
    transportBooking: {
      findUnique: vi.fn(async ({ where }: any = {}) => {
        if (where?.id) return db.transportBookings.find((b) => b.id === where.id) || null;
        if (where?.idempotency_key) return db.transportBookings.find((b) => b.idempotency_key === where.idempotency_key) || null;
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.id) return db.transportBookings.find((b) => b.id === where.id) || null;
        return db.transportBookings[0] || null;
      }),
      findMany: vi.fn(async () => db.transportBookings),
      create: vi.fn(async ({ data }: any) => {
        const booking = {
          id: uuid(),
          status: 'confirmed',
          created_at: new Date(),
          updated_at: new Date(),
          ...data,
          transport_option: db.transportOptions.find((o) => o.id === data.transport_option_id) || db.transportOptions[0],
        };
        db.transportBookings.push(booking);
        return booking;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const booking = db.transportBookings.find((b) => b.id === where.id);
        if (booking) {
          Object.assign(booking, data, { updated_at: new Date() });
        }
        return booking;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const b of db.transportBookings) {
          if (!where?.id || b.id === where.id) {
            Object.assign(b, data);
            count++;
          }
        }
        return { count };
      }),
      count: vi.fn(async () => db.transportBookings.length),
      aggregate: vi.fn(async () => ({ _sum: { price_total: 100 }, _count: { _all: db.transportBookings.length } })),
    },
    payment: {
      findUnique: vi.fn(async ({ where }: any = {}) => {
        if (where?.idempotency_key) return db.payments.find((p) => p.idempotency_key === where.idempotency_key) || null;
        if (where?.provider_ref) return db.payments.find((p) => p.provider_ref === where.provider_ref) || null;
        if (where?.id) return db.payments.find((p) => p.id === where.id) || null;
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.idempotency_key) return db.payments.find((p) => p.idempotency_key === where.idempotency_key) || null;
        if (where?.provider_ref) return db.payments.find((p) => p.provider_ref === where.provider_ref) || null;
        if (where?.id) return db.payments.find((p) => p.id === where.id) || null;
        return null;
      }),
      findMany: vi.fn(async () => db.payments),
      create: vi.fn(async ({ data }: any) => {
        const p = { id: uuid(), status: 'intent', ...data };
        db.payments.push(p);
        return p;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const p = db.payments.find((item) => item.provider_ref === where.provider_ref || item.id === where.id);
        if (p) Object.assign(p, data);
        return p;
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn(async () => db.payments.length),
      aggregate: vi.fn(async () => ({ _sum: { amount: 100 } })),
    },
    review: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (where?.booking_id) return db.reviews.find((r) => r.booking_id === where.booking_id) || null;
        return db.reviews[0] || null;
      }),
      findUnique: vi.fn(async ({ where }: any = {}) => {
        return db.reviews.find((r) => r.id === where.id) || null;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        let list = db.reviews;
        if (where?.related_id) list = list.filter((r) => r.related_id === where.related_id);
        return list.map((r) => ({
          ...r,
          user: r.user || db.users.find((u) => u.id === r.user_id) || { id: r.user_id, full_name: 'Alex Explorer' },
        }));
      }),
      create: vi.fn(async ({ data }: any) => {
        const user = db.users.find((u) => u.id === data.user_id) || {
          id: data.user_id,
          full_name: 'Alex Explorer',
          email: 'alex.globetrotter@test.com',
        };
        const rev = {
          id: uuid(),
          created_at: new Date(),
          ...data,
          user,
        };
        db.reviews.push(rev);
        return rev;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const r = db.reviews.find((item) => item.id === where.id);
        if (r) Object.assign(r, data);
        return r;
      }),
      count: vi.fn(async ({ where }: any = {}) => {
        const matching = db.reviews.filter((r) => !where?.related_id || r.related_id === where.related_id);
        return matching.length;
      }),
      aggregate: vi.fn(async ({ where }: any = {}) => {
        const matching = db.reviews.filter((r) => !where?.related_id || r.related_id === where.related_id);
        const count = matching.length;
        const sum = matching.reduce((acc, r) => acc + (r.rating || 0), 0);
        return {
          _count: { _all: count },
          _avg: { rating: count > 0 ? sum / count : null },
        };
      }),
      groupBy: vi.fn(async ({ where }: any = {}) => {
        const matching = db.reviews.filter((r) => !where?.related_id || r.related_id === where.related_id);
        const map = new Map<number, number>();
        for (const r of matching) {
          map.set(r.rating, (map.get(r.rating) || 0) + 1);
        }
        return Array.from(map.entries()).map(([rating, count]) => ({
          rating,
          _count: { _all: count },
        }));
      }),
    },
    auditEvent: {
      findMany: vi.fn(async ({ where }: any = {}) => {
        if (where?.entity_id) {
          return db.auditEvents.filter((e) => e.entity_id === where.entity_id);
        }
        return db.auditEvents;
      }),
      findFirst: vi.fn(async () => db.auditEvents[0] || null),
      findUnique: vi.fn(async ({ where }: any = {}) => db.auditEvents.find((e) => e.id === where.id) || null),
      create: vi.fn(async ({ data }: any) => {
        const event = { id: uuid(), created_at: new Date(), ...data };
        db.auditEvents.push(event);
        return event;
      }),
      count: vi.fn(async () => db.auditEvents.length),
    },
  };

  client.$transaction = vi.fn(async (arg: any) => {
    if (typeof arg === 'function') {
      return arg(client);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  });

  return { db, mockPrismaClient: client };
});

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrismaClient,
}));

describe('4.14 End-to-End Traveler Journey (E2E Test)', () => {
  let app: any;
  let partnerUserId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();

    // Reset In-Memory Database Store
    db.users.length = 0;
    db.refreshTokens.length = 0;
    db.partnerAccounts.length = 0;
    db.trips.length = 0;
    db.itineraryItems.length = 0;
    db.storageBookings.length = 0;
    db.transportBookings.length = 0;
    db.payments.length = 0;
    db.reviews.length = 0;
    db.auditEvents.length = 0;

    const locationId = randomUUID();
    const inventoryId = randomUUID();
    const transportOptId = randomUUID();
    partnerUserId = randomUUID();

    db.storageLocations = [
      {
        id: locationId,
        name: 'Berlin Hauptbahnhof Secure Locker Hub',
        address: 'Europaplatz 1, 10557 Berlin',
        city: 'Berlin',
        lat: 52.5255,
        lng: 13.3695,
        is_active: true,
        price_per_bag_per_day: 6.0,
        provider: {
          business_name: 'SafeStorage Berlin GmbH',
          verification_status: 'VERIFIED',
          partner_account: { user_id: partnerUserId },
        },
        inventories: [
          {
            id: inventoryId,
            location_id: locationId,
            date: new Date('2026-10-15T00:00:00Z'),
            total_capacity: 50,
            booked_capacity: 10,
            price_per_bag_per_day: 6.0,
          },
        ],
      },
    ];

    db.storageInventories = [
      {
        id: inventoryId,
        location_id: locationId,
        date: new Date('2026-10-15T00:00:00Z'),
        total_capacity: 50,
        booked_capacity: 10,
        price_per_bag_per_day: 6.0,
      },
    ];

    db.transportOptions = [
      {
        id: transportOptId,
        mode: 'taxi',
        origin_lat: 52.5255,
        origin_lng: 13.3695,
        dest_lat: 52.5200,
        dest_lng: 13.4050,
        estimated_price: 18.5,
        estimated_duration_min: 15,
        currency: 'USD',
        provider: { name: 'Berlin City Taxi eG', business_name: 'Berlin City Taxi eG', verification_status: 'VERIFIED' },
      },
    ];

    db.transportProviders = [
      { id: 'tp-1', name: 'Berlin City Taxi eG', verification_status: 'verified' },
    ];

    app = createApp();
  });

  it('successfully executes the full end-to-end journey: register → trip → storage search → storage book → payment → transport search → transport book → luggage checkout → post-checkout review', async () => {
    // -------------------------------------------------------------
    // Step 1: Register Traveler Account
    // -------------------------------------------------------------
    // Negative test: password too short
    const shortPwdRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'alex.globetrotter@test.com',
        password: 'short',
        full_name: 'Alex Explorer',
      });
    expect(shortPwdRes.status).toBe(400);
    expect(shortPwdRes.body.error.code).toBe('VALIDATION_ERROR');

    // Happy Path: Register valid traveler
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'alex.globetrotter@test.com',
        password: 'SecurePassword123!',
        full_name: 'Alex Explorer',
        phone: '+49 170 1234567',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.accessToken).toBeDefined();
    expect(registerRes.body.user.email).toBe('alex.globetrotter@test.com');

    const travelerToken = registerRes.body.accessToken;

    // -------------------------------------------------------------
    // Step 2: Create a Trip (Itinerary Planning)
    // -------------------------------------------------------------
    // Negative test: end_date < start_date
    const invalidTripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('Idempotency-Key', 'idem-trip-inv-1')
      .send({
        title: 'Invalid Date Trip',
        origin_place: 'Frankfurt Airport',
        destination_place: 'Berlin Alexanderplatz',
        start_date: '2026-10-20T10:00:00.000Z',
        end_date: '2026-10-15T18:00:00.000Z', // Before start_date!
      });
    expect(invalidTripRes.status).toBe(400);
    expect(invalidTripRes.body.error.code).toBe('VALIDATION_ERROR');

    // Happy Path: Create valid trip
    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('Idempotency-Key', 'idem-trip-001')
      .send({
        title: 'Berlin Autumn Exploration',
        origin_place: 'Frankfurt Airport',
        destination_place: 'Berlin Hauptbahnhof',
        start_date: '2026-10-15T09:00:00.000Z',
        end_date: '2026-10-18T18:00:00.000Z',
        timezone: 'Europe/Berlin',
      });

    expect(tripRes.status).toBe(201);
    expect(tripRes.body.id).toBeDefined();
    expect(tripRes.body.title).toBe('Berlin Autumn Exploration');
    const tripId = tripRes.body.id;

    // -------------------------------------------------------------
    // Step 3: Search Storage Locations near Arrival Station
    // -------------------------------------------------------------
    const storageSearchRes = await request(app)
      .get('/api/v1/storage/locations')
      .query({
        lat: 52.5255,
        lng: 13.3695,
        radius_km: 5,
        drop_off_at: '2026-10-15T10:00:00.000Z',
        pick_up_at: '2026-10-15T18:00:00.000Z',
        bag_count: 2,
      });

    expect(storageSearchRes.status).toBe(200);
    expect(storageSearchRes.body.data.length).toBeGreaterThan(0);
    const chosenLocation = storageSearchRes.body.data[0];
    expect(chosenLocation.id).toBeDefined();

    // -------------------------------------------------------------
    // Step 4: Book Luggage Storage with Idempotency Key
    // -------------------------------------------------------------
    const storageBookingRes = await request(app)
      .post('/api/v1/storage/bookings')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('Idempotency-Key', 'idem-storage-bk-001')
      .send({
        location_id: chosenLocation.id,
        trip_id: tripId,
        bag_count: 2,
        drop_off_at: '2026-10-15T10:00:00.000Z',
        pick_up_at: '2026-10-15T18:00:00.000Z',
        currency: 'USD',
      });

    expect(storageBookingRes.status).toBe(201);
    expect(storageBookingRes.body.id).toBeDefined();
    const storageBookingId = storageBookingRes.body.id;

    // -------------------------------------------------------------
    // Step 5: Pay for Storage Booking (Intent + Capture)
    // -------------------------------------------------------------
    const paymentIntentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('Idempotency-Key', 'idem-pay-intent-001')
      .send({
        amount: 12.0,
        currency: 'USD',
        related_type: 'storage_booking',
        related_id: storageBookingId,
      });

    expect(paymentIntentRes.status).toBe(201);
    expect(paymentIntentRes.body.payment.provider_ref).toBeDefined();
    const providerRef = paymentIntentRes.body.payment.provider_ref;

    const captureRes = await request(app)
      .post('/api/v1/payments/capture')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        provider_ref: providerRef,
        amount: 12.0,
      });

    expect(captureRes.status).toBe(200);
    expect(captureRes.body.status).toBe(PaymentStatus.CAPTURED);

    // -------------------------------------------------------------
    // Step 6: Search Last-Mile Transport to Hotel
    // -------------------------------------------------------------
    const transportSearchRes = await request(app)
      .get('/api/v1/transport/options')
      .query({
        origin_lat: 52.5255,
        origin_lng: 13.3695,
        dest_lat: 52.5200,
        dest_lng: 13.4050,
        scheduled_at: '2026-10-15T18:30:00.000Z',
        mode: 'taxi',
      });

    expect(transportSearchRes.status).toBe(200);
    expect(transportSearchRes.body.data.length).toBeGreaterThan(0);
    const chosenTransport = transportSearchRes.body.data[0];

    // -------------------------------------------------------------
    // Step 7: Book Transport Transfer
    // -------------------------------------------------------------
    const transportBookingRes = await request(app)
      .post('/api/v1/transport/bookings')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('Idempotency-Key', 'idem-trans-bk-001')
      .send({
        transport_option_id: chosenTransport.id,
        trip_id: tripId,
        scheduled_at: '2026-10-15T18:30:00.000Z',
        notes: 'Please meet in front of Europaplatz exit',
      });

    expect(transportBookingRes.status).toBe(201);
    expect(transportBookingRes.body.booking.id).toBeDefined();

    // -------------------------------------------------------------
    // Step 8: Storage Check-In & Check-Out Lifecycle
    // -------------------------------------------------------------
    const partnerToken = jwt.sign(
      { id: partnerUserId, email: 'partner@berlinstorage.com', role: UserRole.PARTNER_STORAGE },
      env.JWT_ACCESS_SECRET
    );

    // Check-in by storage partner
    const checkInRes = await request(app)
      .post(`/api/v1/storage/bookings/${storageBookingId}/check-in`)
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(checkInRes.status).toBe(200);

    // Negative test: Attempt review BEFORE checkout (traveler is not allowed until checked_out)
    const prematureReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        bookingId: storageBookingId,
        rating: 5,
        comment: 'Great so far!',
      });
    expect(prematureReviewRes.status).toBe(400);
    expect(prematureReviewRes.body.error.code).toBe('BOOKING_NOT_CHECKED_OUT');

    // Check-out by storage partner
    const checkOutRes = await request(app)
      .post(`/api/v1/storage/bookings/${storageBookingId}/check-out`)
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(checkOutRes.status).toBe(200);

    // -------------------------------------------------------------
    // Step 9: Post-Checkout Review Submission
    // -------------------------------------------------------------
    const reviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        bookingId: storageBookingId,
        rating: 5,
        comment: 'Flawless luggage dropoff and pickup! Highly recommend.',
      });

    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.status).toBe('success');
    expect(reviewRes.body.data.id).toBeDefined();
    expect(reviewRes.body.data.rating).toBe(5);

    // Verify duplicate review submission rejected
    const dupReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        bookingId: storageBookingId,
        rating: 4,
        comment: 'Trying to review twice',
      });
    expect(dupReviewRes.status).toBe(409);
    expect(dupReviewRes.body.error.code).toBe('DUPLICATE_REVIEW');

    // Verify rating aggregates updated
    const locReviewsRes = await request(app).get(`/api/v1/reviews/storage/${chosenLocation.id}`);
    expect(locReviewsRes.status).toBe(200);
    expect(locReviewsRes.body.aggregates.totalReviews).toBeGreaterThan(0);
    expect(locReviewsRes.body.aggregates.averageRating).toBe(5.0);

    // Verify full audit trail for the booking exists
    const adminToken = jwt.sign(
      { id: 'admin_audit_verifier', email: 'admin@travel.com', role: 'admin' },
      env.JWT_ACCESS_SECRET
    );

    const auditRes = await request(app)
      .get(`/api/v1/admin/audit-logs/entity/${storageBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.events.length).toBeGreaterThan(0);
  });
});
