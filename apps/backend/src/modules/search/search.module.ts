import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchConsumer } from './search.consumer';
import { PrismaSearchRepository } from './repositories/search.repository.prisma';
import { SEARCH_REPOSITORY } from './repositories/search.repository';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { CatalogModule } from '@modules/catalog/catalog.module';

@Module({
  imports: [PrismaModule, CatalogModule],
  providers: [
    SearchService,
    PrismaSearchRepository,
    { provide: SEARCH_REPOSITORY, useClass: PrismaSearchRepository },
  ],
  controllers: [SearchController, SearchConsumer],
  exports: [SearchService],
})
export class SearchModule {}
