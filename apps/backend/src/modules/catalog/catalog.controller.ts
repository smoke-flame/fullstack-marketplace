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
} from '@marketplace/contracts/api/catalog';
import type { ProductStatus } from '@marketplace/contracts/models';
import { type ProductCreatedPayload } from '@marketplace/contracts/events/catalog/product-created';
import { type ProductUpdatedPayload } from '@marketplace/contracts/events/catalog/product-updated';

type CreateCategoryBody = z.infer<typeof createCategoryRequestSchema>;

@Controller()
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly publisher: EventPublisher,
  ) {}

  @Post('categories')
  @UseGuards(JwtGatewayGuard)
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
  async findAllCategories() {
    return this.catalogService.findAllCategories();
  }

  @Post('products')
  @RateLimitGroup('catalog')
  @UseGuards(JwtGatewayGuard)
  @UsePipes(new ZodValidationPipe(createProductRequestSchema))
  async createProduct(@Body() body: CreateProductRequest, @Req() request: GatewayRequest): Promise<ProductResponse> {
    const product = await this.catalogService.createProduct(request.user!.id, body);
    const payload: ProductCreatedPayload = {
      productId: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      title: product.title,
      price: product.price,
      status: product.status,
    };
    await this.publisher.publish(new ProductCreatedEvent(payload, request.correlationId));
    return this.mapProductResponse(product);
  }

  @Get('products/:id')
  @Public()
  async findProductById(@Param('id') id: string): Promise<ProductResponse> {
    const product = await this.catalogService.findProductById(id);
    if (!product) {
      throw new ProductNotFoundException();
    }
    return this.mapProductResponse(product);
  }

  @Get('products')
  @Public()
  @RateLimitGroup('catalog')
  async findAllProducts(
    @Query('categoryId') categoryId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('status') status?: ProductStatus,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ProductResponse[]> {
    const products = await this.catalogService.findAllProducts({
      categoryId,
      sellerId,
      status,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return products.map((p) => this.mapProductResponse(p));
  }

  @Patch('products/:id')
  @RateLimitGroup('catalog')
  @UseGuards(JwtGatewayGuard)
  @UsePipes(new ZodValidationPipe(updateProductRequestSchema))
  async updateProduct(@Param('id') id: string, @Body() body: UpdateProductRequest, @Req() request: GatewayRequest): Promise<ProductResponse> {
    const product = await this.catalogService.updateProduct(id, request.user!.id, body);
    const payload: ProductUpdatedPayload = {
      productId: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      title: product.title,
      description: product.description ?? '',
      price: product.price,
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
    status: ProductStatus;
    createdAt: Date;
    updatedAt: Date;
  }): ProductResponse {
    return {
      id: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      title: product.title,
      description: product.description,
      price: product.price,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
