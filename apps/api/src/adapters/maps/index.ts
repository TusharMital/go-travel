import { IMapsProvider } from '@travel/shared';
import { MockMapsAdapter } from './mock-maps.adapter.js';

export function getMapsAdapter(): IMapsProvider {
  // Can switch based on process.env.MAPS_PROVIDER === 'google' ? new GoogleMapsAdapter() : new MockMapsAdapter()
  return new MockMapsAdapter();
}
