import { Body, Controller, Get, Param, Post, Req, UseGuards, UsePipes, Inject } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import { OrderSagaOrchestrator } from './saga/order-saga.orchestrator';
import { OutboxRepository, OUTBOX_REPOSITORY } from './outbox/outbox.repository';
import { OrderCreatedEvent } from './events/order.created.event';
import { OrderNotFoundException } from '@modules/common/errors/order-errors';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import { createOrderRequestSchema, type CreateOrderRequest, type OrderResponse } from '@marketplace/contracts/api/orders/orders';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';

type CreateOrderBody = CreateOrderRequest;

@Controller()
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly sagaOrchestrator: OrderSagaOrchestrator,
    @Inject(OUTBOX_REPOSITORY) private readonly outbox: OutboxRepository,
  ) {}

  @Post('orders')
  @UseGuards(JwtGatewayGuard)
  @UsePipes(new ZodValidationPipe(createOrderRequestSchema))
  async createOrder(@Body() body: CreateOrderBody, @Req() request: GatewayRequest): Promise<OrderResponse> {
    const order = await this.orderService.createOrder(request.user!.id, body.items);

    const orderCreatedEvent = new OrderCreatedEvent({
      orderId: order.id,
      buyerId: request.user!.id,
      items: body.items,
      totalAmount: order.totalAmount,
    }, request.correlationId);

    await this.outbox.create({
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: orderCreatedEvent.eventType,
      payload: JSON.stringify(orderCreatedEvent.toJSON()),
    });

    await this.sagaOrchestrator.startSaga(order.id, body.items.map((item) => ({
      productId: item.productId,
      qty: item.qty,
    })), request.correlationId);

    return order;
  }

  @Get('orders')
  @UseGuards(JwtGatewayGuard)
  async findOrders(@Req() request: GatewayRequest): Promise<OrderResponse[]> {
    return this.orderService.findByBuyerId(request.user!.id);
  }

  @Get('orders/:id')
  @UseGuards(JwtGatewayGuard)
  async findOrderById(@Param('id') id: string): Promise<OrderResponse> {
    const order = await this.orderService.findById(id);
    if (!order) {
      throw new OrderNotFoundException();
    }
    return order;
  }

  @Post('orders/:id/cancel')
  @UseGuards(JwtGatewayGuard)
  async cancelOrder(@Param('id') id: string, @Req() request: GatewayRequest): Promise<OrderResponse> {
    const updated = await this.sagaOrchestrator.cancelOrder(id, request.user!.id);
    return updated;
  }
}
