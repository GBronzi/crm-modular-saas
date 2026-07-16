import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { parseBody } from '../common/validation.js';
import { createPaymentSchema, createSaleSchema, uuidSchema } from './finance.schemas.js';
import { FinanceService } from './finance.service.js';

@Controller()
@UseGuards(AuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('finance/dashboard')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  dashboard(@Req() req: AuthenticatedRequest) {
    return this.finance.dashboard(req.user);
  }
  @Get('customers/:customerId/finance')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  summary(@Req() req: AuthenticatedRequest, @Param('customerId') customerId: string) {
    return this.finance.summary(req.user, parseBody(uuidSchema, customerId));
  }

  @Post('customers/:customerId/sales')
  @Roles('maestro', 'colaborador')
  createSale(@Req() req: AuthenticatedRequest, @Param('customerId') customerId: string, @Body() body: unknown) {
    return this.finance.createSale(req.user, parseBody(uuidSchema, customerId), parseBody(createSaleSchema, body));
  }

  @Post('installments/:installmentId/payments')
  @Roles('maestro', 'colaborador')
  createPayment(@Req() req: AuthenticatedRequest, @Param('installmentId') installmentId: string, @Body() body: unknown) {
    return this.finance.createPayment(req.user, parseBody(uuidSchema, installmentId), parseBody(createPaymentSchema, body));
  }
}
