import { Injectable } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { CartService } from './cart.service';

@Injectable()
export class CartConsumer {
  constructor(private readonly cartService: CartService) {}

  @EventPattern(RabbitMQEventType.PRODUCT_UPDATED)
  async onProductUpdated() {
    // Lazy invalidation on GET /cart is sufficient for the SLA.
  }

  @EventPattern(RabbitMQEventType.PRODUCT_ARCHIVED)
  async onProductArchived() {
    await this.cartService.invalidateSnapshotByProductId();
  }
}
