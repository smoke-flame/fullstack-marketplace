import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import { OrderSagaOrchestrator } from './saga/order-saga.orchestrator';
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
  ) {}

  @Post('orders')
  @UseGuards(JwtGatewayGuard)
  async createOrder(
    @Body(new ZodValidationPipe(createOrderRequestSchema)) body: CreateOrderBody,
    @Req() request: GatewayRequest,
  ): Promise<OrderResponse> {
    return this.orderService.createOrder(request.user!.id, body.items, request.correlationId);
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
    const updated = await this.sagaOrchestrator.cancelOrder(id, request.user!.id, request.correlationId);
    return updated;
  }
}
