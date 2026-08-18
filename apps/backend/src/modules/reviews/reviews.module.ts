import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsConsumer } from './reviews.consumer';
import { PrismaReviewRepository } from './repositories/review.repository.prisma';
import { REVIEW_REPOSITORY } from './repositories/review.repository';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { RabbitmqModule } from '@modules/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RabbitmqModule],
  providers: [
    ReviewsService,
    ReviewsConsumer,
    PrismaReviewRepository,
    { provide: REVIEW_REPOSITORY, useClass: PrismaReviewRepository },
  ],
  controllers: [ReviewsController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
