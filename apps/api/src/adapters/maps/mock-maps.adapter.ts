import { IMapsProvider, GeocodeResult, DistanceMatrixResult } from '@travel/shared';

export class MockMapsAdapter implements IMapsProvider {
  name = 'mock-maps-adapter';

  async geocode(address: string): Promise<GeocodeResult> {
    // Deterministic mock geocoder based on known mock cities
    const lower = address.toLowerCase();
    if (lower.includes('berlin')) {
      return {
        address,
        lat: 52.520008,
        lng: 13.404954,
        city: 'Berlin',
        country: 'Germany',
      };
    }
    if (lower.includes('paris')) {
      return {
        address,
        lat: 48.856613,
        lng: 2.352222,
        city: 'Paris',
        country: 'France',
      };
    }
    return {
      address,
      lat: 52.520008,
      lng: 13.404954,
      city: 'Default City',
      country: 'Global',
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    return {
      address: `Mock Address near (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat,
      lng,
      city: 'Sample City',
      country: 'Global',
    };
  }

  async calculateDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<DistanceMatrixResult> {
    // Haversine formula calculation for realistic distance
    const R = 6371e3; // Earth radius in meters
    const phi1 = (originLat * Math.PI) / 180;
    const phi2 = (destLat * Math.PI) / 180;
    const deltaPhi = ((destLat - originLat) * Math.PI) / 180;
    const deltaLambda = ((destLng - originLng) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = Math.round(R * c);

    // Approximate travel duration (avg 25 km/h in urban settings)
    const durationSeconds = Math.round((distanceMeters / (25 * 1000)) * 3600);

    return {
      originLat,
      originLng,
      destLat,
      destLng,
      distanceMeters,
      durationSeconds,
    };
  }
}
