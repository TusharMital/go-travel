const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export interface PartnerProfile {
  has_partner_account: boolean;
  status: 'unregistered' | 'pending' | 'verified' | 'suspended';
  id?: string;
  type?: 'storage' | 'transport' | 'both';
  verified_at?: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  storage_provider?: {
    id: string;
    business_name: string;
    verification_status: string;
    payout_details_ref?: string;
  };
  transport_provider?: {
    id: string;
    name: string;
    modes_supported: string[];
    verification_status: string;
  };
}

export interface PartnerLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  is_active: boolean;
  opening_hours: Record<string, { open: string; close: string }>;
  accepted_item_categories: string[];
  max_bag_size: string;
  inventories?: Array<{
    id: string;
    date: string;
    total_capacity: number;
    booked_capacity: number;
    price_per_bag_per_day: number;
  }>;
  _count?: { bookings: number };
}

export interface PartnerBooking {
  id: string;
  location_id?: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  bag_count?: number;
  price_total: number;
  currency: string;
  drop_off_at: string;
  pick_up_at: string;
  created_at: string;
  location?: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
}

export interface PayoutSummary {
  currency: string;
  gross_revenue: number;
  platform_fee_rate: number;
  platform_commission: number;
  net_earnings: number;
  available_payout: number;
  pending_clearance: number;
  completed_bookings_count: number;
  payout_schedule: string;
  payout_account: string;
  settlements: Array<{
    id: string;
    date: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    reference: string;
  }>;
}

// In-memory demo data for standalone or offline review
let demoProfile: PartnerProfile = {
  has_partner_account: true,
  status: 'verified',
  id: 'partner-acc-demo-1',
  type: 'storage',
  verified_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  user: {
    id: 'user-storage-partner-1',
    email: 'storage.partner@example.com',
    full_name: 'Helena Berg',
    role: 'partner_storage',
  },
  storage_provider: {
    id: 'prov-demo-storage',
    business_name: 'Berlin SafeStorage Network GmbH',
    verification_status: 'verified',
    payout_details_ref: 'DE89370400440532013000',
  },
};

let demoLocations: PartnerLocation[] = [
  {
    id: 'loc-berlin-alex',
    name: 'Alexanderplatz Luggage Hub',
    address: 'Dircksenstrasse 2',
    city: 'Berlin',
    lat: 52.5219,
    lng: 13.4132,
    is_active: true,
    opening_hours: {
      mon: { open: '08:00', close: '22:00' },
      tue: { open: '08:00', close: '22:00' },
      wed: { open: '08:00', close: '22:00' },
      thu: { open: '08:00', close: '22:00' },
      fri: { open: '08:00', close: '22:00' },
      sat: { open: '09:00', close: '22:00' },
      sun: { open: '09:00', close: '20:00' },
    },
    accepted_item_categories: ['luggage', 'backpack', 'shopping_bags'],
    max_bag_size: 'oversized',
    inventories: [
      { id: 'inv-1', date: new Date().toISOString().split('T')[0], total_capacity: 40, booked_capacity: 12, price_per_bag_per_day: 6.5 },
      { id: 'inv-2', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], total_capacity: 40, booked_capacity: 8, price_per_bag_per_day: 6.5 },
      { id: 'inv-3', date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], total_capacity: 40, booked_capacity: 5, price_per_bag_per_day: 7.0 },
    ],
    _count: { bookings: 18 },
  },
  {
    id: 'loc-berlin-hbf',
    name: 'Berlin Hauptbahnhof Lockers & Safekeep',
    address: 'Europaplatz 1',
    city: 'Berlin',
    lat: 52.5251,
    lng: 13.3694,
    is_active: true,
    opening_hours: {
      mon: { open: '06:00', close: '23:00' },
      tue: { open: '06:00', close: '23:00' },
      wed: { open: '06:00', close: '23:00' },
      thu: { open: '06:00', close: '23:00' },
      fri: { open: '06:00', close: '23:00' },
      sat: { open: '06:00', close: '23:00' },
      sun: { open: '06:00', close: '23:00' },
    },
    accepted_item_categories: ['luggage', 'backpack'],
    max_bag_size: 'large',
    inventories: [
      { id: 'inv-4', date: new Date().toISOString().split('T')[0], total_capacity: 30, booked_capacity: 15, price_per_bag_per_day: 7.0 },
      { id: 'inv-5', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], total_capacity: 30, booked_capacity: 10, price_per_bag_per_day: 7.0 },
    ],
    _count: { bookings: 24 },
  },
];

let demoBookings: PartnerBooking[] = [
  {
    id: 'sb-booking-101',
    location_id: 'loc-berlin-alex',
    user_id: 'u-traveler-1',
    status: 'confirmed',
    bag_count: 2,
    price_total: 13.0,
    currency: 'USD',
    drop_off_at: new Date(Date.now() + 2 * 3600000).toISOString(),
    pick_up_at: new Date(Date.now() + 8 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    location: {
      id: 'loc-berlin-alex',
      name: 'Alexanderplatz Luggage Hub',
      address: 'Dircksenstrasse 2',
      city: 'Berlin',
    },
    user: {
      id: 'u-traveler-1',
      full_name: 'Elena Rostova',
      email: 'elena.traveler@example.com',
      phone: '+49 151 2345678',
    },
  },
  {
    id: 'sb-booking-102',
    location_id: 'loc-berlin-alex',
    user_id: 'u-traveler-2',
    status: 'checked_in',
    bag_count: 1,
    price_total: 6.5,
    currency: 'USD',
    drop_off_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    pick_up_at: new Date(Date.now() + 4 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    location: {
      id: 'loc-berlin-alex',
      name: 'Alexanderplatz Luggage Hub',
      address: 'Dircksenstrasse 2',
      city: 'Berlin',
    },
    user: {
      id: 'u-traveler-2',
      full_name: 'Marcus Brody',
      email: 'marcus.brody@example.com',
      phone: '+49 172 9876543',
    },
  },
  {
    id: 'sb-booking-103',
    location_id: 'loc-berlin-hbf',
    user_id: 'u-traveler-3',
    status: 'checked_out',
    bag_count: 3,
    price_total: 21.0,
    currency: 'USD',
    drop_off_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    pick_up_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    location: {
      id: 'loc-berlin-hbf',
      name: 'Berlin Hauptbahnhof Lockers & Safekeep',
      address: 'Europaplatz 1',
      city: 'Berlin',
    },
    user: {
      id: 'u-traveler-3',
      full_name: 'Sophie Laurent',
      email: 'sophie.laurent@example.com',
      phone: '+33 6 12345678',
    },
  },
];

class PartnerApiClient {
  private getToken(): string | null {
    return localStorage.getItem('partner_portal_token') || localStorage.getItem('travel_access_token');
  }

  setToken(token: string) {
    localStorage.setItem('partner_portal_token', token);
  }

  clearToken() {
    localStorage.removeItem('partner_portal_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Backend not running or offline: proceed to mock fallback
    }

    // Mock fallback handling for standalone preview & dev evaluation
    if (endpoint === '/partners/me') {
      return demoProfile as unknown as T;
    }

    if (endpoint === '/partners/onboard' && options.method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      demoProfile = {
        has_partner_account: true,
        status: 'pending',
        id: `partner-acc-${Date.now()}`,
        type: body.partner_type || 'storage',
        user: {
          id: 'user-partner-onboarded',
          email: 'partner.onboarded@example.com',
          full_name: body.contact_name || 'Business Partner',
          role: 'partner_storage',
        },
        storage_provider: {
          id: `storage-prov-${Date.now()}`,
          business_name: body.business_name,
          verification_status: 'pending',
          payout_details_ref: body.payout_details_ref || 'DE89370400440532013000',
        },
      };
      return {
        message: 'Onboarding application submitted. Pending compliance verification.',
        partner_account_id: demoProfile.id,
        status: 'pending',
      } as unknown as T;
    }

    if (endpoint === '/partners/locations') {
      if (options.method === 'POST') {
        const body = JSON.parse((options.body as string) || '{}');
        const newLoc: PartnerLocation = {
          id: `loc-new-${Date.now()}`,
          name: body.name,
          address: body.address,
          city: body.city,
          lat: body.lat,
          lng: body.lng,
          is_active: true,
          opening_hours: body.opening_hours || { mon: { open: '08:00', close: '22:00' } },
          accepted_item_categories: body.accepted_item_categories || ['luggage', 'backpack'],
          max_bag_size: body.max_bag_size || 'large',
          inventories: [
            { id: `inv-${Date.now()}`, date: new Date().toISOString().split('T')[0], total_capacity: body.initial_capacity || 20, booked_capacity: 0, price_per_bag_per_day: body.price_per_bag_per_day || 6.0 },
          ],
          _count: { bookings: 0 },
        };
        demoLocations.unshift(newLoc);
        return newLoc as unknown as T;
      }
      return { data: demoLocations } as unknown as T;
    }

    if (endpoint.includes('/inventory') && options.method === 'POST') {
      const locId = endpoint.split('/')[3];
      const body = JSON.parse((options.body as string) || '{}');
      const loc = demoLocations.find((l) => l.id === locId);
      if (loc && loc.inventories) {
        loc.inventories.unshift({
          id: `inv-${Date.now()}`,
          date: body.date,
          total_capacity: body.total_capacity,
          booked_capacity: 0,
          price_per_bag_per_day: body.price_per_bag_per_day,
        });
      }
      return { message: 'Inventory updated successfully.', count: 1 } as unknown as T;
    }

    if (endpoint.startsWith('/partners/bookings')) {
      if (endpoint.includes('/check-in') && options.method === 'PATCH') {
        const id = endpoint.split('/')[3];
        const b = demoBookings.find((x) => x.id === id);
        if (b) b.status = 'checked_in';
        return { message: 'Booking checked in successfully.', booking: b } as unknown as T;
      }

      if (endpoint.includes('/check-out') && options.method === 'PATCH') {
        const id = endpoint.split('/')[3];
        const b = demoBookings.find((x) => x.id === id);
        if (b) b.status = 'checked_out';
        return { message: 'Booking checked out successfully.', booking: b } as unknown as T;
      }

      const url = new URL(`http://localhost${endpoint}`);
      const status = url.searchParams.get('status');
      let filtered = [...demoBookings];
      if (status) {
        filtered = filtered.filter((b) => b.status === status);
      }
      return {
        data: filtered,
        meta: { total: filtered.length, page: 1, limit: 20, totalPages: 1 },
      } as unknown as T;
    }

    if (endpoint === '/partners/payouts/summary') {
      return {
        currency: 'USD',
        gross_revenue: 1420.5,
        platform_fee_rate: 0.15,
        platform_commission: 213.08,
        net_earnings: 1207.42,
        available_payout: 980.5,
        pending_clearance: 226.92,
        completed_bookings_count: 42,
        payout_schedule: 'Weekly on Mondays',
        payout_account: demoProfile.storage_provider?.payout_details_ref || 'bank_iban_de89370400440532013000',
        settlements: [
          {
            id: 'settlement-st-101',
            date: new Date(Date.now() - 7 * 86400000).toISOString(),
            amount: 320.0,
            currency: 'USD',
            method: 'Bank Wire (DE89...3000)',
            status: 'completed',
            reference: 'SEPA-TRV-89412',
          },
          {
            id: 'settlement-st-102',
            date: new Date(Date.now() - 14 * 86400000).toISOString(),
            amount: 285.5,
            currency: 'USD',
            method: 'Bank Wire (DE89...3000)',
            status: 'completed',
            reference: 'SEPA-TRV-77192',
          },
        ],
      } as unknown as T;
    }

    if (endpoint === '/partners/payouts/request' && options.method === 'POST') {
      return {
        message: 'Payout request received and queued for processing.',
        payout_reference: `PAYOUT-${Date.now().toString(36).toUpperCase()}`,
        amount: 980.5,
        currency: 'USD',
        estimated_arrival: '1-2 business days',
      } as unknown as T;
    }

    if (endpoint.includes('/status') && options.method === 'PATCH') {
      const body = JSON.parse((options.body as string) || '{}');
      demoProfile.status = body.status;
      if (demoProfile.storage_provider) {
        demoProfile.storage_provider.verification_status = body.status;
      }
      return { status: body.status, message: 'Status updated' } as unknown as T;
    }

    return {} as T;
  }

  async getProfile(): Promise<PartnerProfile> {
    return this.request('/partners/me');
  }

  async submitOnboarding(data: any): Promise<any> {
    return this.request('/partners/onboard', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listLocations(): Promise<{ data: PartnerLocation[] }> {
    return this.request('/partners/locations');
  }

  async createLocation(data: any): Promise<PartnerLocation> {
    return this.request('/partners/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInventory(locationId: string, data: { date: string; total_capacity: number; price_per_bag_per_day: number }): Promise<any> {
    return this.request(`/partners/locations/${locationId}/inventory`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listBookings(page = 1, limit = 20, status?: string): Promise<{ data: PartnerBooking[]; meta: any }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    return this.request(`/partners/bookings?${params.toString()}`);
  }

  async checkInBooking(id: string): Promise<any> {
    return this.request(`/partners/bookings/${id}/check-in`, {
      method: 'PATCH',
    });
  }

  async checkOutBooking(id: string): Promise<any> {
    return this.request(`/partners/bookings/${id}/check-out`, {
      method: 'PATCH',
    });
  }

  async getPayoutSummary(): Promise<PayoutSummary> {
    return this.request('/partners/payouts/summary');
  }

  async requestPayout(): Promise<any> {
    return this.request('/partners/payouts/request', {
      method: 'POST',
    });
  }

  async approvePartner(partnerAccountId: string, notes?: string): Promise<any> {
    return this.request(`/partners/${partnerAccountId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'verified', notes }),
    });
  }

  // Quick Switcher helpers for Demo/Evaluation
  switchDemoMode(mode: 'verified_storage' | 'pending' | 'unregistered') {
    if (mode === 'verified_storage') {
      demoProfile = {
        has_partner_account: true,
        status: 'verified',
        id: 'partner-acc-demo-1',
        type: 'storage',
        verified_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        user: {
          id: 'user-storage-partner-1',
          email: 'storage.partner@example.com',
          full_name: 'Helena Berg',
          role: 'partner_storage',
        },
        storage_provider: {
          id: 'prov-demo-storage',
          business_name: 'Berlin SafeStorage Network GmbH',
          verification_status: 'verified',
          payout_details_ref: 'DE89370400440532013000',
        },
      };
    } else if (mode === 'pending') {
      demoProfile = {
        has_partner_account: true,
        status: 'pending',
        id: 'partner-acc-pending-1',
        type: 'storage',
        user: {
          id: 'user-pending-partner',
          email: 'pending.partner@example.com',
          full_name: 'Klaus Lindner',
          role: 'partner_storage',
        },
        storage_provider: {
          id: 'prov-pending-storage',
          business_name: 'Lindner SafeBags & Lockers',
          verification_status: 'pending',
          payout_details_ref: 'DE44500105175402094200',
        },
      };
    } else {
      demoProfile = {
        has_partner_account: false,
        status: 'unregistered',
        user: {
          id: 'user-new-partner',
          email: 'new.applicant@example.com',
          full_name: 'Alex Rivera',
          role: 'traveler',
        },
      };
    }
  }
}

export const partnerApi = new PartnerApiClient();
