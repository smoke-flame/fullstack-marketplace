import { SetMetadata } from '@nestjs/common';
export const IS_INTERNAL = 'gateway:is-internal';
export const Internal = () => SetMetadata(IS_INTERNAL, true);
