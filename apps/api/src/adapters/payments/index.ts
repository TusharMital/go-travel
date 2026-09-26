import { IPaymentsProvider } from '@travel/shared';
import { MockPaymentsAdapter } from './mock-payments.adapter.js';

export function getPaymentsAdapter(): IPaymentsProvider {
  // Real Stripe adapter can be swapped here when STRIPE_SECRET_KEY is configured
  return new MockPaymentsAdapter();
}
