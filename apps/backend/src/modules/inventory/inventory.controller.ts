import { Controller, Get, Param, Put, Query, UseGuards, Body, UsePipes } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import { Internal } from '@modules/common/decorators/internal.decorator';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';
import { setStockRequestSchema, type SetStockRequest, batchStockRequestSchema, type BatchStockResponse } from '@marketplace/contracts/api/inventory/inventory';

type SetStockBody = SetStockRequest;
type BatchQuery = { ids: string[] };

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Put('stock/:productId')
  @UseGuards(JwtGatewayGuard)
  @UsePipes(new ZodValidationPipe(setStockRequestSchema))
  async setStock(@Param('productId') productId: string, @Body() body: SetStockBody): Promise<any> {
    const product = await this.inventoryService.setStock(productId, body.onHand);
    return product;
  }

  @Get('stock/:productId')
  @UseGuards(JwtGatewayGuard)
  async getStock(@Param('productId') productId: string): Promise<any> {
    return this.inventoryService.getStock(productId);
  }

  @Get('internal/stock/batch')
  @Internal()
  @UsePipes(new ZodValidationPipe(batchStockRequestSchema))
  async batchStock(@Query() query: BatchQuery): Promise<BatchStockResponse> {
    const stocks = await this.inventoryService.getStocks(query.ids);
    const foundIds = new Set(stocks.map((s) => s.productId));
    const missing = query.ids.filter((id: string) => !foundIds.has(id));
    return { stocks, missing };
  }
}
