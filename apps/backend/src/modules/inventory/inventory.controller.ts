import { Body, Controller, Get, Param, Put, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import { SellerGuard } from '@modules/catalog/guards/seller.guard';
import { CatalogService } from '@modules/catalog/catalog.service';
import { ProductNotFoundException, ProductForbiddenException } from '@modules/common/errors/catalog-errors';
import { Internal } from '@modules/common/decorators/internal.decorator';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import { setStockRequestSchema, type SetStockRequest, batchStockRequestSchema, type BatchStockResponse, type StockResponse } from '@marketplace/contracts/api/inventory/inventory';
import { z } from 'zod';

type SetStockBody = SetStockRequest;
type BatchQuery = { ids: string[] };

const batchStockQuerySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

@Controller()
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly catalogService: CatalogService,
  ) {}

  @Put('stock/:productId')
  @UseGuards(JwtGatewayGuard, SellerGuard)
  async setStock(
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(setStockRequestSchema)) body: SetStockBody,
    @Req() request: GatewayRequest,
  ): Promise<any> {
    const catalogProduct = await this.catalogService.findProductById(productId);
    if (!catalogProduct) throw new ProductNotFoundException();
    if (catalogProduct.sellerId !== request.user!.id) throw new ProductForbiddenException();
    return this.inventoryService.setStock(productId, body.onHand);
  }

  @Get('stock/:productId')
  @UseGuards(JwtGatewayGuard)
  async getStock(@Param('productId') productId: string): Promise<StockResponse> {
    return this.inventoryService.getStock(productId);
  }

  @Get('stock/batch')
  @UseGuards(JwtGatewayGuard)
  @UsePipes(new ZodValidationPipe(batchStockQuerySchema))
  async batchStockForUser(@Query() query: BatchQuery): Promise<BatchStockResponse> {
    const stocks = await this.inventoryService.getStocks(query.ids);
    const foundIds = new Set(stocks.map((s) => s.productId));
    const missing = query.ids.filter((id: string) => !foundIds.has(id));
    return { stocks, missing };
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
