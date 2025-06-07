import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProxyService } from './proxy/proxy.service';
import { QueueService } from './queue/queue.service';
import { SessionService } from './session/session.service';
import { ScrapingProcessor } from './queue/scraping.processor';
import { UtilsModule } from 'src/utils/utils.module';
import { ScrapersModule } from 'src/scrapers/scrapers.module';
import { MonitoringModule } from 'src/monitoring/monitoring.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scraping',
    }),
    UtilsModule,
    ScrapersModule,
    MonitoringModule,
  ],
  providers: [ProxyService, QueueService, SessionService, ScrapingProcessor],
  exports: [ProxyService, QueueService, SessionService],
})
export class InfrastructureModule {}
