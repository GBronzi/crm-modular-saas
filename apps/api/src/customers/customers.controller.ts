import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { parseBody } from '../common/validation.js';
import { createCustomerSchema, customerIdSchema, updateCustomerSchema } from './customers.schemas.js';
import { CustomersService } from './customers.service.js';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @Roles('maestro', 'colaborador', 'solo_lectura')
  list(@Req() req: AuthenticatedRequest) {
    return this.customers.list(req.user);
  }

  @Get(':id')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customers.get(req.user, parseBody(customerIdSchema, id));
  }

  @Post()
  @Roles('maestro', 'colaborador')
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.customers.create(req.user, parseBody(createCustomerSchema, body));
  }

  @Patch(':id')
  @Roles('maestro', 'colaborador')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.customers.update(req.user, parseBody(customerIdSchema, id), parseBody(updateCustomerSchema, body));
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('maestro', 'colaborador')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customers.remove(req.user, parseBody(customerIdSchema, id));
  }
}