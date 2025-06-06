import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProxyService } from './proxy/proxy.service';
import { QueueService } from './queue/queue.service';
import { SessionService } from './session/session.service';
import { ScrapingProcessor } from './queue/scraping.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scraping',
    }),
  ],
  providers: [
    ProxyService,
    QueueService,
    SessionService,
    ScrapingProcessor,
  ],
  exports: [
    ProxyService,
    QueueService,
    SessionService,
  ],
})
export class InfrastructureModule {}
