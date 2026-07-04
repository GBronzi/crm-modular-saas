import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { AuthGuard,type AuthenticatedRequest } from '../auth/auth.guard.js';
import { parseBody } from '../common/validation.js';
import { createCustomerSchema } from './customers.schemas.js';
import { CustomersService } from './customers.service.js';
@Controller('customers') @UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customers:CustomersService) {}
  @Get() @Roles('maestro','colaborador','solo_lectura') list(@Req() req:AuthenticatedRequest) { return this.customers.list(req.user); }
  @Post() @Roles('maestro','colaborador') create(@Req() req:AuthenticatedRequest,@Body() body:unknown) { return this.customers.create(req.user,parseBody(createCustomerSchema,body)); }
}
