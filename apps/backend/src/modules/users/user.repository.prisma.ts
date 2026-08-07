import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository, type UserEntity } from './user.repository';
import type { UserRole } from '@marketplace/contracts/models/user';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      roles: user.roles as UserRole[],
      createdAt: user.createdAt,
    };
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      roles: user.roles as UserRole[],
      createdAt: user.createdAt,
    };
  }

  async create(data: { email: string; password: string; roles: UserRole[] }): Promise<UserEntity> {
    const user = await this.prisma.user.create({ data: { ...data, roles: data.roles as never[] } });
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      roles: user.roles as UserRole[],
      createdAt: user.createdAt,
    };
  }
}
