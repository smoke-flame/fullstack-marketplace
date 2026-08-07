import { v4 as uuidv4 } from 'uuid';

export abstract class RabbitMQEvent {
  abstract readonly eventType: string;
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly correlationId: string;
  readonly version: number;

  constructor(correlationId: string) {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
    this.correlationId = correlationId;
    this.version = 1;
  }

  abstract get payload(): unknown;

  toJSON() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      version: this.version,
      occurredAt: this.occurredAt,
      correlationId: this.correlationId,
      payload: this.payload,
    };
  }

  static fromJSON<T extends RabbitMQEvent>(raw: unknown, ctor: { new(payload: T['payload'], correlationId: string): T }): T {
    const record = raw as Record<string, unknown>;
    const instance = new ctor(record.payload as T['payload'], record.correlationId as string);
    Object.assign(instance, {
      eventId: record.eventId as string,
      occurredAt: new Date(record.occurredAt as string),
      version: record.version as number,
    });
    return instance;
  }
}
