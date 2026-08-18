import { Controller, Get, Post, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '@modules/common/decorators/public.decorator';
import { Internal as InternalDecorator } from '@modules/common/decorators/internal.decorator';
import type { SearchRequest, SearchResponse } from '@marketplace/contracts/api/search/search';

type SearchQuery = SearchRequest;

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  @Public()
  async search(@Query() query: SearchQuery): Promise<SearchResponse> {
    return this.searchService.search(query);
  }

  @Post('internal/reindex')
  @InternalDecorator()
  async reindex(): Promise<{ reindexed: number }> {
    await this.searchService.reindexAll();
    return { reindexed: 1 };
  }
}
