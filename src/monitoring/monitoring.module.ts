import { Module } from '@nestjs/common';
import { HealthService } from './health/health.service';
import { AlertsService } from './alerts/alerts.service';
import { MetricsService } from './metrics/metrics.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [
    HealthService,
    AlertsService,
    MetricsService,
  ],
  exports: [
    HealthService,
    AlertsService,
    MetricsService,
  ],
})
export class MonitoringModule {}
