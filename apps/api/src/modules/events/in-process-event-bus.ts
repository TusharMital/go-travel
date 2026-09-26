import { EventEmitter } from 'events';
import { DomainEvent, EventHandler, IEventBus } from './event-bus.types';

export class InProcessEventBus implements IEventBus {
  private emitter: EventEmitter;
  private handlers: Map<string, Set<EventHandler>>;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
    this.handlers = new Map();
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const handlersSet = this.handlers.get(event.name);
    if (!handlersSet || handlersSet.size === 0) {
      return;
    }

    // Execute all registered handlers for this event
    const promises = Array.from(handlersSet).map(async (handler) => {
      try {
        await handler(event);
      } catch (err: any) {
        console.error(
          `[EventBus] Error in handler for event "${event.name}" (ID: ${event.id}):`,
          err?.message || err
        );
      }
    });

    await Promise.all(promises);
  }

  subscribe<T>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    const set = this.handlers.get(eventName)!;
    set.add(handler as EventHandler);

    return () => {
      set.delete(handler as EventHandler);
    };
  }

  clear(): void {
    this.handlers.clear();
    this.emitter.removeAllListeners();
  }
}

let globalEventBus: IEventBus | null = null;

export function getEventBus(): IEventBus {
  if (!globalEventBus) {
    globalEventBus = new InProcessEventBus();
  }
  return globalEventBus;
}
