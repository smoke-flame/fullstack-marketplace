import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connect, Channel, ChannelModel } from 'amqplib';
import { env } from '../../config/env';
import { withInternalTimeout } from '../gateway/utils/internal-call';
import { ServiceUnavailableException } from '../gateway/errors/gateway-errors';
@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  async onModuleInit() {
    await withInternalTimeout('RabbitMQ', async () => {
      const connection = await connect(env.RABBITMQ_URL);
      const channel = await connection.createChannel();
      this.connection = connection;
      this.channel = channel;
    })
      .then(() => this.logger.log('Connected to RabbitMQ'))
      .catch(() => this.logger.warn('RabbitMQ is unavailable; dependent requests will return 503'));
  }
  async publish(queue: string, payload: unknown) {
    const channel = this.channel;
    if (!channel) throw new ServiceUnavailableException();
    await withInternalTimeout('RabbitMQ', async () => {
      await channel.assertQueue(queue, { durable: true });
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
    });
  }
  async onModuleDestroy() {
    await this.connection?.close();
  }
}
