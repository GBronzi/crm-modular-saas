import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { parseBody } from '../common/validation.js';
import { createUserSchema, updateUserSchema, userIdSchema } from './users.schemas.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(AuthGuard)
@Roles('maestro')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.users.list(req.user);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.users.create(req.user, parseBody(createUserSchema, body));
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.users.update(req.user, parseBody(userIdSchema, id), parseBody(updateUserSchema, body));
  }
}

