import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MarketingController } from './marketing.controller.js';
import { MarketingService } from './marketing.service.js';

@Module({ imports: [AuthModule], controllers: [MarketingController], providers: [MarketingService] })
export class MarketingModule {}
