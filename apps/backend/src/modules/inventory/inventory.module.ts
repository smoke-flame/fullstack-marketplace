import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryConsumer } from './inventory.consumer';
import { PrismaInventoryRepository } from './repositories/inventory.repository.prisma';
import { INVENTORY_REPOSITORY } from './repositories/inventory.repository';
import { PrismaModule } from '@modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    InventoryService,
    InventoryConsumer,
    PrismaInventoryRepository,
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
  ],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
