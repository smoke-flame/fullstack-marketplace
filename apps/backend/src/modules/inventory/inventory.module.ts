import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryConsumer } from './inventory.consumer';
import { PrismaInventoryRepository } from './repositories/inventory.repository.prisma';
import { INVENTORY_REPOSITORY } from './repositories/inventory.repository';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { CatalogModule } from '@modules/catalog/catalog.module';

@Module({
  imports: [PrismaModule, CatalogModule],
  providers: [
    InventoryService,
    PrismaInventoryRepository,
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
  ],
  controllers: [InventoryController, InventoryConsumer],
  exports: [InventoryService],
})
export class InventoryModule {}
