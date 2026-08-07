import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../config/env';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/user.module';
import { CommonModule } from '../common/common.module';
import { UserCreatedEvent } from './events/user-created.event';

@Module({
  imports: [
    CommonModule,
    UsersModule,
    JwtModule.register({
      global: true,
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: env.JWT_ACCESS_EXPIRES_IN as never },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, UserCreatedEvent],
})
export class AuthModule {}
