/**
 * Domain Event and Event Bus Contracts
 * Structured as an abstract interface so it can seamlessly transition
 * from in-process EventEmitter to a distributed queue (BullMQ/Redis/RabbitMQ).
 */

export interface DomainEvent<T = any> {
  id: string;
  name: string;
  timestamp: string;
  correlationId?: string;
  payload: T;
}

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void>;

export interface IEventBus {
  /**
   * Publish a domain event to all registered listeners / message queues.
   */
  publish<T>(event: DomainEvent<T>): Promise<void>;

  /**
   * Subscribe to a specific domain event.
   * Returns an unsubscribe function.
   */
  subscribe<T>(eventName: string, handler: EventHandler<T>): () => void;

  /**
   * Clear all registered handlers (used primarily for test cleanup).
   */
  clear(): void;
}
