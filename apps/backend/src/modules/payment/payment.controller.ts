import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import type { PaymentResponse } from '@marketplace/contracts/models/payment';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('payments')
  @UseGuards(JwtGatewayGuard)
  async getPayments(@Req() request: GatewayRequest, @Query('orderId') orderId: string): Promise<PaymentResponse[]> {
    return this.paymentService.getPaymentsByOrderId(orderId, request.user!.id);
  }
}
