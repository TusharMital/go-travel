import { LocationProvider } from '@travel/shared';
import { MockLocationProvider } from './mock-location.provider.js';

let cachedProvider: LocationProvider | null = null;

export function getLocationProvider(): LocationProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = process.env.LOCATION_PROVIDER || process.env.MAPS_PROVIDER || 'mock';

  if (providerType === 'mock') {
    cachedProvider = new MockLocationProvider();
    return cachedProvider;
  }

  // Future real provider (e.g. Google Maps or Mapbox) can be plugged in here.
  // Falls back safely to MockLocationProvider if credentials are unset or provider is unknown.
  cachedProvider = new MockLocationProvider();
  return cachedProvider;
}

export function setLocationProvider(provider: LocationProvider): void {
  cachedProvider = provider;
}

export function resetLocationProvider(): void {
  cachedProvider = null;
}

export { MockLocationProvider };
