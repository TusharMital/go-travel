import { IMapsProvider } from '@travel/shared';
import { getLocationProvider, MockLocationProvider } from '../location/index.js';

export function getMapsAdapter(): IMapsProvider {
  return getLocationProvider() as unknown as IMapsProvider;
}

export { MockLocationProvider as MockMapsAdapter };
