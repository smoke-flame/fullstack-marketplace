import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartConsumer } from './cart.consumer';
import { RedisCartRepository } from './repositories/cart.repository.redis';
import { CART_REPOSITORY } from './repositories/cart.repository';
import { RedisModule } from '@modules/redis/redis.module';
import { CatalogModule } from '@modules/catalog/catalog.module';

@Module({
  imports: [RedisModule, CatalogModule],
  providers: [
    CartService,
    CartConsumer,
    RedisCartRepository,
    { provide: CART_REPOSITORY, useClass: RedisCartRepository },
  ],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
