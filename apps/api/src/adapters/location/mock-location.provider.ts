import {
  LocationProvider,
  IMapsProvider,
  Coordinates,
  GeocodeResult,
  DistanceResult,
  WalkingTimeResult,
  DistanceMatrixResult,
} from '@travel/shared';

interface LandmarkData {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  placeId: string;
}

const PRESET_LANDMARKS: LandmarkData[] = [
  // Berlin
  {
    name: 'Berlin Hauptbahnhof',
    aliases: ['berlin hbf', 'berlin central station', 'europaplatz 1'],
    lat: 52.5251,
    lng: 13.3694,
    address: 'Europaplatz 1, 10557 Berlin, Germany',
    city: 'Berlin',
    country: 'Germany',
    postalCode: '10557',
    placeId: 'loc-ber-hbf',
  },
  {
    name: 'Alexanderplatz',
    aliases: ['alexanderplatz', 'alexanderplatz berlin', 'alex'],
    lat: 52.5219,
    lng: 13.4132,
    address: 'Alexanderplatz, 10178 Berlin, Germany',
    city: 'Berlin',
    country: 'Germany',
    postalCode: '10178',
    placeId: 'loc-ber-alex',
  },
  {
    name: 'Brandenburg Gate',
    aliases: ['brandenburg gate', 'brandenburger tor', 'pariser platz'],
    lat: 52.5163,
    lng: 13.3777,
    address: 'Pariser Platz, 10117 Berlin, Germany',
    city: 'Berlin',
    country: 'Germany',
    postalCode: '10117',
    placeId: 'loc-ber-gate',
  },
  {
    name: 'Museum Island',
    aliases: ['museum island', 'museumsinsel', 'bodestrasse'],
    lat: 52.5169,
    lng: 13.4019,
    address: 'Bodestrasse 1-3, 10178 Berlin, Germany',
    city: 'Berlin',
    country: 'Germany',
    postalCode: '10178',
    placeId: 'loc-ber-museum',
  },
  {
    name: 'Berlin Brandenburg Airport (BER)',
    aliases: ['ber airport', 'berlin brandenburg airport', 'berlin airport'],
    lat: 52.3667,
    lng: 13.5033,
    address: 'Willy-Brandt-Platz, 12529 Schönefeld, Germany',
    city: 'Berlin',
    country: 'Germany',
    postalCode: '12529',
    placeId: 'loc-ber-airport',
  },
  {
    name: 'Potsdamer Platz',
    aliases: ['potsdamer platz', 'potsdamer platz berlin'],
    lat: 52.5096,
    lng: 13.3759,
    address: 'Potsdamer Platz, 10785 Berlin, Germany',
    city: 'Berlin',
    country: 'Germany',
    postalCode: '10785',
    placeId: 'loc-ber-potsdamer',
  },

  // Paris
  {
    name: 'Gare du Nord',
    aliases: ['gare du nord', 'paris nord', '18 rue de dunkerque'],
    lat: 48.8809,
    lng: 2.3553,
    address: '18 Rue de Dunkerque, 75010 Paris, France',
    city: 'Paris',
    country: 'France',
    postalCode: '75010',
    placeId: 'loc-par-nord',
  },
  {
    name: 'Eiffel Tower',
    aliases: ['eiffel tower', 'tour eiffel', 'champ de mars'],
    lat: 48.8584,
    lng: 2.2945,
    address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
    city: 'Paris',
    country: 'France',
    postalCode: '75007',
    placeId: 'loc-par-eiffel',
  },
  {
    name: 'Louvre Museum',
    aliases: ['louvre', 'musée du louvre', 'louvre museum'],
    lat: 48.8606,
    lng: 2.3376,
    address: 'Rue de Rivoli, 75001 Paris, France',
    city: 'Paris',
    country: 'France',
    postalCode: '75001',
    placeId: 'loc-par-louvre',
  },
  {
    name: 'Paris Charles de Gaulle Airport (CDG)',
    aliases: ['cdg airport', 'charles de gaulle airport', 'paris cdg'],
    lat: 49.0097,
    lng: 2.5479,
    address: '95700 Roissy-en-France, France',
    city: 'Paris',
    country: 'France',
    postalCode: '95700',
    placeId: 'loc-par-cdg',
  },

  // Tokyo
  {
    name: 'Tokyo Station',
    aliases: ['tokyo station', 'marunouchi', 'tokyo central'],
    lat: 35.6812,
    lng: 139.7671,
    address: '1 Chome Marunouchi, Chiyoda City, Tokyo 100-0005, Japan',
    city: 'Tokyo',
    country: 'Japan',
    postalCode: '100-0005',
    placeId: 'loc-tok-station',
  },
  {
    name: 'Shibuya Crossing',
    aliases: ['shibuya crossing', 'shibuya', 'hachiko'],
    lat: 35.6595,
    lng: 139.7004,
    address: '2 Chome Dogenzaka, Shibuya City, Tokyo 150-0043, Japan',
    city: 'Tokyo',
    country: 'Japan',
    postalCode: '150-0043',
    placeId: 'loc-tok-shibuya',
  },

  // London
  {
    name: "London King's Cross",
    aliases: ["king's cross", "kings cross", "st pancras"],
    lat: 51.5308,
    lng: -0.1238,
    address: "Euston Rd, London N1 9AL, United Kingdom",
    city: 'London',
    country: 'United Kingdom',
    postalCode: 'N1 9AL',
    placeId: 'loc-lon-kx',
  },
];

export class MockLocationProvider implements LocationProvider, IMapsProvider {
  name = 'deterministic-mock-location-provider';

  /**
   * Geocode an address into latitude, longitude, and formatted details.
   */
  async geocode(address: string): Promise<GeocodeResult> {
    const trimmed = address.trim();
    const lower = trimmed.toLowerCase();

    // 1. Direct match with preset landmarks
    for (const landmark of PRESET_LANDMARKS) {
      if (
        lower === landmark.name.toLowerCase() ||
        landmark.aliases.some((alias) => lower.includes(alias))
      ) {
        return {
          address: trimmed,
          formattedAddress: landmark.address,
          lat: landmark.lat,
          lng: landmark.lng,
          city: landmark.city,
          country: landmark.country,
          postalCode: landmark.postalCode,
          placeId: landmark.placeId,
        };
      }
    }

    // 2. City-level matching
    if (lower.includes('berlin')) {
      return {
        address: trimmed,
        formattedAddress: `${trimmed}, Berlin, Germany`,
        lat: 52.52,
        lng: 13.405,
        city: 'Berlin',
        country: 'Germany',
        postalCode: '10115',
        placeId: 'loc-city-berlin',
      };
    }
    if (lower.includes('paris')) {
      return {
        address: trimmed,
        formattedAddress: `${trimmed}, Paris, France`,
        lat: 48.8566,
        lng: 2.3522,
        city: 'Paris',
        country: 'France',
        postalCode: '75001',
        placeId: 'loc-city-paris',
      };
    }
    if (lower.includes('tokyo')) {
      return {
        address: trimmed,
        formattedAddress: `${trimmed}, Tokyo, Japan`,
        lat: 35.6762,
        lng: 139.6503,
        city: 'Tokyo',
        country: 'Japan',
        postalCode: '100-0001',
        placeId: 'loc-city-tokyo',
      };
    }
    if (lower.includes('london')) {
      return {
        address: trimmed,
        formattedAddress: `${trimmed}, London, United Kingdom`,
        lat: 51.5074,
        lng: -0.1278,
        city: 'London',
        country: 'United Kingdom',
        postalCode: 'SW1A 1AA',
        placeId: 'loc-city-london',
      };
    }

    // 3. Deterministic hash fallback for arbitrary test addresses
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
      hash = (hash << 5) - hash + trimmed.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    const latOffset = ((positiveHash % 1000) / 10000) - 0.05;
    const lngOffset = (((positiveHash >> 8) % 1000) / 10000) - 0.05;

    const lat = Math.round((52.52 + latOffset) * 1000000) / 1000000;
    const lng = Math.round((13.405 + lngOffset) * 1000000) / 1000000;

    return {
      address: trimmed,
      formattedAddress: `${trimmed}, Demo City`,
      lat,
      lng,
      city: 'Demo City',
      country: 'Global',
      postalCode: '00000',
      placeId: `loc-custom-${positiveHash}`,
    };
  }

  /**
   * Reverse geocode latitude and longitude into address information.
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    // 1. Check if close (< 300m) to any known landmark
    for (const landmark of PRESET_LANDMARKS) {
      const dist = this.haversineMeters({ lat, lng }, { lat: landmark.lat, lng: landmark.lng });
      if (dist <= 300) {
        const fullAddress = landmark.address.includes(landmark.name)
          ? landmark.address
          : `${landmark.name}, ${landmark.address}`;
        return {
          address: fullAddress,
          formattedAddress: fullAddress,
          lat,
          lng,
          city: landmark.city,
          country: landmark.country,
          postalCode: landmark.postalCode,
          placeId: landmark.placeId,
        };
      }
    }

    // 2. Regional bounding box checks
    if (lat >= 52.3 && lat <= 52.7 && lng >= 13.0 && lng <= 13.8) {
      return {
        address: `Berlin Area near (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        formattedAddress: `Mock Address near (${lat.toFixed(4)}, ${lng.toFixed(4)}), Berlin, Germany`,
        lat,
        lng,
        city: 'Berlin',
        country: 'Germany',
        postalCode: '10115',
        placeId: `loc-rev-ber-${lat.toFixed(2)}-${lng.toFixed(2)}`,
      };
    }

    if (lat >= 48.7 && lat <= 49.1 && lng >= 2.1 && lng <= 2.6) {
      return {
        address: `Paris Area near (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        formattedAddress: `Mock Address near (${lat.toFixed(4)}, ${lng.toFixed(4)}), Paris, France`,
        lat,
        lng,
        city: 'Paris',
        country: 'France',
        postalCode: '75001',
        placeId: `loc-rev-par-${lat.toFixed(2)}-${lng.toFixed(2)}`,
      };
    }

    if (lat >= 35.5 && lat <= 35.9 && lng >= 139.5 && lng <= 140.0) {
      return {
        address: `Tokyo Area near (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        formattedAddress: `Mock Address near (${lat.toFixed(4)}, ${lng.toFixed(4)}), Tokyo, Japan`,
        lat,
        lng,
        city: 'Tokyo',
        country: 'Japan',
        postalCode: '100-0001',
        placeId: `loc-rev-tok-${lat.toFixed(2)}-${lng.toFixed(2)}`,
      };
    }

    // Default global fallback
    return {
      address: `Mock Address near (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      formattedAddress: `Mock Street near (${lat.toFixed(4)}, ${lng.toFixed(4)}), Global City`,
      lat,
      lng,
      city: 'Global City',
      country: 'Global',
      placeId: `loc-rev-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    };
  }

  /**
   * Calculate distance between point a and point b using Haversine formula.
   */
  async distance(a: Coordinates, b: Coordinates): Promise<DistanceResult> {
    const meters = this.haversineMeters(a, b);
    const kilometers = Math.round((meters / 1000) * 100) / 100;

    return {
      origin: { lat: a.lat, lng: a.lng },
      destination: { lat: b.lat, lng: b.lng },
      distanceMeters: meters,
      distanceKm: kilometers,
    };
  }

  /**
   * Estimate walking time between point a and point b.
   * Assumes pedestrian routing factor of 1.2 (street turns) and 4.8 km/h (1.33 m/s) walking speed.
   */
  async estimateWalkingTime(a: Coordinates, b: Coordinates): Promise<WalkingTimeResult> {
    const dist = await this.distance(a, b);

    if (dist.distanceMeters === 0) {
      return {
        origin: { lat: a.lat, lng: a.lng },
        destination: { lat: b.lat, lng: b.lng },
        distanceMeters: 0,
        walkingDurationMinutes: 0,
        walkingDurationSeconds: 0,
        formattedDuration: '0 mins',
      };
    }

    // Street routing factor of 1.2; walking speed 1.333 m/s (80 m/min)
    const effectiveMeters = dist.distanceMeters * 1.2;
    const walkingDurationSeconds = Math.round(effectiveMeters / 1.3333);
    const walkingDurationMinutes = Math.max(1, Math.round(walkingDurationSeconds / 60));

    const formattedDuration = this.formatWalkingMinutes(walkingDurationMinutes);

    return {
      origin: { lat: a.lat, lng: a.lng },
      destination: { lat: b.lat, lng: b.lng },
      distanceMeters: dist.distanceMeters,
      walkingDurationMinutes,
      walkingDurationSeconds,
      formattedDuration,
    };
  }

  /**
   * Backward-compatible calculateDistance implementing IMapsProvider.
   */
  async calculateDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<DistanceMatrixResult> {
    const dist = await this.distance(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng }
    );
    // Approximate travel duration (avg 25 km/h urban transit/taxi speed)
    const durationSeconds = Math.round((dist.distanceMeters / (25 * 1000)) * 3600);

    return {
      originLat,
      originLng,
      destLat,
      destLng,
      distanceMeters: dist.distanceMeters,
      durationSeconds,
    };
  }

  private haversineMeters(a: Coordinates, b: Coordinates): number {
    if (a.lat === b.lat && a.lng === b.lng) {
      return 0;
    }
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinHalfLat = Math.sin(dLat / 2);
    const sinHalfLng = Math.sin(dLng / 2);

    const h =
      sinHalfLat * sinHalfLat +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinHalfLng * sinHalfLng;

    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return Math.round(R * c);
  }

  private formatWalkingMinutes(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} mins`;
    if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
    return `${h} hr${h > 1 ? 's' : ''} ${m} min${m > 1 ? 's' : ''}`;
  }
}
