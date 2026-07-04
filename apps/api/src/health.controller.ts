import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async health(): Promise<{ status: 'ok'; database: 'ok' }> {
    await this.database.ping();
    return { status: 'ok', database: 'ok' };
  }
}

