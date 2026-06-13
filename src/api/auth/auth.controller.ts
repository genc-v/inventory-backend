import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from '../../application/auth/auth.service';
import { AuthCredentialsDto } from '../../application/auth/dto/auth-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: AuthCredentialsDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: AuthCredentialsDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
