import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { Internal } from '@modules/common/decorators/internal.decorator';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentTestController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('internal/test/payment/failure-probability')
  @Internal()
  async getFailureProbability() {
    return { failureProbability: this.paymentService.getFailureProbability() };
  }

  @Post('internal/test/payment/failure-probability')
  @HttpCode(200)
  @Internal()
  async setFailureProbability(@Body() body: { probability: number }) {
    this.paymentService.setFailureProbability(body.probability);
    return { failureProbability: this.paymentService.getFailureProbability() };
  }
}
