import { Injectable } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(event: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: string;
  }): Promise<void> {
    await this.prisma.outbox.create({
      data: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      },
    });
  }

  async findUnpublished(limit: number) {
    const rows = await this.prisma.outbox.findMany({
      where: { publishedAt: null },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      aggregateType: r.aggregateType,
      aggregateId: r.aggregateId,
      eventType: r.eventType,
      payload: r.payload,
    }));
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outbox.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
  }
}
