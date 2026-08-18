import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '@config/env';
import { withInternalTimeout } from '@modules/common/utils/internal-call';
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
  });
  async onModuleInit() {
    await this.client
      .connect()
      .then(() => this.logger.log('Connected to Redis'))
      .catch(() => this.logger.warn('Redis is unavailable; dependent requests will return 503'));
  }
  async execute<T>(operation: () => Promise<T>) {
    return withInternalTimeout('Redis', operation);
  }
  async onModuleDestroy() {
    await this.client.quit();
  }
}
