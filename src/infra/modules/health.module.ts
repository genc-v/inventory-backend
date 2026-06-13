import { Module } from '@nestjs/common';
import { HealthController } from '../../api/health/health.controller';
import { HealthService } from '../../application/health/health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
