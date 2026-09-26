const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// In-memory demo store for seamless offline/preview UI testing
let demoTrips = [
  {
    id: 'demo-trip-1',
    user_id: 'u-demo-1',
    title: 'Berlin Weekend Exploration',
    origin_place: 'London Heathrow (LHR)',
    destination_place: 'Berlin Brandenburg (BER)',
    start_date: new Date(Date.now() + 86400000).toISOString(),
    end_date: new Date(Date.now() + 4 * 86400000).toISOString(),
    timezone: 'Europe/Berlin',
    status: 'confirmed',
    itinerary_items: [
      {
        id: 'item-1',
        type: 'flight',
        title: 'Flight BA 982 London to Berlin',
        location_lat: 52.3667,
        location_lng: 13.5033,
        address: 'BER Airport Terminal 1',
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 86400000 + 2.5 * 3600000).toISOString(),
        sequence_order: 1,
      },
      {
        id: 'item-2',
        type: 'hotel',
        title: 'Check-in @ Hotel Adlon Kempinski',
        location_lat: 52.516,
        location_lng: 13.38,
        address: 'Unter den Linden 77, 10117 Berlin',
        starts_at: new Date(Date.now() + 86400000 + 8 * 3600000).toISOString(), // 5.5 hours after flight!
        ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        sequence_order: 2,
      },
      {
        id: 'item-3',
        type: 'activity',
        title: 'Reichstag Dome & Government District Tour',
        location_lat: 52.5186,
        location_lng: 13.3762,
        address: 'Platz der Republik 1, 11011 Berlin',
        starts_at: new Date(Date.now() + 2 * 86400000 + 10 * 3600000).toISOString(),
        ends_at: new Date(Date.now() + 2 * 86400000 + 12 * 3600000).toISOString(),
        sequence_order: 3,
      },
    ],
    storage_bookings: [],
    transport_bookings: [],
    _count: { itinerary_items: 3, storage_bookings: 0, transport_bookings: 0 },
  },
  {
    id: 'demo-trip-2',
    user_id: 'u-demo-1',
    title: 'Paris Art & Culture Getaway',
    origin_place: 'London St Pancras',
    destination_place: 'Paris Gare du Nord',
    start_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    timezone: 'Europe/Paris',
    status: 'planning',
    itinerary_items: [],
    storage_bookings: [],
    transport_bookings: [],
    _count: { itinerary_items: 0, storage_bookings: 0, transport_bookings: 0 },
  },
];

class ApiClient {
  private getAccessToken(): string | null {
    return localStorage.getItem('travel_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('travel_refresh_token');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('travel_access_token', accessToken);
    localStorage.setItem('travel_refresh_token', refreshToken);
  }

  public clearTokens() {
    localStorage.removeItem('travel_access_token');
    localStorage.removeItem('travel_refresh_token');
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, { ...options, headers });

      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              this.setTokens(data.accessToken, data.refreshToken);
              headers['Authorization'] = `Bearer ${data.accessToken}`;
              response = await fetch(url, { ...options, headers });
            } else {
              this.clearTokens();
            }
          } catch {
            this.clearTokens();
          }
        }
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error: ApiError = data?.error || {
          code: 'HTTP_ERROR',
          message: response.statusText || 'An unexpected error occurred',
        };
        throw error;
      }

      return data as T;
    } catch (netErr: any) {
      // If network fails (backend offline/mock preview), gracefully serve mock fallback
      if (netErr?.code || (netErr?.message && !netErr.message.includes('fetch'))) {
        throw netErr;
      }
      return this.handleMockFallback<T>(endpoint, options);
    }
  }

  private handleMockFallback<T>(endpoint: string, options: RequestInit): T {
    // Auth endpoints mock fallback
    if (endpoint === '/auth/me') {
      const email = localStorage.getItem('travel_user_email') || 'traveler@example.com';
      const role = localStorage.getItem('travel_user_role') || 'traveler';
      const name = localStorage.getItem('travel_user_name') || 'Elena Rostova';

      return {
        id: 'u-demo-1',
        email,
        full_name: name,
        role,
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      } as unknown as T;
    }

    if (endpoint === '/auth/login') {
      const body = JSON.parse((options.body as string) || '{}');
      const email = body.email || 'traveler@example.com';
      let role = 'traveler';
      let name = 'Elena Rostova';

      if (email.includes('storage')) {
        role = 'partner_storage';
        name = 'Klaus Schmidt';
      } else if (email.includes('transport')) {
        role = 'partner_transport';
        name = 'Jean Dupont';
      } else if (email.includes('admin')) {
        role = 'admin';
        name = 'Sarah Chen';
      }

      localStorage.setItem('travel_user_email', email);
      localStorage.setItem('travel_user_role', role);
      localStorage.setItem('travel_user_name', name);
      this.setTokens('mock_access_token', 'mock_refresh_token');

      return {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        user: {
          id: 'u-demo-1',
          email,
          full_name: name,
          role,
          email_verified_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      } as unknown as T;
    }

    if (endpoint === '/auth/register') {
      const body = JSON.parse((options.body as string) || '{}');
      localStorage.setItem('travel_user_email', body.email);
      localStorage.setItem('travel_user_role', body.role || 'traveler');
      localStorage.setItem('travel_user_name', body.full_name);
      this.setTokens('mock_access_token', 'mock_refresh_token');

      return {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        user: {
          id: 'u-demo-new',
          email: body.email,
          full_name: body.full_name,
          role: body.role || 'traveler',
          email_verified_at: null,
          created_at: new Date().toISOString(),
        },
      } as unknown as T;
    }

    if (endpoint === '/auth/logout') {
      this.clearTokens();
      localStorage.removeItem('travel_user_email');
      localStorage.removeItem('travel_user_role');
      localStorage.removeItem('travel_user_name');
      return { message: 'Logged out successfully.' } as unknown as T;
    }

    // Trips endpoints mock fallback
    if (endpoint.startsWith('/trips') && !endpoint.includes('/gaps') && !endpoint.includes('/itinerary')) {
      if (options.method === 'POST') {
        const body = JSON.parse((options.body as string) || '{}');
        const newTrip = {
          id: `trip-${Date.now()}`,
          user_id: 'u-demo-1',
          title: body.title,
          origin_place: body.origin_place,
          destination_place: body.destination_place,
          start_date: body.start_date,
          end_date: body.end_date,
          timezone: body.timezone || 'UTC',
          status: 'planning',
          itinerary_items: [],
          storage_bookings: [],
          transport_bookings: [],
          _count: { itinerary_items: 0, storage_bookings: 0, transport_bookings: 0 },
        };
        demoTrips.unshift(newTrip);
        return newTrip as unknown as T;
      }

      const tripIdMatch = endpoint.match(/\/trips\/([^\/?]+)/);
      if (tripIdMatch) {
        const tripId = tripIdMatch[1];
        if (options.method === 'DELETE') {
          demoTrips = demoTrips.filter((t) => t.id !== tripId);
          return { message: 'Trip deleted.' } as unknown as T;
        }
        const found = demoTrips.find((t) => t.id === tripId) || demoTrips[0];
        return found as unknown as T;
      }

      return {
        data: demoTrips,
        meta: { total: demoTrips.length, page: 1, limit: 20, totalPages: 1 },
      } as unknown as T;
    }

    // Gap detection endpoint mock fallback
    if (endpoint.includes('/gaps')) {
      const tripId = endpoint.split('/')[2];
      const trip = demoTrips.find((t) => t.id === tripId) || demoTrips[0];

      if (trip && trip.itinerary_items && trip.itinerary_items.length >= 2) {
        const item1 = trip.itinerary_items[0];
        const item2 = trip.itinerary_items[1];
        const gapMins = Math.round(
          (new Date(item2.starts_at).getTime() - new Date(item1.ends_at).getTime()) / 60000
        );

        if (gapMins >= 60) {
          return {
            data: [
              {
                id: 'gap-1',
                gapType: 'ARRIVAL_GAP',
                title: `Arrival-to-Check-in Gap (${Math.floor(gapMins / 60)} hrs ${gapMins % 60} mins)`,
                description: `You land at BER Airport at 12:00, but hotel check-in is not until 17:30. Stash your bags nearby to explore freely.`,
                startsAt: item1.ends_at,
                endsAt: item2.starts_at,
                durationMinutes: gapMins,
                durationFormatted: `${Math.floor(gapMins / 60)} hrs ${gapMins % 60} mins`,
                recommendedLocation: {
                  lat: item1.location_lat || 52.5251,
                  lng: item1.location_lng || 13.3694,
                  address: item1.address || 'Berlin Hbf / BER Airport',
                },
                hasStorageBooked: false,
                hasTransportBooked: false,
                recommendationAction: 'BOOK_STORAGE',
                previousItemId: item1.id,
                nextItemId: item2.id,
              },
            ],
          } as unknown as T;
        }
      }

      return { data: [] } as unknown as T;
    }

    // Itinerary items mock fallback
    if (endpoint.includes('/itinerary')) {
      const parts = endpoint.split('/');
      const tripId = parts[2];
      const trip = demoTrips.find((t) => t.id === tripId);

      if (options.method === 'POST' && trip) {
        const body = JSON.parse((options.body as string) || '{}');
        const newItem = {
          id: `item-${Date.now()}`,
          trip_id: tripId,
          type: body.type,
          title: body.title,
          location_lat: body.location_lat || 52.52,
          location_lng: body.location_lng || 13.4,
          address: body.address,
          starts_at: body.starts_at,
          ends_at: body.ends_at,
          sequence_order: (trip.itinerary_items.length || 0) + 1,
        };
        trip.itinerary_items.push(newItem);
        if (trip._count) trip._count.itinerary_items = trip.itinerary_items.length;
        return newItem as unknown as T;
      }

      if (options.method === 'DELETE' && trip) {
        const itemId = parts[4];
        trip.itinerary_items = trip.itinerary_items.filter((it: any) => it.id !== itemId);
        if (trip._count) trip._count.itinerary_items = trip.itinerary_items.length;
        return { message: 'Item deleted.' } as unknown as T;
      }
    }

    return {} as T;
  }

  setSession(accessToken: string, refreshToken: string) {
    this.setTokens(accessToken, refreshToken);
  }
}

export const api = new ApiClient();
