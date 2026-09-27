import { prisma } from '../../prisma.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { PartnerStatus, VerificationStatus, UserRole } from '@travel/shared';
import {
  PartnerQueryInput,
  BookingLookupQueryInput,
  AuditLogQueryInput,
} from './admin.dto.js';
import { Prisma } from '@prisma/client';

export class AdminService {
  /**
   * Basic Metrics Dashboard
   * Computes all metrics strictly from live database records:
   * - bookings today (storage + transport)
   * - conversion rate (trips converted to bookings or confirmed ratio)
   * - cancellation rate (cancelled / total bookings)
   * - revenue today and total GMV
   */
  async getMetrics() {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    const [
      storageToday,
      transportToday,
      totalStorage,
      totalTransport,
      confirmedStorage,
      confirmedTransport,
      cancelledStorage,
      cancelledTransport,
      totalTrips,
      tripsWithStorage,
      tripsWithTransport,
      pendingPartners,
      verifiedPartners,
      suspendedPartners,
      totalPartners,
    ] = await Promise.all([
      prisma.storageBooking.count({ where: { created_at: { gte: startOfToday } } }),
      prisma.transportBooking.count({ where: { created_at: { gte: startOfToday } } }),
      prisma.storageBooking.count(),
      prisma.transportBooking.count(),
      prisma.storageBooking.count({
        where: { status: { in: ['confirmed', 'checked_in', 'checked_out'] } },
      }),
      prisma.transportBooking.count({
        where: { status: { in: ['confirmed', 'completed'] } },
      }),
      prisma.storageBooking.count({ where: { status: 'cancelled' } }),
      prisma.transportBooking.count({ where: { status: 'cancelled' } }),
      prisma.trip.count(),
      prisma.storageBooking.findMany({
        where: { trip_id: { not: null } },
        select: { trip_id: true },
        distinct: ['trip_id'],
      }),
      prisma.transportBooking.findMany({
        where: { trip_id: { not: null } },
        select: { trip_id: true },
        distinct: ['trip_id'],
      }),
      prisma.partnerAccount.count({ where: { status: 'pending' } }),
      prisma.partnerAccount.count({ where: { status: 'verified' } }),
      prisma.partnerAccount.count({ where: { status: 'suspended' } }),
      prisma.partnerAccount.count(),
    ]);

    const bookingsToday = storageToday + transportToday;
    const totalBookings = totalStorage + totalTransport;
    const confirmedBookings = confirmedStorage + confirmedTransport;
    const cancelledBookings = cancelledStorage + cancelledTransport;

    // Cancellation rate (% of total created bookings that were cancelled)
    const cancellationRate =
      totalBookings > 0
        ? Number(((cancelledBookings / totalBookings) * 100).toFixed(1))
        : 0;

    // Conversion rate (% of trips with bookings, or confirmed / total bookings if trips=0)
    const uniqueTripIdsWithBookings = new Set([
      ...tripsWithStorage.map((t) => t.trip_id).filter(Boolean),
      ...tripsWithTransport.map((t) => t.trip_id).filter(Boolean),
    ]);
    const tripsWithBookings = uniqueTripIdsWithBookings.size;

    const conversionRate =
      totalTrips > 0
        ? Number(((tripsWithBookings / totalTrips) * 100).toFixed(1))
        : totalBookings > 0
        ? Number(((confirmedBookings / totalBookings) * 100).toFixed(1))
        : 0;

    // Aggregate revenues
    const [storageRevTotal, transportRevTotal, storageRevToday, transportRevToday] =
      await Promise.all([
        prisma.storageBooking.aggregate({
          where: { status: { in: ['confirmed', 'checked_in', 'checked_out'] } },
          _sum: { price_total: true },
        }),
        prisma.transportBooking.aggregate({
          where: { status: { in: ['confirmed', 'completed'] } },
          _sum: { price_total: true },
        }),
        prisma.storageBooking.aggregate({
          where: {
            status: { in: ['confirmed', 'checked_in', 'checked_out'] },
            created_at: { gte: startOfToday },
          },
          _sum: { price_total: true },
        }),
        prisma.transportBooking.aggregate({
          where: {
            status: { in: ['confirmed', 'completed'] },
            created_at: { gte: startOfToday },
          },
          _sum: { price_total: true },
        }),
      ]);

    const totalRevenue =
      Number(storageRevTotal._sum.price_total || 0) +
      Number(transportRevTotal._sum.price_total || 0);

    const revenueToday =
      Number(storageRevToday._sum.price_total || 0) +
      Number(transportRevToday._sum.price_total || 0);

    return {
      bookingsToday,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      conversionRate, // e.g. 50.0
      cancellationRate, // e.g. 10.0
      totalTrips,
      tripsWithBookings,
      revenueToday: Number(revenueToday.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      storageBookingsCount: totalStorage,
      transportBookingsCount: totalTransport,
      storageBookingsToday: storageToday,
      transportBookingsToday: transportToday,
      partners: {
        pending: pendingPartners,
        verified: verifiedPartners,
        suspended: suspendedPartners,
        total: totalPartners,
      },
    };
  }

  /**
   * Partner Verification Queue
   * List partners with filtering and search
   */
  async getPartners(params: PartnerQueryInput) {
    const { status, type, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PartnerAccountWhereInput = {};

    if (status && status !== 'all') {
      where.status = status as PartnerStatus;
    }

    if (type && type !== 'all') {
      where.type = type as any;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { storage_provider: { business_name: { contains: q, mode: 'insensitive' } } },
        { transport_provider: { name: { contains: q, mode: 'insensitive' } } },
        { user: { full_name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [partners, total, counts] = await Promise.all([
      prisma.partnerAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              full_name: true,
              phone: true,
              created_at: true,
            },
          },
          storage_provider: {
            include: {
              _count: { select: { locations: true } },
            },
          },
          transport_provider: {
            include: {
              _count: { select: { options: true } },
            },
          },
        },
      }),
      prisma.partnerAccount.count({ where }),
      prisma.partnerAccount.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = {
      pending: 0,
      verified: 0,
      suspended: 0,
      rejected: 0,
      total: 0,
    };

    counts.forEach((c) => {
      if (c.status in statusCounts) {
        statusCounts[c.status as keyof typeof statusCounts] = c._count._all;
      }
      statusCounts.total += c._count._all;
    });

    const items = partners.map((p) => {
      const businessName =
        p.storage_provider?.business_name ||
        p.transport_provider?.name ||
        p.user.full_name;

      return {
        id: p.id,
        userId: p.user_id,
        businessName,
        type: p.type,
        status: p.status,
        verifiedAt: p.verified_at,
        createdAt: p.created_at,
        user: p.user,
        storageProvider: p.storage_provider
          ? {
              id: p.storage_provider.id,
              businessName: p.storage_provider.business_name,
              verificationStatus: p.storage_provider.verification_status,
              payoutDetailsRef: p.storage_provider.payout_details_ref,
              locationCount: p.storage_provider._count.locations,
            }
          : null,
        transportProvider: p.transport_provider
          ? {
              id: p.transport_provider.id,
              name: p.transport_provider.name,
              verificationStatus: p.transport_provider.verification_status,
              modesSupported: p.transport_provider.modes_supported,
              optionsCount: p.transport_provider._count.options,
            }
          : null,
      };
    });

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: statusCounts,
    };
  }

  /**
   * Get single partner profile with full details and audit logs
   */
  async getPartnerById(id: string) {
    const partner = await prisma.partnerAccount.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            phone: true,
            role: true,
            created_at: true,
          },
        },
        storage_provider: {
          include: {
            locations: {
              include: {
                _count: { select: { bookings: true, inventories: true } },
              },
            },
          },
        },
        transport_provider: {
          include: {
            options: {
              include: {
                _count: { select: { bookings: true } },
              },
            },
          },
        },
      },
    });

    if (!partner) {
      throw new AppError('Partner account not found.', 404, 'NOT_FOUND');
    }

    // Retrieve audit events for this partner
    const auditLogs = await prisma.auditEvent.findMany({
      where: {
        OR: [
          { entity_id: id },
          { entity_id: partner.user_id },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return {
      partner,
      auditLogs,
    };
  }

  /**
   * Approve Partner
   * Transitions partner account to verified and notifies partner
   */
  async approvePartner(
    id: string,
    notes: string | undefined,
    adminUserId: string,
    correlationId: string
  ) {
    const partner = await prisma.partnerAccount.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!partner) {
      throw new AppError('Partner account not found.', 404, 'NOT_FOUND');
    }

    // Use notificationsService.updatePartnerStatus to handle DB transaction, audit log & notification dispatch
    const updatedAccount = await notificationsService.updatePartnerStatus(
      id,
      PartnerStatus.VERIFIED,
      notes || 'Application approved by platform compliance team.',
      adminUserId,
      correlationId
    );

    // Update user role if currently traveler
    if (partner.user.role === UserRole.TRAVELER) {
      const targetRole =
        partner.type === 'transport'
          ? UserRole.PARTNER_TRANSPORT
          : UserRole.PARTNER_STORAGE;

      await prisma.user.update({
        where: { id: partner.user_id },
        data: { role: targetRole },
      });
    }

    return updatedAccount;
  }

  /**
   * Suspend Partner
   * Transitions partner account to suspended with mandatory reason
   */
  async suspendPartner(
    id: string,
    reason: string,
    adminUserId: string,
    correlationId: string
  ) {
    if (!reason || reason.trim().length < 3) {
      throw new AppError('Suspension reason is mandatory.', 400, 'INVALID_REASON');
    }

    const partner = await prisma.partnerAccount.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new AppError('Partner account not found.', 404, 'NOT_FOUND');
    }

    // Use notificationsService.updatePartnerStatus to handle DB transaction, audit log & notification dispatch
    const updatedAccount = await notificationsService.updatePartnerStatus(
      id,
      PartnerStatus.SUSPENDED,
      reason.trim(),
      adminUserId,
      correlationId
    );

    return updatedAccount;
  }

  /**
   * Booking Lookup by ID or Customer Email
   * Searches across storage bookings and transport bookings
   */
  async lookupBookings(params: BookingLookupQueryInput) {
    const { query, status, type = 'all', limit = 20 } = params;

    let matchedUserIds: string[] = [];

    if (query && query.trim()) {
      const q = query.trim();
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { full_name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      matchedUserIds = users.map((u) => u.id);
    }

    const results: Array<{
      id: string;
      type: 'STORAGE' | 'TRANSPORT';
      status: string;
      customer: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
      };
      serviceName: string;
      serviceAddress: string;
      scheduledAt: Date;
      returnAt?: Date;
      bagCount?: number;
      price: number;
      currency: string;
      trip: { id: string; title: string } | null;
      payment?: {
        id: string;
        status: string;
        amount: number;
        providerRef: string | null;
      } | null;
      createdAt: Date;
    }> = [];

    // Query Storage Bookings
    if (type === 'all' || type === 'storage') {
      const storageWhere: Prisma.StorageBookingWhereInput = {};

      if (query && query.trim()) {
        const q = query.trim();
        storageWhere.OR = [
          { id: { contains: q, mode: 'insensitive' } },
          { idempotency_key: { contains: q, mode: 'insensitive' } },
          ...(matchedUserIds.length > 0 ? [{ user_id: { in: matchedUserIds } }] : []),
        ];
      }

      if (status && status !== 'all') {
        storageWhere.status = status as any;
      }

      const storageBookings = await prisma.storageBooking.findMany({
        where: storageWhere,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: { id: true, full_name: true, email: true, phone: true },
          },
          location: {
            select: { name: true, address: true, city: true },
          },
          trip: {
            select: { id: true, title: true },
          },
        },
      });

      const storageBookingIds = storageBookings.map((b) => b.id);
      const storagePayments = storageBookingIds.length > 0
        ? await prisma.payment.findMany({
            where: {
              related_id: { in: storageBookingIds },
              related_type: 'storage_booking',
            },
          })
        : [];
      const paymentMap = new Map((storagePayments || []).map((p) => [p.related_id, p]));

      storageBookings.forEach((b) => {
        const payment = paymentMap.get(b.id);
        results.push({
          id: b.id,
          type: 'STORAGE',
          status: b.status,
          customer: {
            id: b.user.id,
            fullName: b.user.full_name,
            email: b.user.email,
            phone: b.user.phone,
          },
          serviceName: b.location.name,
          serviceAddress: `${b.location.address}, ${b.location.city}`,
          scheduledAt: b.drop_off_at,
          returnAt: b.pick_up_at,
          bagCount: b.bag_count,
          price: Number(b.price_total),
          currency: b.currency,
          trip: b.trip ? { id: b.trip.id, title: b.trip.title } : null,
          payment: payment
            ? {
                id: payment.id,
                status: payment.status,
                amount: Number(payment.amount),
                providerRef: payment.provider_ref,
              }
            : null,
          createdAt: b.created_at,
        });
      });
    }

    // Query Transport Bookings
    if (type === 'all' || type === 'transport') {
      const transportWhere: Prisma.TransportBookingWhereInput = {};

      if (query && query.trim()) {
        const q = query.trim();
        transportWhere.OR = [
          { id: { contains: q, mode: 'insensitive' } },
          { idempotency_key: { contains: q, mode: 'insensitive' } },
          ...(matchedUserIds.length > 0 ? [{ user_id: { in: matchedUserIds } }] : []),
        ];
      }

      if (status && status !== 'all') {
        transportWhere.status = status as any;
      }

      const transportBookings = await prisma.transportBooking.findMany({
        where: transportWhere,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: { id: true, full_name: true, email: true, phone: true },
          },
          transport_option: {
            include: { provider: true },
          },
          trip: {
            select: { id: true, title: true },
          },
        },
      });

      const transportBookingIds = transportBookings.map((b) => b.id);
      const transportPayments = transportBookingIds.length > 0
        ? await prisma.payment.findMany({
            where: {
              related_id: { in: transportBookingIds },
              related_type: 'transport_booking',
            },
          })
        : [];
      const paymentMap = new Map((transportPayments || []).map((p) => [p.related_id, p]));

      transportBookings.forEach((b) => {
        const payment = paymentMap.get(b.id);
        results.push({
          id: b.id,
          type: 'TRANSPORT',
          status: b.status,
          customer: {
            id: b.user.id,
            fullName: b.user.full_name,
            email: b.user.email,
            phone: b.user.phone,
          },
          serviceName: `${b.transport_option.provider.name} (${b.transport_option.mode.toUpperCase()})`,
          serviceAddress: `Direct Transfer (${b.transport_option.estimated_duration_min} min)`,
          scheduledAt: b.scheduled_at,
          price: Number(b.price_total),
          currency: b.currency,
          trip: b.trip ? { id: b.trip.id, title: b.trip.title } : null,
          payment: payment
            ? {
                id: payment.id,
                status: payment.status,
                amount: Number(payment.amount),
                providerRef: payment.provider_ref,
              }
            : null,
          createdAt: b.created_at,
        });
      });
    }

    // Sort by createdAt desc and slice to limit
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return results.slice(0, limit);
  }

  /**
   * Get single booking detail with linked audit trail
   */
  async getBookingDetail(type: 'storage' | 'transport', id: string) {
    if (type === 'storage') {
      const booking = await prisma.storageBooking.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, full_name: true, email: true, phone: true },
          },
          location: {
            include: { provider: true },
          },
          trip: true,
          itinerary_items: true,
        },
      });

      if (!booking) {
        throw new AppError('Storage booking not found.', 404, 'NOT_FOUND');
      }

      const [payments, auditLogs] = await Promise.all([
        prisma.payment.findMany({
          where: { related_id: id, related_type: 'storage_booking' },
          orderBy: { created_at: 'desc' },
        }),
        prisma.auditEvent.findMany({
          where: { entity_id: id },
          orderBy: { created_at: 'desc' },
          include: {
            actor: {
              select: { id: true, full_name: true, email: true, role: true },
            },
          },
        }),
      ]);

      return {
        booking: {
          ...booking,
          price_total: Number(booking.price_total),
        },
        type: 'STORAGE',
        payments,
        auditLogs,
      };
    } else {
      const booking = await prisma.transportBooking.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, full_name: true, email: true, phone: true },
          },
          transport_option: {
            include: { provider: true },
          },
          trip: true,
          itinerary_items: true,
        },
      });

      if (!booking) {
        throw new AppError('Transport booking not found.', 404, 'NOT_FOUND');
      }

      const [payments, auditLogs] = await Promise.all([
        prisma.payment.findMany({
          where: { related_id: id, related_type: 'transport_booking' },
          orderBy: { created_at: 'desc' },
        }),
        prisma.auditEvent.findMany({
          where: { entity_id: id },
          orderBy: { created_at: 'desc' },
          include: {
            actor: {
              select: { id: true, full_name: true, email: true, role: true },
            },
          },
        }),
      ]);

      return {
        booking: {
          ...booking,
          price_total: Number(booking.price_total),
        },
        type: 'TRANSPORT',
        payments,
        auditLogs,
      };
    }
  }

  /**
   * Audit Log Viewer with Filters
   */
  async getAuditLogs(params: AuditLogQueryInput) {
    const {
      action,
      entityType,
      entityId,
      actorId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 25,
    } = params;

    const skip = (page - 1) * limit;
    const where: Prisma.AuditEventWhereInput = {};

    if (action && action.trim()) {
      where.action = { contains: action.trim(), mode: 'insensitive' };
    }

    if (entityType && entityType.trim()) {
      where.entity_type = entityType.trim();
    }

    if (entityId && entityId.trim()) {
      where.entity_id = { contains: entityId.trim(), mode: 'insensitive' };
    }

    if (actorId && actorId.trim()) {
      where.actor_user_id = actorId.trim();
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        // If end date is YYYY-MM-DD, include the full day
        const end = new Date(endDate);
        if (endDate.length === 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        where.created_at.lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entity_type: { contains: q, mode: 'insensitive' } },
        { entity_id: { contains: q, mode: 'insensitive' } },
        { correlation_id: { contains: q, mode: 'insensitive' } },
        { actor: { email: { contains: q, mode: 'insensitive' } } },
        { actor: { full_name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              full_name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return {
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        entityType: e.entity_type,
        entityId: e.entity_id,
        actorUserId: e.actor_user_id,
        actor: e.actor
          ? {
              id: e.actor.id,
              fullName: e.actor.full_name,
              email: e.actor.email,
              role: e.actor.role,
            }
          : null,
        beforeState: e.before_state,
        afterState: e.after_state,
        correlationId: e.correlation_id,
        createdAt: e.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Dedicated support/admin query to retrieve all audit events for a specific entity ID
   * in chronological order with actor information and state diffs.
   */
  async getAuditLogsByEntityId(entityId: string) {
    const events = await prisma.auditEvent.findMany({
      where: {
        entity_id: entityId,
      },
      orderBy: { created_at: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      entityId,
      total: events.length,
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        entityType: e.entity_type,
        entityId: e.entity_id,
        actorUserId: e.actor_user_id,
        actor: e.actor
          ? {
              id: e.actor.id,
              fullName: e.actor.full_name,
              email: e.actor.email,
              role: e.actor.role,
            }
          : null,
        beforeState: e.before_state,
        afterState: e.after_state,
        correlationId: e.correlation_id,
        createdAt: e.created_at,
      })),
    };
  }
}

export const adminService = new AdminService();

