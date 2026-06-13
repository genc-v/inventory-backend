import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../domain/users/user.entity';
import { JwtPayload } from '../../domain/auth/jwt-payload';
import { UsersService } from '../users/users.service';
import { AuthResult } from './auth-result';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.create(email, password);
    return this.issueToken(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmailWithHash(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw new UnauthorizedException('Invalid credentials');

    return this.issueToken(user);
  }

  private async issueToken(user: User): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };
    const accessToken = await this.jwt.signAsync(payload);
    return {
      accessToken,
      user: { id: user.id, email: user.email, isAdmin: user.isAdmin },
    };
  }
}
