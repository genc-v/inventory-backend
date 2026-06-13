import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../../domain/users/user.entity';
import { USERS_REPOSITORY } from '../../domain/users/users.repository';
import type { UsersRepository } from '../../domain/users/users.repository';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly users: UsersRepository,
  ) {}

  async create(email: string, password: string): Promise<User> {
    const existing = await this.users.findByEmail(email);

    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return this.users.create({ email, passwordHash });
  }

  findByEmailWithHash(email: string): Promise<User | null> {
    return this.users.findByEmailWithHash(email);
  }

  findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }
}
