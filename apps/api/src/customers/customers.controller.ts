import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { Readable } from 'node:stream';
import { parseBody } from '../common/validation.js';
import { createCustomerNoteSchema, createCustomerSchema, customerIdSchema, updateCustomerSchema } from './customers.schemas.js';
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

  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="customers.csv"')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  async exportCsv(@Req() req: AuthenticatedRequest) {
    return new StreamableFile(Readable.from([await this.customers.exportCsv(req.user)]));
  }

  @Get('export.xls')
  @Header('content-type', 'application/vnd.ms-excel; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="customers.xls"')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  async exportExcel(@Req() req: AuthenticatedRequest) {
    return new StreamableFile(Readable.from([await this.customers.exportExcel(req.user)]));
  }

  @Get(':id')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customers.get(req.user, parseBody(customerIdSchema, id));
  }

  @Get(':id/notes')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  listNotes(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customers.listNotes(req.user, parseBody(customerIdSchema, id));
  }

  @Post(':id/notes')
  @Roles('maestro', 'colaborador')
  createNote(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.customers.createNote(req.user, parseBody(customerIdSchema, id), parseBody(createCustomerNoteSchema, body));
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
