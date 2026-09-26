import { getLocationProvider } from '../../adapters/location/index.js';
import {
  Coordinates,
  GeocodeResult,
  DistanceResult,
  WalkingTimeResult,
} from '@travel/shared';

export class LocationService {
  private get provider() {
    return getLocationProvider();
  }

  async geocode(address: string): Promise<GeocodeResult> {
    return this.provider.geocode(address);
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    return this.provider.reverseGeocode(lat, lng);
  }

  async getDistance(origin: Coordinates, destination: Coordinates): Promise<DistanceResult> {
    return this.provider.distance(origin, destination);
  }

  async getWalkingTime(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<WalkingTimeResult> {
    return this.provider.estimateWalkingTime(origin, destination);
  }
}

export const locationService = new LocationService();
