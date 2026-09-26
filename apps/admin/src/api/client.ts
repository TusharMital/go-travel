/**
 * Admin Portal API Client
 * Connects to live backend at /api/v1/admin with fallback mock data for offline preview.
 */

export interface AdminMetrics {
  bookingsToday: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  conversionRate: number;
  cancellationRate: number;
  totalTrips: number;
  tripsWithBookings: number;
  revenueToday: number;
  totalRevenue: number;
  storageBookingsCount: number;
  transportBookingsCount: number;
  storageBookingsToday: number;
  transportBookingsToday: number;
  partners: {
    pending: number;
    verified: number;
    suspended: number;
    total: number;
  };
}

export interface AdminPartner {
  id: string;
  userId: string;
  businessName: string;
  type: 'storage' | 'transport' | 'both';
  status: 'pending' | 'verified' | 'suspended' | 'rejected';
  verifiedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    created_at: string;
  };
  storageProvider?: {
    id: string;
    businessName: string;
    verificationStatus: string;
    payoutDetailsRef?: string;
    locationCount: number;
  } | null;
  transportProvider?: {
    id: string;
    name: string;
    verificationStatus: string;
    modesSupported?: string[];
    optionsCount: number;
  } | null;
}

export interface AdminBooking {
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
  scheduledAt: string;
  returnAt?: string;
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
  createdAt: string;
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  actor: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  beforeState: any;
  afterState: any;
  correlationId: string;
  createdAt: string;
}

const API_BASE_URL = 'http://localhost:4000/api/v1/admin';

// Static demo admin token for local evaluation
const DEMO_ADMIN_TOKEN = 'mock-admin-token-superadmin';

// In-memory fallback mock state for offline or standalone demonstration
let mockPartners: AdminPartner[] = [
  {
    id: 'partner-acc-101',
    userId: 'user-partner-101',
    businessName: 'SafeLuggage Mitte GmbH',
    type: 'storage',
    status: 'pending',
    verifiedAt: null,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    user: {
      id: 'user-partner-101',
      email: 'onboarding@safeluggage.de',
      full_name: 'Helena Berg',
      phone: '+49 30 9876543',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    storageProvider: {
      id: 'sp-101',
      businessName: 'SafeLuggage Mitte GmbH',
      verificationStatus: 'pending',
      payoutDetailsRef: 'DE89370400440532013000',
      locationCount: 2,
    },
    transportProvider: null,
  },
  {
    id: 'partner-acc-102',
    userId: 'user-partner-102',
    businessName: 'Berlin Direct Shuttles',
    type: 'transport',
    status: 'pending',
    verifiedAt: null,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    user: {
      id: 'user-partner-102',
      email: 'fleet@berlindirect.com',
      full_name: 'Marco Rossi',
      phone: '+49 171 4455667',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
    storageProvider: null,
    transportProvider: {
      id: 'tp-102',
      name: 'Berlin Direct Shuttles',
      verificationStatus: 'pending',
      modesSupported: ['taxi', 'rideshare'],
      optionsCount: 3,
    },
  },
  {
    id: 'partner-acc-103',
    userId: 'user-partner-103',
    businessName: 'Zimmer Secure Storage GmbH',
    type: 'storage',
    status: 'verified',
    verifiedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    user: {
      id: 'user-partner-103',
      email: 'hans@berlinstorage.de',
      full_name: 'Hans Zimmer',
      phone: '+49 30 11223344',
      created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    },
    storageProvider: {
      id: 'sp-103',
      businessName: 'Zimmer Secure Storage GmbH',
      verificationStatus: 'verified',
      payoutDetailsRef: 'DE44500105175407324931',
      locationCount: 4,
    },
    transportProvider: null,
  },
];

let mockBookings: AdminBooking[] = [
  {
    id: 'storage-bk-101',
    type: 'STORAGE',
    status: 'checked_in',
    customer: {
      id: 'cust-1',
      fullName: 'Elena Rostova',
      email: 'elena@travel.org',
      phone: '+49 151 2345678',
    },
    serviceName: 'SafeLuggage Berlin Hauptbahnhof',
    serviceAddress: 'Washingtonplatz 1, Berlin',
    scheduledAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    returnAt: new Date(Date.now() + 3600000 * 5).toISOString(),
    bagCount: 2,
    price: 12.0,
    currency: 'USD',
    trip: { id: 'trip-berlin-1', title: 'Autumn in Berlin' },
    payment: {
      id: 'pay-1',
      status: 'captured',
      amount: 12.0,
      providerRef: 'pi_mock_101',
    },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'trans-bk-202',
    type: 'TRANSPORT',
    status: 'confirmed',
    customer: {
      id: 'cust-2',
      fullName: 'Marcus Brody',
      email: 'marcus@museum.org',
      phone: '+1 415 555 0199',
    },
    serviceName: 'Berlin Direct Shuttles (TAXI)',
    serviceAddress: 'Direct Transfer (25 min)',
    scheduledAt: new Date(Date.now() + 3600000 * 2).toISOString(),
    price: 32.5,
    currency: 'USD',
    trip: { id: 'trip-berlin-2', title: 'Museum Island Tour' },
    payment: {
      id: 'pay-2',
      status: 'captured',
      amount: 32.5,
      providerRef: 'pi_mock_202',
    },
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'storage-bk-103',
    type: 'STORAGE',
    status: 'cancelled',
    customer: {
      id: 'cust-3',
      fullName: 'Sophia Chen',
      email: 'sophia@chen.travel',
      phone: '+65 9123 4567',
    },
    serviceName: 'Alexanderplatz Luggage Hub',
    serviceAddress: 'Alexanderplatz 7, Berlin',
    scheduledAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    returnAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    bagCount: 1,
    price: 6.0,
    currency: 'USD',
    trip: null,
    payment: {
      id: 'pay-3',
      status: 'refunded',
      amount: 6.0,
      providerRef: 'pi_mock_103',
    },
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
];

let mockAuditEvents: AdminAuditEvent[] = [
  {
    id: 'audit-001',
    action: 'STORAGE_BOOKING_CHECKED_IN',
    entityType: 'StorageBooking',
    entityId: 'storage-bk-101',
    actorUserId: 'user-partner-103',
    actor: {
      id: 'user-partner-103',
      fullName: 'Hans Zimmer',
      email: 'hans@berlinstorage.de',
      role: 'partner_storage',
    },
    beforeState: { status: 'confirmed' },
    afterState: { status: 'checked_in', bag_count: 2 },
    correlationId: 'corr-checkin-001',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'audit-002',
    action: 'PAYMENT_CAPTURED',
    entityType: 'Payment',
    entityId: 'pay-2',
    actorUserId: 'cust-2',
    actor: {
      id: 'cust-2',
      fullName: 'Marcus Brody',
      email: 'marcus@museum.org',
      role: 'traveler',
    },
    beforeState: { status: 'intent', amount: 32.5 },
    afterState: { status: 'captured', provider_ref: 'pi_mock_202' },
    correlationId: 'corr-pay-002',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'audit-003',
    action: 'PARTNER_ONBOARDING_SUBMITTED',
    entityType: 'PartnerAccount',
    entityId: 'partner-acc-101',
    actorUserId: 'user-partner-101',
    actor: {
      id: 'user-partner-101',
      fullName: 'Helena Berg',
      email: 'onboarding@safeluggage.de',
      role: 'traveler',
    },
    beforeState: null,
    afterState: {
      business_name: 'SafeLuggage Mitte GmbH',
      partner_type: 'storage',
      status: 'pending',
    },
    correlationId: 'corr-onboard-001',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'audit-004',
    action: 'STORAGE_BOOKING_CANCELLED',
    entityType: 'StorageBooking',
    entityId: 'storage-bk-103',
    actorUserId: 'cust-3',
    actor: {
      id: 'cust-3',
      fullName: 'Sophia Chen',
      email: 'sophia@chen.travel',
      role: 'traveler',
    },
    beforeState: { status: 'confirmed' },
    afterState: { status: 'cancelled', refund_issued: true },
    correlationId: 'corr-cancel-004',
    createdAt: new Date(Date.now() - 3600000 * 13).toISOString(),
  },
];

class AdminApiClient {
  private token: string = DEMO_ADMIN_TOKEN;

  setToken(token: string) {
    this.token = token;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      'X-Correlation-Id': `admin-ui-${Date.now()}`,
      ...(options.headers as any),
    };

    return fetch(url, { ...options, headers });
  }

  async getMetrics(): Promise<AdminMetrics> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/metrics`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // Fallback
    }

    // Compute metrics from mock state
    const bookingsToday = mockBookings.length;
    const totalBookings = mockBookings.length;
    const confirmedBookings = mockBookings.filter((b) => b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'checked_out').length;
    const cancelledBookings = mockBookings.filter((b) => b.status === 'cancelled').length;
    const cancellationRate = totalBookings > 0 ? Number(((cancelledBookings / totalBookings) * 100).toFixed(1)) : 0;
    const conversionRate = 42.5; // Mock conversion rate
    const totalRevenue = mockBookings.reduce((sum, b) => (b.status !== 'cancelled' ? sum + b.price : sum), 0);
    const revenueToday = totalRevenue;

    return {
      bookingsToday,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      conversionRate,
      cancellationRate,
      totalTrips: 12,
      tripsWithBookings: 5,
      revenueToday,
      totalRevenue,
      storageBookingsCount: mockBookings.filter((b) => b.type === 'STORAGE').length,
      transportBookingsCount: mockBookings.filter((b) => b.type === 'TRANSPORT').length,
      storageBookingsToday: mockBookings.filter((b) => b.type === 'STORAGE').length,
      transportBookingsToday: mockBookings.filter((b) => b.type === 'TRANSPORT').length,
      partners: {
        pending: mockPartners.filter((p) => p.status === 'pending').length,
        verified: mockPartners.filter((p) => p.status === 'verified').length,
        suspended: mockPartners.filter((p) => p.status === 'suspended').length,
        total: mockPartners.length,
      },
    };
  }

  async getPartners(status = 'all', search?: string): Promise<{ items: AdminPartner[]; counts: any }> {
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      if (search) params.append('search', search);

      const res = await this.fetchWithAuth(`${API_BASE_URL}/partners?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return { items: json.data, counts: json.counts };
      }
    } catch {
      // Fallback
    }

    let filtered = [...mockPartners];
    if (status !== 'all') {
      filtered = filtered.filter((p) => p.status === status);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.businessName.toLowerCase().includes(q) ||
          p.user.full_name.toLowerCase().includes(q) ||
          p.user.email.toLowerCase().includes(q)
      );
    }

    const counts = {
      pending: mockPartners.filter((p) => p.status === 'pending').length,
      verified: mockPartners.filter((p) => p.status === 'verified').length,
      suspended: mockPartners.filter((p) => p.status === 'suspended').length,
      rejected: 0,
      total: mockPartners.length,
    };

    return { items: filtered, counts };
  }

  async approvePartner(id: string, notes?: string): Promise<any> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/partners/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const partner = mockPartners.find((p) => p.id === id);
    if (partner) {
      partner.status = 'verified';
      partner.verifiedAt = new Date().toISOString();
      if (partner.storageProvider) partner.storageProvider.verificationStatus = 'verified';
      if (partner.transportProvider) partner.transportProvider.verificationStatus = 'verified';

      mockAuditEvents.unshift({
        id: `audit-${Date.now()}`,
        action: 'PARTNER_STATUS_CHANGED',
        entityType: 'PartnerAccount',
        entityId: id,
        actorUserId: 'admin-sarah',
        actor: {
          id: 'admin-sarah',
          fullName: 'Sarah Connor',
          email: 'sarah.connor@platform.travel',
          role: 'admin',
        },
        beforeState: { status: 'pending' },
        afterState: { status: 'verified', notes: notes || null },
        correlationId: `corr-approve-${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    }

    return { status: 'success', message: 'Partner approved successfully' };
  }

  async suspendPartner(id: string, reason: string): Promise<any> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/partners/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const partner = mockPartners.find((p) => p.id === id);
    if (partner) {
      const oldStatus = partner.status;
      partner.status = 'suspended';
      if (partner.storageProvider) partner.storageProvider.verificationStatus = 'suspended';
      if (partner.transportProvider) partner.transportProvider.verificationStatus = 'suspended';

      mockAuditEvents.unshift({
        id: `audit-${Date.now()}`,
        action: 'PARTNER_STATUS_CHANGED',
        entityType: 'PartnerAccount',
        entityId: id,
        actorUserId: 'admin-sarah',
        actor: {
          id: 'admin-sarah',
          fullName: 'Sarah Connor',
          email: 'sarah.connor@platform.travel',
          role: 'admin',
        },
        beforeState: { status: oldStatus },
        afterState: { status: 'suspended', reason },
        correlationId: `corr-suspend-${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    }

    return { status: 'success', message: 'Partner suspended successfully' };
  }

  async lookupBookings(query?: string, status?: string, type?: string): Promise<AdminBooking[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (status && status !== 'all') params.append('status', status);
      if (type && type !== 'all') params.append('type', type);

      const res = await this.fetchWithAuth(`${API_BASE_URL}/bookings/lookup?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // Fallback
    }

    let results = [...mockBookings];
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      results = results.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.customer.email.toLowerCase().includes(q) ||
          b.customer.fullName.toLowerCase().includes(q) ||
          b.serviceName.toLowerCase().includes(q)
      );
    }
    if (status && status !== 'all') {
      results = results.filter((b) => b.status === status);
    }
    if (type && type !== 'all') {
      results = results.filter((b) => b.type.toLowerCase() === type.toLowerCase());
    }

    return results;
  }

  async getBookingDetail(type: 'storage' | 'transport', id: string): Promise<any> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/bookings/${type}/${id}`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // Fallback
    }

    const booking = mockBookings.find((b) => b.id === id);
    const relatedAudits = mockAuditEvents.filter((a) => a.entityId === id);

    return {
      booking: booking || { id, status: 'confirmed' },
      payments: booking?.payment ? [booking.payment] : [],
      auditLogs: relatedAudits,
    };
  }

  async getAuditLogs(params: {
    action?: string;
    entityType?: string;
    search?: string;
    page?: number;
  }): Promise<{ events: AdminAuditEvent[]; pagination: any }> {
    try {
      const searchParams = new URLSearchParams();
      if (params.action && params.action !== 'all') searchParams.append('action', params.action);
      if (params.entityType && params.entityType !== 'all') searchParams.append('entityType', params.entityType);
      if (params.search) searchParams.append('search', params.search);
      if (params.page) searchParams.append('page', String(params.page));

      const res = await this.fetchWithAuth(`${API_BASE_URL}/audit-logs?${searchParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return { events: json.data, pagination: json.pagination };
      }
    } catch {
      // Fallback
    }

    let results = [...mockAuditEvents];
    if (params.action && params.action !== 'all') {
      results = results.filter((e) => e.action.includes(params.action!));
    }
    if (params.entityType && params.entityType !== 'all') {
      results = results.filter((e) => e.entityType === params.entityType);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.entityId.toLowerCase().includes(q) ||
          e.correlationId.toLowerCase().includes(q) ||
          e.actor?.email.toLowerCase().includes(q) ||
          e.actor?.fullName.toLowerCase().includes(q)
      );
    }

    return {
      events: results,
      pagination: {
        total: results.length,
        page: params.page || 1,
        limit: 25,
        totalPages: 1,
      },
    };
  }
}

export const adminApi = new AdminApiClient();
