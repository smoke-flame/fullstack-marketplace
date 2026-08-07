import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaUserRepository } from './user.repository.prisma';
import { USER_REPOSITORY } from './user.repository';

@Module({
  imports: [PrismaModule],
  providers: [PrismaUserRepository, { provide: USER_REPOSITORY, useClass: PrismaUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
