import {
  IPaymentsProvider,
  PaymentIntentInput,
  PaymentResult,
  RefundResult,
} from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';

export class MockPaymentsAdapter implements IPaymentsProvider {
  name = 'mock-payments-adapter';

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentResult> {
    const paymentId = uuidv4();
    const providerRef = `mock_pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      paymentId,
      providerRef,
      status: 'AUTHORIZED',
      clientSecret: `mock_secret_${providerRef}`,
    };
  }

  async capturePayment(paymentRef: string): Promise<PaymentResult> {
    return {
      paymentId: uuidv4(),
      providerRef: paymentRef,
      status: 'CAPTURED',
    };
  }

  async refundPayment(paymentRef: string, amount?: number): Promise<RefundResult> {
    return {
      paymentId: uuidv4(),
      providerRef: paymentRef,
      status: 'REFUNDED',
      refundedAmount: amount || 0,
    };
  }
}
