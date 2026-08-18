import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('cart')
  @UseGuards(JwtGatewayGuard)
  async getCart(@Req() request: GatewayRequest) {
    return this.cartService.getCart(request.user!.id);
  }

  @Put('cart/items/:productId')
  @UseGuards(JwtGatewayGuard)
  async upsertItem(@Param('productId') productId: string, @Req() request: GatewayRequest, @Body('qty') qty: number) {
    return this.cartService.upsertItem(request.user!.id, productId, qty);
  }

  @Delete('cart/items/:productId')
  @UseGuards(JwtGatewayGuard)
  async removeItem(@Param('productId') productId: string, @Req() request: GatewayRequest) {
    return this.cartService.removeItem(request.user!.id, productId);
  }

  @Delete('cart')
  @UseGuards(JwtGatewayGuard)
  async clear(@Req() request: GatewayRequest) {
    return this.cartService.clear(request.user!.id);
  }
}
