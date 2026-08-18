import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { PrismaCatalogRepository } from './repositories/catalog.repository.prisma';
import { CATEGORY_REPOSITORY, PRODUCT_REPOSITORY } from './repositories/catalog.repository';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { RabbitmqModule } from '@modules/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RabbitmqModule],
  providers: [
    CatalogService,
    PrismaCatalogRepository,
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCatalogRepository },
    { provide: PRODUCT_REPOSITORY, useClass: PrismaCatalogRepository },
  ],
  controllers: [CatalogController],
  exports: [CatalogService],
})
export class CatalogModule {}
