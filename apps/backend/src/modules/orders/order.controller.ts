import { Body, Controller, Get, Param, Post, Req, UseGuards, Query, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { OrderService } from './order.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import { OrderSagaOrchestrator } from './saga/order-saga.orchestrator';
import { OrderNotFoundException } from '@modules/common/errors/order-errors';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import { createOrderRequestSchema, type CreateOrderRequest, type OrderResponse, type PaginatedOrdersResponse } from '@marketplace/contracts/api/orders/orders';

type CreateOrderBody = CreateOrderRequest;

const findOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(20).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

type FindOrdersQuery = z.infer<typeof findOrdersQuerySchema>;

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
  @UsePipes(new ZodValidationPipe(findOrdersQuerySchema))
  async findOrders(@Req() request: GatewayRequest, @Query() query: FindOrdersQuery): Promise<PaginatedOrdersResponse> {
    return this.orderService.findByBuyerId(request.user!.id, query.limit, query.offset);
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
