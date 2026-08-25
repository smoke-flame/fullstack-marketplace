import { Body, Controller, Get, Param, Post, Query, Req, UsePipes, Delete, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CatalogService } from './catalog.service';
import { Public } from '@modules/common/decorators/public.decorator';
import { Internal } from '@modules/common/decorators/internal.decorator';
import { RateLimitGroup } from '@modules/gateway/decorators/rate-limit-group.decorator';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { ProductCreatedEvent } from './events/product.created.event';
import { ProductUpdatedEvent } from './events/product.updated.event';
import { ProductArchivedEvent } from './events/product.archived.event';
import { SellerGuard } from './guards/seller.guard';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import { ProductNotFoundException } from '@modules/common/errors/catalog-errors';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import {
  createCategoryRequestSchema,
  type CategoryResponse,
  createProductRequestSchema,
  type CreateProductRequest,
  updateProductRequestSchema,
  type UpdateProductRequest,
  batchProductsRequestSchema,
  type BatchProductsRequest,
  type BatchProductsResponse,
  type ProductResponse,
  type PaginatedProductsResponse,
} from '@marketplace/contracts/api/catalog';
import { ProductStatus } from '@marketplace/contracts/models';
import { type ProductCreatedPayload } from '@marketplace/contracts/events/catalog/product-created';
import { type ProductUpdatedPayload } from '@marketplace/contracts/events/catalog/product-updated';

type CreateCategoryBody = z.infer<typeof createCategoryRequestSchema>;

const findAllProductsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  limit: z.coerce.number().int().min(20).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

type FindAllProductsQuery = z.infer<typeof findAllProductsQuerySchema>;

@Controller()
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly publisher: EventPublisher,
  ) {}

  @Post('categories')
  @UseGuards(JwtGatewayGuard, SellerGuard)
  @UsePipes(new ZodValidationPipe(createCategoryRequestSchema))
  async createCategory(@Body() body: CreateCategoryBody): Promise<CategoryResponse> {
    const category = await this.catalogService.createCategory(body);
    return {
      id: category.id,
      parentId: category.parentId,
      title: category.title,
    };
  }

  @Get('categories')
  @Public()
  async findAllCategories(@Query('q') query?: string) {
    return this.catalogService.findAllCategories(query?.trim() || undefined);
  }

  @Post('products')
  @RateLimitGroup('catalog')
  @UseGuards(JwtGatewayGuard, SellerGuard)
  async createProduct(@Body(new ZodValidationPipe(createProductRequestSchema)) body: CreateProductRequest, @Req() request: GatewayRequest): Promise<ProductResponse> {
    const product = await this.catalogService.createProduct(request.user!.id, body);
    const payload: ProductCreatedPayload = {
      productId: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      title: product.title,
      description: product.description ?? '',
      price: product.price,
      currency: product.currency,
      status: product.status,
    };
    await this.publisher.publish(new ProductCreatedEvent(payload, request.correlationId));
    return this.mapProductResponse(product);
  }

  @Get('products/:id')
  @Public()
  async findProductById(@Param('id') id: string): Promise<ProductResponse> {
    const product = await this.catalogService.findProductDetails(id);
    if (!product) {
      throw new ProductNotFoundException();
    }
    return this.mapProductResponse(product);
  }

  @Get('products')
  @Public()
  @RateLimitGroup('catalog')
  @UsePipes(new ZodValidationPipe(findAllProductsQuerySchema))
  async findAllProducts(@Query() query: FindAllProductsQuery): Promise<PaginatedProductsResponse> {
    const q = query as FindAllProductsQuery;
    const result = await this.catalogService.findAllProducts({
      categoryId: q.categoryId,
      sellerId: q.sellerId,
      status: q.status,
      limit: q.limit,
      offset: q.offset,
    });
    const paginated = Array.isArray(result) ? { items: result, total: result.length, limit: q.limit, offset: q.offset } : result;
    return {
      items: paginated.items.map((p) => this.mapProductResponse(p)),
      total: paginated.total,
      limit: paginated.limit,
      offset: paginated.offset,
    };
  }

  @Patch('products/:id')
  @RateLimitGroup('catalog')
  @UseGuards(JwtGatewayGuard)
  async updateProduct(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductRequestSchema)) body: UpdateProductRequest,
    @Req() request: GatewayRequest,
  ): Promise<ProductResponse> {
    const product = await this.catalogService.updateProduct(id, request.user!.id, body);
    const payload: ProductUpdatedPayload = {
      productId: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      title: product.title,
      description: product.description ?? '',
      price: product.price,
      currency: product.currency,
      status: product.status,
    };
    await this.publisher.publish(new ProductUpdatedEvent(payload, request.correlationId));
    return this.mapProductResponse(product);
  }

  @Delete('products/:id')
  @RateLimitGroup('catalog')
  @UseGuards(JwtGatewayGuard)
  async archiveProduct(@Param('id') id: string, @Req() request: GatewayRequest): Promise<ProductResponse> {
    const product = await this.catalogService.archiveProduct(id, request.user!.id);
    await this.publisher.publish(new ProductArchivedEvent({ productId: product.id }, request.correlationId));
    return this.mapProductResponse(product);
  }

  @Post('internal/products/batch')
  @Internal()
  @UsePipes(new ZodValidationPipe(batchProductsRequestSchema))
  async batchProducts(@Body() body: BatchProductsRequest): Promise<BatchProductsResponse> {
    return this.catalogService.batchProducts(body);
  }

  private mapProductResponse(product: {
    id: string;
    sellerId: string;
    categoryId: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
    status: ProductStatus;
    createdAt: Date;
    updatedAt: Date;
    categoryTitle?: string;
    sellerEmail?: string;
  }): ProductResponse {
    return {
      id: product.id,
      sellerId: product.sellerId,
      ...(product.sellerEmail ? { sellerEmail: product.sellerEmail } : {}),
      categoryId: product.categoryId,
      ...(product.categoryTitle ? { categoryTitle: product.categoryTitle } : {}),
      title: product.title,
      description: product.description,
      price: product.price,
      currency: product.currency,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
