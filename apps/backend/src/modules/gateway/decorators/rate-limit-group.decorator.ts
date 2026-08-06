import { SetMetadata } from '@nestjs/common';
export type RateLimitGroupName = 'auth' | 'catalog';
export const RATE_LIMIT_GROUP = 'gateway:rate-limit-group';
export const RateLimitGroup = (group: RateLimitGroupName) => SetMetadata(RATE_LIMIT_GROUP, group);
