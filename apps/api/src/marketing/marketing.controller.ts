import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { parseBody } from '../common/validation.js';
import { bounceDeliverySchema, createCampaignSchema, enqueueCampaignSchema, processMarketingQueueSchema, updateCampaignSchema, uuidSchema } from './marketing.schemas.js';
import { MarketingService } from './marketing.service.js';

@Controller('marketing')
@UseGuards(AuthGuard)
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Get('campaigns')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  listCampaigns(@Req() req: AuthenticatedRequest) {
    return this.marketing.listCampaigns(req.user);
  }

  @Post('campaigns')
  @Roles('maestro', 'colaborador')
  createCampaign(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.marketing.createCampaign(req.user, parseBody(createCampaignSchema, body));
  }

  @Get('campaigns/:id')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  getCampaign(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.marketing.getCampaign(req.user, parseBody(uuidSchema, id));
  }

  @Patch('campaigns/:id')
  @Roles('maestro', 'colaborador')
  updateCampaign(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.marketing.updateCampaign(req.user, parseBody(uuidSchema, id), parseBody(updateCampaignSchema, body));
  }

  @Post('campaigns/:id/enqueue')
  @Roles('maestro', 'colaborador')
  enqueueCampaign(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.marketing.enqueueCampaign(req.user, parseBody(uuidSchema, id), parseBody(enqueueCampaignSchema, body));
  }

  @Get('campaigns/:id/deliveries')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  listDeliveries(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.marketing.listDeliveries(req.user, parseBody(uuidSchema, id));
  }

  @Get('queue/panel')
  @Roles('maestro', 'colaborador', 'solo_lectura')
  queuePanel(@Req() req: AuthenticatedRequest) {
    return this.marketing.queuePanel(req.user);
  }

  @Post('deliveries/:id/retry')
  @Roles('maestro', 'colaborador')
  retryDelivery(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.marketing.retryDelivery(req.user, parseBody(uuidSchema, id));
  }

  @Post('deliveries/:id/bounce')
  @Roles('maestro', 'colaborador')
  bounceDelivery(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.marketing.bounceDelivery(req.user, parseBody(uuidSchema, id), parseBody(bounceDeliverySchema, body));
  }

  @Post('worker/process')
  @Roles('maestro')
  processQueue(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.marketing.processQueue(req.user, parseBody(processMarketingQueueSchema, body));
  }
}
