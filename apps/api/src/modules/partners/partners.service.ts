import { prisma } from '../../prisma.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import { storageService } from '../storage/storage.service.js';
import {
  PartnerType,
  PartnerStatus,
  VerificationStatus,
  StorageBookingStatus,
  UserRole,
} from '@travel/shared';
import {
  PartnerOnboardingDto,
  CreatePartnerLocationDto,
  UpdateInventoryPricingDto,
  CreateTransportOptionDto,
} from './partners.dto.js';
import { PaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';

export class PartnersService {
  /**
   * Get partner account profile and status for authenticated user
   */
  async getPartnerProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        email_verified_at: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const partnerAccount = await prisma.partnerAccount.findUnique({
      where: { user_id: userId },
      include: {
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
    });

    if (!partnerAccount) {
      return {
        user,
        has_partner_account: false,
        status: 'unregistered',
      };
    }

    return {
      user,
      has_partner_account: true,
      id: partnerAccount.id,
      type: partnerAccount.type,
      status: partnerAccount.status,
      verified_at: partnerAccount.verified_at,
      storage_provider: partnerAccount.storage_provider,
      transport_provider: partnerAccount.transport_provider,
    };
  }

  /**
   * Submit or update partner onboarding application
   */
  async submitOnboarding(userId: string, dto: PartnerOnboardingDto, correlationId: string) {
    // 1. Check existing partner account
    const existing = await prisma.partnerAccount.findUnique({
      where: { user_id: userId },
      include: { storage_provider: true, transport_provider: true },
    });

    const isStorage = dto.partner_type === PartnerType.STORAGE || dto.partner_type === PartnerType.BOTH;
    const isTransport = dto.partner_type === PartnerType.TRANSPORT || dto.partner_type === PartnerType.BOTH;

    const targetRole = isStorage
      ? UserRole.PARTNER_STORAGE
      : isTransport
      ? UserRole.PARTNER_TRANSPORT
      : UserRole.PARTNER_STORAGE;

    const result = await prisma.$transaction(async (tx) => {
      // Create or update PartnerAccount in pending status
      const account = await tx.partnerAccount.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          type: dto.partner_type,
          status: PartnerStatus.PENDING,
        },
        update: {
          type: dto.partner_type,
          status: PartnerStatus.PENDING, // Re-submitting triggers pending verification
        },
      });

      // Storage Provider
      if (isStorage) {
        await tx.storageProvider.upsert({
          where: { partner_account_id: account.id },
          create: {
            partner_account_id: account.id,
            business_name: dto.business_name,
            verification_status: VerificationStatus.PENDING,
            payout_details_ref: dto.payout_details_ref || null,
          },
          update: {
            business_name: dto.business_name,
            verification_status: VerificationStatus.PENDING,
            payout_details_ref: dto.payout_details_ref || null,
          },
        });
      }

      // Transport Provider
      if (isTransport) {
        await tx.transportProvider.upsert({
          where: { partner_account_id: account.id },
          create: {
            partner_account_id: account.id,
            name: dto.business_name,
            modes_supported: dto.modes_supported || ['taxi', 'rideshare'],
            verification_status: VerificationStatus.PENDING,
          },
          update: {
            name: dto.business_name,
            modes_supported: dto.modes_supported || ['taxi', 'rideshare'],
            verification_status: VerificationStatus.PENDING,
          },
        });
      }

      // Update user role if currently a traveler
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user && user.role === UserRole.TRAVELER) {
        await tx.user.update({
          where: { id: userId },
          data: { role: targetRole },
        });
      }

      return account;
    });

    // Record Audit Event
    await recordAuditEvent({
      actorUserId: userId,
      action: 'PARTNER_ONBOARDING_SUBMITTED',
      entityType: 'PartnerAccount',
      entityId: result.id,
      beforeState: existing ? { status: existing.status } : null,
      afterState: {
        business_name: dto.business_name,
        type: dto.partner_type,
        status: PartnerStatus.PENDING,
      },
      correlationId,
    });

    return {
      message: 'Onboarding application submitted. Pending compliance verification.',
      partner_account_id: result.id,
      status: PartnerStatus.PENDING,
    };
  }

  /**
   * Helper: Ensure partner is verified and return partner provider IDs
   */
  private async requireVerifiedPartner(userId: string, requiredType?: 'storage' | 'transport') {
    const account = await prisma.partnerAccount.findUnique({
      where: { user_id: userId },
      include: { storage_provider: true, transport_provider: true },
    });

    if (!account) {
      throw new AppError('Partner account not found. Please complete onboarding first.', 404, 'NOT_FOUND');
    }

    if (account.status !== PartnerStatus.VERIFIED) {
      throw new AppError(
        `Partner account is currently '${account.status}'. Management features are available only after admin approval.`,
        403,
        'PARTNER_UNVERIFIED'
      );
    }

    if (requiredType === 'storage' && !account.storage_provider) {
      throw new AppError('Not registered as a storage provider.', 403, 'INVALID_PARTNER_TYPE');
    }

    if (requiredType === 'transport' && !account.transport_provider) {
      throw new AppError('Not registered as a transport provider.', 403, 'INVALID_PARTNER_TYPE');
    }

    return account;
  }

  /**
   * List locations belonging to verified storage partner
   */
  async listLocations(userId: string) {
    const account = await this.requireVerifiedPartner(userId, 'storage');
    const providerId = account.storage_provider!.id;

    const locations = await prisma.storageLocation.findMany({
      where: { provider_id: providerId },
      include: {
        inventories: {
          where: {
            date: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
          },
          orderBy: { date: 'asc' },
          take: 7,
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return locations;
  }

  /**
   * Create a new storage location for verified storage partner
   */
  async createLocation(userId: string, dto: CreatePartnerLocationDto, correlationId: string) {
    const account = await this.requireVerifiedPartner(userId, 'storage');
    const providerId = account.storage_provider!.id;

    const defaultHours = {
      mon: { open: '08:00', close: '22:00' },
      tue: { open: '08:00', close: '22:00' },
      wed: { open: '08:00', close: '22:00' },
      thu: { open: '08:00', close: '22:00' },
      fri: { open: '08:00', close: '22:00' },
      sat: { open: '09:00', close: '22:00' },
      sun: { open: '09:00', close: '20:00' },
    };

    const location = await prisma.$transaction(async (tx) => {
      const loc = await tx.storageLocation.create({
        data: {
          provider_id: providerId,
          name: dto.name,
          address: dto.address,
          city: dto.city,
          lat: dto.lat,
          lng: dto.lng,
          opening_hours: dto.opening_hours || defaultHours,
          accepted_item_categories: dto.accepted_item_categories || ['luggage', 'backpack', 'shopping_bags'],
          max_bag_size: dto.max_bag_size || 'large',
          photos: dto.photos && dto.photos.length > 0 ? dto.photos : ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'],
          is_active: true,
        },
      });

      // Seed 14-day upcoming inventory
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() + i);
        d.setUTCHours(0, 0, 0, 0);

        await tx.storageInventory.create({
          data: {
            location_id: loc.id,
            date: d,
            total_capacity: dto.initial_capacity || 20,
            booked_capacity: 0,
            price_per_bag_per_day: dto.price_per_bag_per_day || 6.0,
            version: 0,
          },
        });
      }

      return loc;
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'STORAGE_LOCATION_CREATED',
      entityType: 'StorageLocation',
      entityId: location.id,
      beforeState: null,
      afterState: { name: location.name, city: location.city, capacity: dto.initial_capacity },
      correlationId,
    });

    return location;
  }

  /**
   * Update location inventory and pricing per date
   */
  async updateLocationInventory(
    userId: string,
    locationId: string,
    dto: UpdateInventoryPricingDto,
    correlationId: string
  ) {
    const account = await this.requireVerifiedPartner(userId, 'storage');
    const location = await prisma.storageLocation.findUnique({
      where: { id: locationId },
    });

    if (!location || location.provider_id !== account.storage_provider!.id) {
      throw new AppError('Storage location not found or not owned by partner.', 404, 'LOCATION_NOT_FOUND');
    }

    return storageService.updateInventory(
      userId,
      locationId,
      {
        inventories: [
          {
            date: dto.date,
            total_capacity: dto.total_capacity,
            price_per_bag_per_day: dto.price_per_bag_per_day,
          },
        ],
      },
      correlationId,
      UserRole.PARTNER_STORAGE
    );
  }

  /**
   * List bookings for verified partner's storage or transport services
   */
  async listBookings(userId: string, pagination: PaginationParams, status?: string) {
    const account = await this.requireVerifiedPartner(userId);

    if (account.storage_provider) {
      const locations = await prisma.storageLocation.findMany({
        where: { provider_id: account.storage_provider.id },
        select: { id: true },
      });
      const locationIds = locations.map((l) => l.id);

      const where: any = {
        location_id: { in: locationIds },
        deleted_at: null,
        ...(status ? { status } : {}),
      };

      const [total, items] = await Promise.all([
        prisma.storageBooking.count({ where }),
        prisma.storageBooking.findMany({
          where,
          include: {
            location: { select: { id: true, name: true, address: true, city: true } },
            user: { select: { id: true, full_name: true, email: true, phone: true } },
          },
          orderBy: { created_at: 'desc' },
          skip: pagination.skip,
          take: pagination.limit,
        }),
      ]);

      return formatPaginatedResponse(items, total, pagination.page, pagination.limit);
    }

    if (account.transport_provider) {
      const options = await prisma.transportOption.findMany({
        where: { provider_id: account.transport_provider.id },
        select: { id: true },
      });
      const optionIds = options.map((o) => o.id);

      const where: any = {
        transport_option_id: { in: optionIds },
        ...(status ? { status } : {}),
      };

      const [total, items] = await Promise.all([
        prisma.transportBooking.count({ where }),
        prisma.transportBooking.findMany({
          where,
          include: {
            transport_option: true,
            user: { select: { id: true, full_name: true, email: true, phone: true } },
          },
          orderBy: { created_at: 'desc' },
          skip: pagination.skip,
          take: pagination.limit,
        }),
      ]);

      return formatPaginatedResponse(items, total, pagination.page, pagination.limit);
    }

    return formatPaginatedResponse([], 0, pagination.page, pagination.limit);
  }

  /**
   * Mark storage booking as CHECKED_IN
   */
  async checkInBooking(bookingId: string, userId: string, correlationId: string) {
    const account = await this.requireVerifiedPartner(userId, 'storage');

    const booking = await prisma.storageBooking.findUnique({
      where: { id: bookingId },
      include: { location: true },
    });

    if (!booking) {
      throw new AppError('Storage booking not found.', 404, 'NOT_FOUND');
    }

    if (booking.location.provider_id !== account.storage_provider!.id) {
      throw new AppError('You are not authorized to check in bookings for this location.', 403, 'FORBIDDEN');
    }

    return storageService.transitionBookingStatus(
      bookingId,
      userId,
      UserRole.PARTNER_STORAGE,
      StorageBookingStatus.CHECKED_IN,
      correlationId
    );
  }

  /**
   * Mark storage booking as CHECKED_OUT
   */
  async checkOutBooking(bookingId: string, userId: string, correlationId: string) {
    const account = await this.requireVerifiedPartner(userId, 'storage');

    const booking = await prisma.storageBooking.findUnique({
      where: { id: bookingId },
      include: { location: true },
    });

    if (!booking) {
      throw new AppError('Storage booking not found.', 404, 'NOT_FOUND');
    }

    if (booking.location.provider_id !== account.storage_provider!.id) {
      throw new AppError('You are not authorized to check out bookings for this location.', 403, 'FORBIDDEN');
    }

    return storageService.transitionBookingStatus(
      bookingId,
      userId,
      UserRole.PARTNER_STORAGE,
      StorageBookingStatus.CHECKED_OUT,
      correlationId
    );
  }

  /**
   * Payout summary calculations and stubbed settlement history
   */
  async getPayoutSummary(userId: string) {
    const account = await this.requireVerifiedPartner(userId);

    let grossRevenue = 0;
    let completedBookingsCount = 0;

    if (account.storage_provider) {
      const locations = await prisma.storageLocation.findMany({
        where: { provider_id: account.storage_provider.id },
        select: { id: true },
      });
      const locationIds = locations.map((l) => l.id);

      const bookings = await prisma.storageBooking.findMany({
        where: {
          location_id: { in: locationIds },
          status: { in: [StorageBookingStatus.CONFIRMED, StorageBookingStatus.CHECKED_IN, StorageBookingStatus.CHECKED_OUT] },
        },
        select: { price_total: true, status: true },
      });

      grossRevenue = bookings.reduce((sum, b) => sum + Number(b.price_total), 0);
      completedBookingsCount = bookings.filter((b) => b.status === StorageBookingStatus.CHECKED_OUT).length;
    }

    const platformFeeRate = 0.15; // 15% platform commission
    const platformCommission = Math.round(grossRevenue * platformFeeRate * 100) / 100;
    const netEarnings = Math.round((grossRevenue - platformCommission) * 100) / 100;
    const pendingBalance = Math.round(netEarnings * 0.3 * 100) / 100;
    const availablePayout = Math.round((netEarnings - pendingBalance) * 100) / 100;

    return {
      currency: 'USD',
      gross_revenue: grossRevenue,
      platform_fee_rate: platformFeeRate,
      platform_commission: platformCommission,
      net_earnings: netEarnings,
      available_payout: availablePayout,
      pending_clearance: pendingBalance,
      completed_bookings_count: completedBookingsCount,
      payout_schedule: 'Weekly on Mondays',
      payout_account: account.storage_provider?.payout_details_ref || 'bank_iban_de89370400440532013000',
      settlements: [
        {
          id: 'settlement-st-101',
          date: new Date(Date.now() - 7 * 86400000).toISOString(),
          amount: 245.5,
          currency: 'USD',
          method: 'Bank Wire (DE89...3000)',
          status: 'completed',
          reference: 'SEPA-TRV-89412',
        },
        {
          id: 'settlement-st-102',
          date: new Date(Date.now() - 14 * 86400000).toISOString(),
          amount: 198.0,
          currency: 'USD',
          method: 'Bank Wire (DE89...3000)',
          status: 'completed',
          reference: 'SEPA-TRV-77192',
        },
      ],
    };
  }

  /**
   * Request payout endpoint (stubbed)
   */
  async requestPayout(userId: string, correlationId: string) {
    const summary = await this.getPayoutSummary(userId);

    if (summary.available_payout < 20) {
      throw new AppError('Minimum payout threshold is $20.00.', 400, 'PAYOUT_THRESHOLD_NOT_MET');
    }

    const payoutRef = `PAYOUT-${Date.now().toString(36).toUpperCase()}`;

    await recordAuditEvent({
      actorUserId: userId,
      action: 'PARTNER_PAYOUT_REQUESTED',
      entityType: 'PartnerAccount',
      entityId: payoutRef,
      beforeState: null,
      afterState: {
        amount: summary.available_payout,
        currency: summary.currency,
        account: summary.payout_account,
      },
      correlationId,
    });

    return {
      message: 'Payout request received and queued for processing.',
      payout_reference: payoutRef,
      amount: summary.available_payout,
      currency: summary.currency,
      estimated_arrival: '1-2 business days',
    };
  }
}

export const partnersService = new PartnersService();
