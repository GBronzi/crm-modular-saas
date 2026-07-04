import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { parseBody } from '../common/validation.js';
import { loginSchema, provisionSchema, refreshSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('provision') provision(@Body() body: unknown) { return this.auth.provision(parseBody(provisionSchema, body)); }
  @HttpCode(200) @Post('login') login(@Body() body: unknown) { return this.auth.login(parseBody(loginSchema, body)); }
  @HttpCode(200) @Post('refresh') refresh(@Body() body: unknown) { return this.auth.refresh(parseBody(refreshSchema, body)); }
  @HttpCode(204) @Post('logout') logout(@Body() body: unknown) { return this.auth.logout(parseBody(refreshSchema, body)); }
}
