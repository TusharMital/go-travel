const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// In-memory demo store for seamless offline/preview UI testing
let demoTrips: any[] = [
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

let demoStorageLocations = [
  {
    id: 'loc-berlin-alex',
    name: 'Alexanderplatz Luggage Hub',
    address: 'Dircksenstrasse 2, 10178 Berlin',
    city: 'Berlin',
    lat: 52.5219,
    lng: 13.4132,
    distance_km: 0.4,
    distance_meters: 420,
    walking_time: { duration_minutes: 5, formatted_duration: '5 mins' },
    price_per_bag_per_day: 6.5,
    available_capacity: 35,
    rating: 4.9,
    review_count: 38,
    relevance_score: 0.94,
    max_bag_size: 'oversized',
    accepted_item_categories: ['luggage', 'backpack', 'shopping_bags'],
    opening_hours: {
      mon: { open: '08:00', close: '22:00' },
      tue: { open: '08:00', close: '22:00' },
      wed: { open: '08:00', close: '22:00' },
      thu: { open: '08:00', close: '22:00' },
      fri: { open: '08:00', close: '22:00' },
      sat: { open: '08:00', close: '22:00' },
      sun: { open: '08:00', close: '22:00' },
    },
    photos: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'],
    provider: { business_name: 'Berlin SafeStorage GmbH', verification_status: 'verified' },
  },
  {
    id: 'loc-berlin-hbf',
    name: 'Berlin Hbf Central Lockers',
    address: 'Europaplatz 1, 10557 Berlin',
    city: 'Berlin',
    lat: 52.5251,
    lng: 13.3694,
    distance_km: 1.2,
    distance_meters: 1200,
    walking_time: { duration_minutes: 14, formatted_duration: '14 mins' },
    price_per_bag_per_day: 7.0,
    available_capacity: 28,
    rating: 4.8,
    review_count: 52,
    relevance_score: 0.88,
    max_bag_size: 'large',
    accepted_item_categories: ['luggage', 'backpack'],
    opening_hours: {
      mon: { open: '06:00', close: '23:00' },
      tue: { open: '06:00', close: '23:00' },
      wed: { open: '06:00', close: '23:00' },
      thu: { open: '06:00', close: '23:00' },
      fri: { open: '06:00', close: '23:00' },
      sat: { open: '06:00', close: '23:00' },
      sun: { open: '06:00', close: '23:00' },
    },
    photos: ['https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'],
    provider: { business_name: 'Hauptbahnhof Luggage Point', verification_status: 'verified' },
  },
  {
    id: 'loc-berlin-friedrich',
    name: 'Friedrichstraße Safe Stash',
    address: 'Georgenstrasse 14, 10117 Berlin',
    city: 'Berlin',
    lat: 52.5205,
    lng: 13.3872,
    distance_km: 1.5,
    distance_meters: 1500,
    walking_time: { duration_minutes: 18, formatted_duration: '18 mins' },
    price_per_bag_per_day: 5.5,
    available_capacity: 15,
    rating: 4.7,
    review_count: 19,
    relevance_score: 0.82,
    max_bag_size: 'large',
    accepted_item_categories: ['luggage', 'backpack'],
    opening_hours: {
      mon: { open: '08:00', close: '20:00' },
      tue: { open: '08:00', close: '20:00' },
      wed: { open: '08:00', close: '20:00' },
      thu: { open: '08:00', close: '20:00' },
      fri: { open: '08:00', close: '20:00' },
      sat: { open: '08:00', close: '20:00' },
      sun: { open: '08:00', close: '20:00' },
    },
    photos: ['https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=600&q=80'],
    provider: { business_name: 'Mitte Luggage Care', verification_status: 'verified' },
  },
  {
    id: 'loc-paris-nord',
    name: 'Gare du Nord Express Storage',
    address: '18 Rue de Dunkerque, 75010 Paris',
    city: 'Paris',
    lat: 48.8809,
    lng: 2.3553,
    distance_km: 0.3,
    distance_meters: 300,
    walking_time: { duration_minutes: 4, formatted_duration: '4 mins' },
    price_per_bag_per_day: 6.0,
    available_capacity: 40,
    rating: 4.9,
    review_count: 64,
    relevance_score: 0.95,
    max_bag_size: 'oversized',
    accepted_item_categories: ['luggage', 'backpack', 'odd_size'],
    opening_hours: {
      mon: { open: '06:00', close: '23:30' },
      tue: { open: '06:00', close: '23:30' },
      wed: { open: '06:00', close: '23:30' },
      thu: { open: '06:00', close: '23:30' },
      fri: { open: '06:00', close: '23:30' },
      sat: { open: '06:00', close: '23:30' },
      sun: { open: '06:00', close: '23:30' },
    },
    photos: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'],
    provider: { business_name: 'Paris Consigne Gare', verification_status: 'verified' },
  },
];

let demoTransportOptions = [
  {
    id: 'prov-metro-transit',
    provider_name: 'City Public Transit (S/U-Bahn & Bus)',
    mode: 'transit',
    estimated_price: 3.6,
    currency: 'USD',
    estimated_duration_min: 24,
    is_direct_bookable: true,
    deep_link_url: null,
    transit_steps: [
      {
        instruction: 'Walk 200m to Alexanderplatz U-Bahn station',
        mode: 'WALK',
        durationMinutes: 3,
        distanceMeters: 200,
      },
      {
        instruction: 'Take U2 line towards Ruhleben (5 stops)',
        mode: 'SUBWAY',
        line: 'U2',
        durationMinutes: 16,
      },
      {
        instruction: 'Walk 150m to destination address',
        mode: 'WALK',
        durationMinutes: 3,
        distanceMeters: 150,
      },
    ],
  },
  {
    id: 'prov-city-taxi',
    provider_name: 'Metropolitan Licensed Taxi',
    mode: 'taxi',
    estimated_price: 24.5,
    currency: 'USD',
    estimated_duration_min: 15,
    is_direct_bookable: true,
    deep_link_url: null,
    transit_steps: null,
  },
  {
    id: 'prov-uber-mock',
    provider_name: 'Uber Comfort / Black',
    mode: 'rideshare',
    estimated_price: 22.0,
    currency: 'USD',
    estimated_duration_min: 14,
    is_direct_bookable: false,
    deep_link_url: 'https://m.uber.com/ul/?action=setPickup',
    transit_steps: null,
  },
  {
    id: 'prov-lime-mock',
    provider_name: 'Lime E-Bike & Scooter Share',
    mode: 'bike',
    estimated_price: 4.8,
    currency: 'USD',
    estimated_duration_min: 20,
    is_direct_bookable: false,
    deep_link_url: 'https://lime.bike/ride',
    transit_steps: null,
  },
];

let demoTransportBookings = [
  {
    id: 'tb-demo-1',
    user_id: 'u-demo-1',
    transport_option_id: 'prov-city-taxi',
    status: 'confirmed',
    scheduled_at: new Date(Date.now() + 86400000 + 4 * 3600000).toISOString(),
    price_total: 24.5,
    currency: 'USD',
    idempotency_key: 'idem-tb-1',
    transport_option: {
      provider: { name: 'Metropolitan Licensed Taxi' },
      mode: 'taxi',
      estimated_duration_min: 15,
    },
  },
];

let demoStorageBookings = [
  {
    id: 'sb-demo-1',
    user_id: 'u-demo-1',
    location_id: 'loc-berlin-alex',
    status: 'confirmed',
    bag_count: 2,
    drop_off_at: new Date(Date.now() + 86400000 + 3 * 3600000).toISOString(),
    pick_up_at: new Date(Date.now() + 86400000 + 8 * 3600000).toISOString(),
    price_total: 13.0,
    currency: 'USD',
    idempotency_key: 'idem-demo-1',
    location: {
      name: 'Alexanderplatz Luggage Hub',
      address: 'Dircksenstrasse 2, 10178 Berlin',
      city: 'Berlin',
      lat: 52.5219,
      lng: 13.4132,
      photos: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'],
    },
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

    // Storage locations mock fallback
    if (endpoint.startsWith('/storage/locations')) {
      const locMatch = endpoint.match(/\/storage\/locations\/([^\/?]+)/);
      if (locMatch) {
        const found =
          demoStorageLocations.find((l) => l.id === locMatch[1]) || demoStorageLocations[0];
        return found as unknown as T;
      }

      let results = [...demoStorageLocations];
      if (endpoint.includes('paris')) {
        results = results.filter((l) => l.city.toLowerCase() === 'paris');
      } else if (endpoint.includes('berlin')) {
        results = results.filter((l) => l.city.toLowerCase() === 'berlin');
      }

      return {
        data: results,
        meta: { total: results.length, page: 1, limit: 20, totalPages: 1 },
      } as unknown as T;
    }

    // Storage bookings mock fallback
    if (endpoint.startsWith('/storage/bookings')) {
      if (endpoint.includes('/cancel') && options.method === 'POST') {
        const parts = endpoint.split('/');
        const bookingId = parts[3];
        const b = demoStorageBookings.find((x) => x.id === bookingId);
        if (b) b.status = 'cancelled';
        demoTrips.forEach((t) => {
          t.itinerary_items = t.itinerary_items.filter(
            (item: any) => item.linked_storage_booking_id !== bookingId
          );
          t._count.itinerary_items = t.itinerary_items.length;
        });
        return { message: 'Booking cancelled.', status: 'cancelled' } as unknown as T;
      }

      if (options.method === 'POST') {
        const body = JSON.parse((options.body as string) || '{}');
        const loc =
          demoStorageLocations.find((l) => l.id === body.location_id) || demoStorageLocations[0];
        const newBooking = {
          id: `sb-${Date.now()}`,
          user_id: 'u-demo-1',
          location_id: body.location_id,
          trip_id: body.trip_id || null,
          status: 'confirmed',
          bag_count: body.bag_count || 1,
          drop_off_at: body.drop_off_at,
          pick_up_at: body.pick_up_at,
          price_total: Number(loc.price_per_bag_per_day) * (body.bag_count || 1),
          currency: 'USD',
          idempotency_key: (options.headers as any)?.['Idempotency-Key'] || `idem-${Date.now()}`,
          location: loc,
        };
        demoStorageBookings.unshift(newBooking);

        if (body.trip_id) {
          const trip = demoTrips.find((t) => t.id === body.trip_id);
          if (trip) {
            trip.itinerary_items.push({
              id: `itin-sb-${Date.now()}`,
              trip_id: trip.id,
              type: 'storage',
              title: `Luggage Storage: ${loc.name} (${body.bag_count || 1} bags)`,
              starts_at: body.drop_off_at,
              ends_at: body.pick_up_at,
              location_lat: loc.lat,
              location_lng: loc.lng,
              address: loc.address,
              sequence_order: trip.itinerary_items.length + 1,
              linked_storage_booking_id: newBooking.id,
            });
            trip._count.itinerary_items = trip.itinerary_items.length;
          }
        }

        return newBooking as unknown as T;
      }

      return {
        data: demoStorageBookings,
        meta: { total: demoStorageBookings.length, page: 1, limit: 20, totalPages: 1 },
      } as unknown as T;
    }

    // Transport options mock fallback
    if (endpoint.startsWith('/transport/options')) {
      const url = new URL(`http://localhost${endpoint}`);
      const mode = url.searchParams.get('mode');
      let filtered = [...demoTransportOptions];
      if (mode) {
        filtered = filtered.filter((o) => o.mode === mode);
      }
      return {
        data: filtered,
        meta: { total: filtered.length, page: 1, limit: 20 },
      } as unknown as T;
    }

    // Transport handoff mock fallback
    if (endpoint.startsWith('/transport/handoff') && options.method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      return {
        handoff: true,
        deep_link_url: body.deep_link_url || 'https://m.uber.com',
        message: 'Handoff event logged. Redirecting to partner application.',
      } as unknown as T;
    }

    // Transport bookings mock fallback
    if (endpoint.startsWith('/transport/bookings')) {
      if (endpoint.includes('/cancel') && options.method === 'POST') {
        const parts = endpoint.split('/');
        const bookingId = parts[3];
        const b = demoTransportBookings.find((x) => x.id === bookingId);
        if (b) b.status = 'cancelled';
        demoTrips.forEach((t) => {
          t.itinerary_items = t.itinerary_items.filter(
            (item: any) => item.linked_transport_booking_id !== bookingId
          );
          t._count.itinerary_items = t.itinerary_items.length;
        });
        return { message: 'Transport booking cancelled.', status: 'cancelled' } as unknown as T;
      }

      if (options.method === 'POST') {
        const body = JSON.parse((options.body as string) || '{}');
        const opt = demoTransportOptions.find((o) => o.id === body.transport_option_id) || demoTransportOptions[0];
        const newBooking = {
          id: `tb-${Date.now()}`,
          user_id: 'u-demo-1',
          transport_option_id: body.transport_option_id,
          status: 'confirmed',
          scheduled_at: body.scheduled_at || new Date().toISOString(),
          price_total: opt.estimated_price,
          currency: opt.currency || 'USD',
          idempotency_key: (options.headers as any)?.['Idempotency-Key'] || `idem-${Date.now()}`,
          transport_option: {
            provider: { name: opt.provider_name },
            mode: opt.mode,
            estimated_duration_min: opt.estimated_duration_min,
          },
        };
        demoTransportBookings.unshift(newBooking);

        if (body.trip_id) {
          const trip = demoTrips.find((t) => t.id === body.trip_id);
          if (trip) {
            const endsAt = new Date(
              new Date(body.scheduled_at || Date.now()).getTime() +
                (opt.estimated_duration_min || 30) * 60000
            ).toISOString();
            trip.itinerary_items.push({
              id: `itin-tb-${Date.now()}`,
              trip_id: trip.id,
              type: 'transport',
              title: `Transfer: ${opt.provider_name} (${opt.mode})`,
              starts_at: body.scheduled_at || new Date().toISOString(),
              ends_at: endsAt,
              location_lat: body.origin_lat || 52.5251,
              location_lng: body.origin_lng || 13.3694,
              address: body.notes || 'Pick-up point',
              sequence_order: trip.itinerary_items.length + 1,
              linked_transport_booking_id: newBooking.id,
            });
            trip._count.itinerary_items = trip.itinerary_items.length;
          }
        }

        return newBooking as unknown as T;
      }

      return {
        data: demoTransportBookings,
        meta: { total: demoTransportBookings.length, page: 1, limit: 20, totalPages: 1 },
      } as unknown as T;
    }

    return {} as T;
  }

  setSession(accessToken: string, refreshToken: string) {
    this.setTokens(accessToken, refreshToken);
  }

  async searchStorageLocations(query: any): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
    return this.request(`/storage/locations?${params.toString()}`);
  }

  async getStorageLocation(id: string): Promise<any> {
    return this.request(`/storage/locations/${id}`);
  }

  async createStorageBooking(data: any, idempotencyKey: string): Promise<any> {
    return this.request('/storage/bookings', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    });
  }

  async listMyStorageBookings(page = 1, limit = 20, status?: string): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    return this.request(`/storage/bookings?${params.toString()}`);
  }

  async cancelStorageBooking(id: string, reason?: string): Promise<any> {
    return this.request(`/storage/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async searchTransportOptions(query: any): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    return this.request(`/transport/options?${params.toString()}`);
  }

  async createTransportBooking(data: any, idempotencyKey: string): Promise<any> {
    return this.request('/transport/bookings', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    });
  }

  async recordTransportHandoff(data: any): Promise<any> {
    return this.request('/transport/handoff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listMyTransportBookings(page = 1, limit = 20, status?: string): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    return this.request(`/transport/bookings?${params.toString()}`);
  }

  async cancelTransportBooking(id: string, reason?: string): Promise<any> {
    return this.request(`/transport/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
}

export const api = new ApiClient();
export const apiClient = api;

