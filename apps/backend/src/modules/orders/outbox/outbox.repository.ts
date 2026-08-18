export interface OutboxRepository {
  create(event: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: string;
  }): Promise<void>;
  findUnpublished(limit: number): Promise<Array<{
    id: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: string;
  }>>;
  markPublished(id: string): Promise<void>;
}

export const OUTBOX_REPOSITORY = Symbol('OUTBOX_REPOSITORY');
