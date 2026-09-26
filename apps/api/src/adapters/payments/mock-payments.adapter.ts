import {
  PaymentProvider,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentResult,
  RefundResult,
} from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';

export interface StoredMockIntent {
  paymentId: string;
  providerRef: string;
  amount: number;
  currency: string;
  userId: string;
  relatedType: string;
  relatedId: string;
  status: 'INTENT' | 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'FAILED';
  clientSecret: string;
  createdAt: Date;
}

export class MockPaymentsAdapter implements PaymentProvider {
  name = 'mock-payments-adapter';

  // Configurable test flags for unit & integration testing
  private simulateDecline = false;
  private declineReason = 'Card declined: Insufficient funds or invalid card details';
  private simulateCaptureFailure = false;
  private captureFailureReason = 'Capture declined: Pre-authorization hold expired';
  private simulateDelayedWebhook = false;

  // In-memory registry of created intents
  private intents: Map<string, StoredMockIntent> = new Map();

  // Test control methods
  setSimulateDecline(enabled: boolean, reason?: string): void {
    this.simulateDecline = enabled;
    if (reason) this.declineReason = reason;
  }

  setSimulateCaptureFailure(enabled: boolean, reason?: string): void {
    this.simulateCaptureFailure = enabled;
    if (reason) this.captureFailureReason = reason;
  }

  setSimulateDelayedWebhook(enabled: boolean): void {
    this.simulateDelayedWebhook = enabled;
  }

  reset(): void {
    this.simulateDecline = false;
    this.declineReason = 'Card declined: Insufficient funds or invalid card details';
    this.simulateCaptureFailure = false;
    this.captureFailureReason = 'Capture declined: Pre-authorization hold expired';
    this.simulateDelayedWebhook = false;
    this.intents.clear();
  }

  getIntent(providerRef: string): StoredMockIntent | undefined {
    return this.intents.get(providerRef);
  }

  /**
   * Create Payment Intent
   */
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const paymentId = uuidv4();
    const providerRef = `mock_pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Check if decline is simulated via input testFlag or programmatic flag
    const shouldDecline =
      this.simulateDecline ||
      input.testFlag === 'simulate_decline' ||
      input.testFlag === 'simulate_failure' ||
      input.metadata?.['test_flag'] === 'simulate_decline';

    if (shouldDecline) {
      return {
        paymentId,
        providerRef,
        status: 'FAILED',
        errorMessage: this.declineReason,
      };
    }

    const isDelayedWebhook =
      this.simulateDelayedWebhook ||
      input.testFlag === 'simulate_delayed_webhook' ||
      input.metadata?.['test_flag'] === 'simulate_delayed_webhook';

    const clientSecret = `mock_secret_${providerRef}`;
    const stored: StoredMockIntent = {
      paymentId,
      providerRef,
      amount: input.amount,
      currency: input.currency || 'USD',
      userId: input.userId,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      status: isDelayedWebhook ? 'INTENT' : 'AUTHORIZED',
      clientSecret,
      createdAt: new Date(),
    };

    this.intents.set(providerRef, stored);

    return {
      paymentId,
      providerRef,
      status: isDelayedWebhook ? 'INTENT' : 'AUTHORIZED',
      clientSecret,
    };
  }

  /**
   * Capture Authorized Payment
   */
  async capture(paymentRef: string, amount?: number): Promise<PaymentResult> {
    const paymentId = uuidv4();

    if (this.simulateCaptureFailure) {
      return {
        paymentId,
        providerRef: paymentRef,
        status: 'FAILED',
        errorMessage: this.captureFailureReason,
      };
    }

    const stored = this.intents.get(paymentRef);
    if (stored) {
      stored.status = 'CAPTURED';
    }

    return {
      paymentId,
      providerRef: paymentRef,
      status: 'CAPTURED',
    };
  }

  /**
   * Refund Captured Payment
   */
  async refund(paymentRef: string, amount?: number, reason?: string): Promise<RefundResult> {
    const paymentId = uuidv4();
    const stored = this.intents.get(paymentRef);

    if (stored) {
      stored.status = 'REFUNDED';
    }

    return {
      paymentId,
      providerRef: paymentRef,
      status: 'REFUNDED',
      refundedAmount: amount !== undefined ? amount : (stored?.amount || 0),
    };
  }

  // Compatibility aliases for legacy calls
  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentResult> {
    const res = await this.createIntent(input);
    return {
      paymentId: res.paymentId,
      providerRef: res.providerRef,
      status: res.status === 'INTENT' ? 'AUTHORIZED' : res.status,
      errorMessage: res.errorMessage,
    };
  }

  async capturePayment(paymentRef: string): Promise<PaymentResult> {
    return this.capture(paymentRef);
  }

  async refundPayment(paymentRef: string, amount?: number): Promise<RefundResult> {
    return this.refund(paymentRef, amount);
  }
}

// Singleton instance for in-app and testing usage
export const mockPaymentsAdapter = new MockPaymentsAdapter();
