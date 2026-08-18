import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';

@Injectable()
export class EventIdempotencyService {
  private readonly logger = new Logger(EventIdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Claims an irreversible side effect (for example an email) before it is
   * performed.  The composite primary key makes concurrent deliveries race
   * safely: exactly one handler receives the claim.
   */
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
}
