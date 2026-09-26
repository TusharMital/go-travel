import { ITransportProviderAdapter } from '@travel/shared';
import { MockTransportAdapter } from './mock-transport.adapter.js';

export function getTransportAdapter(): ITransportProviderAdapter {
  return new MockTransportAdapter();
}
