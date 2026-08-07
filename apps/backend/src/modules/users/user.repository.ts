import type { UserRole } from '@marketplace/contracts/models/user';

export interface UserEntity {
  id: string;
  email: string;
  password: string;
  roles: UserRole[];
  createdAt: Date;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(data: { email: string; password: string; roles: UserRole[] }): Promise<UserEntity>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
