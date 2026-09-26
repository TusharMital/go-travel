import { PaymentProvider } from '@travel/shared';
import { MockPaymentsAdapter, mockPaymentsAdapter } from './mock-payments.adapter.js';

export function getPaymentsAdapter(): PaymentProvider {
  return mockPaymentsAdapter;
}

export { MockPaymentsAdapter, mockPaymentsAdapter };
