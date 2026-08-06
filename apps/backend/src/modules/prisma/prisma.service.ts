import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withInternalTimeout } from '../gateway/utils/internal-call';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  async onModuleInit() {
    await withInternalTimeout('PostgreSQL', () => this.$connect()).catch(() =>
      this.logger.warn('PostgreSQL is unavailable; dependent requests will return 503'),
    );
  }
  async execute<T>(operation: () => Promise<T>) {
    return withInternalTimeout('PostgreSQL', operation);
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
