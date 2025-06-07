import { Module } from '@nestjs/common';
import { HealthService } from './health/health.service';
import { AlertsService } from './alerts/alerts.service';
import { MetricsService } from './metrics/metrics.service';
import { ScheduleModule } from '@nestjs/schedule';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [ScheduleModule.forRoot(), UtilsModule],
  providers: [HealthService, AlertsService, MetricsService],
  exports: [HealthService, AlertsService, MetricsService],
})
export class MonitoringModule {}
