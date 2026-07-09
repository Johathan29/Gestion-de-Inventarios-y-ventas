// ============================================================
// ERP Event Bus — RabbitMQ/NATS abstraction
// ============================================================

import { IEventBus } from '@erp/shared-kernel';

/**
 * Event Bus implementation using AMQP (RabbitMQ)
 */
export class RabbitMQEventBus extends IEventBus {
  #connection;
  #channel;
  #url;
  #exchange;
  #exchangeType;
  #handlers;
  #isConnected;

  /**
   * @param {string} url - RabbitMQ connection URL (e.g., amqp://localhost:5672)
   * @param {string} exchange - Exchange name
   * @param {string} exchangeType - Exchange type (topic, direct, fanout)
   */
  constructor({ url = 'amqp://localhost:5672', exchange = 'erp.events', exchangeType = 'topic' } = {}) {
    super();
    this.#url = url;
    this.#exchange = exchange;
    this.#exchangeType = exchangeType;
    this.#handlers = new Map();
    this.#isConnected = false;
  }

  get isConnected() { return this.#isConnected; }

  async connect() {
    try {
      const amqp = await import('amqplib');
      this.#connection = await amqp.connect(this.#url);
      this.#channel = await this.#connection.createChannel();
      await this.#channel.assertExchange(this.#exchange, this.#exchangeType, {
        durable: true,
        autoDelete: false,
      });
      this.#isConnected = true;

      // Reconnect on close
      this.#connection.on('close', () => {
        this.#isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });

      console.log('[EventBus] Connected to RabbitMQ:', this.#url);
    } catch (err) {
      console.error('[EventBus] Failed to connect to RabbitMQ:', err.message);
      throw err;
    }
  }

  async disconnect() {
    try {
      await this.#channel?.close();
      await this.#connection?.close();
      this.#isConnected = false;
    } catch (err) {
      console.error('[EventBus] Error disconnecting:', err.message);
    }
  }

  async publish(event) {
    if (!this.#isConnected) {
      console.warn('[EventBus] Not connected, cannot publish');
      return;
    }

    const message = Buffer.from(JSON.stringify(event.toJSON()));
    const routingKey = event.eventType;

    try {
      this.#channel.publish(this.#exchange, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        timestamp: event.occurredOn.getTime(),
      });
    } catch (err) {
      console.error(`[EventBus] Failed to publish event ${event.eventType}:`, err.message);
      throw err;
    }
  }

  async publishAll(events) {
    for (const event of events) {
      await this.publish(event);
    }
  }

  async subscribe(eventType, handler) {
    if (!this.#isConnected) {
      throw new Error('[EventBus] Not connected, cannot subscribe');
    }

    try {
      const { queue } = await this.#channel.assertQueue('', {
        exclusive: true,
        autoDelete: true,
      });

      await this.#channel.bindQueue(queue, this.#exchange, eventType);

      this.#channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
          const data = JSON.parse(msg.content.toString());
          // Reconstruct the event
          const event = { ...data, occurredOn: new Date(data.occurredOn) };
          await handler.handle(event);
          this.#channel.ack(msg);
        } catch (err) {
          console.error(`[EventBus] Handler failed for ${eventType}:`, err.message);
          this.#channel.nack(msg, false, true); // Requeue
        }
      });

      this.#handlers.set(eventType, handler);
      console.log(`[EventBus] Subscribed to ${eventType}`);
    } catch (err) {
      console.error(`[EventBus] Failed to subscribe to ${eventType}:`, err.message);
      throw err;
    }
  }
}

/**
 * In-Memory Event Bus for development/testing
 */
export class InMemoryEventBus extends IEventBus {
  #handlers;

  constructor() {
    super();
    this.#handlers = new Map();
  }

  async connect() {
    // In-memory bus is always connected
  }

  async publish(event) {
    const handlers = this.#handlers.get(event.eventType) || [];
    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (err) {
        console.error(`[InMemoryEventBus] Handler failed for ${event.eventType}:`, err.message);
      }
    }
  }

  async subscribe(eventType, handler) {
    // Allow plain functions to be registered; wrap them if needed
    if (typeof handler === 'function') {
      handler = { handle: handler };
    }
    if (!this.#handlers.has(eventType)) {
      this.#handlers.set(eventType, []);
    }
    this.#handlers.get(eventType).push(handler);
  }

  clear() {
    this.#handlers.clear();
  }
}

export default { RabbitMQEventBus, InMemoryEventBus };
