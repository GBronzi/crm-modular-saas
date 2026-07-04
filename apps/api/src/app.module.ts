import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health.controller.js';

@Module({ imports: [DatabaseModule, AuthModule, CustomersModule], controllers: [HealthController] })
export class AppModule {}

