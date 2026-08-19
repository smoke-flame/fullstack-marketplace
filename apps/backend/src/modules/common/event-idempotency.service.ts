import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import type { Channel, Message } from 'amqplib';

@Injectable()
export class EventIdempotencyService {
  private readonly logger = new Logger(EventIdempotencyService.name);

  constructor(private readonly prisma: PrismaService) { }

  async isProcessed(consumer: string, eventId: string): Promise<boolean> {
    return Boolean(await this.prisma.processedEvent.findUnique({
      where: { consumer_eventId: { consumer, eventId } },
    }));
  }

  async markProcessed(consumer: string, eventId: string, eventType: string): Promise<void> {
    await this.prisma.processedEvent.create({ data: { consumer, eventId, eventType } }).catch((error: { code?: string }) => {
      if (error.code !== 'P2002') throw error;
      this.logger.debug(`Event ${eventId} was already marked processed by ${consumer}`);
    });
  }

  async claim(consumer: string, eventId: string, eventType: string): Promise<boolean> {
    try {
      await this.prisma.processedEvent.create({ data: { consumer, eventId, eventType } });
      return true;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') return false;
      throw error;
    }
  }

  async releaseClaim(consumer: string, eventId: string): Promise<void> {
    await this.prisma.processedEvent.deleteMany({ where: { consumer, eventId } });
  }

  private readonly acknowledged = new WeakSet<object>();

  async ack(channel: Channel, message: object): Promise<void> {
    if (this.acknowledged.has(message)) return;
    this.acknowledged.add(message);
    channel.ack(message as Message);
  }

  async nack(channel: Channel, message: object, requeue: boolean): Promise<void> {
    if (this.acknowledged.has(message)) return;
    this.acknowledged.add(message);
    channel.nack(message as Message, false, requeue);
  }
}
