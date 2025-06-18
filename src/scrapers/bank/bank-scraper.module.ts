import { Module } from '@nestjs/common';
import { BankScraperController } from './bank-scraper.controller';
import { BankScraperService } from './bank-scraper.service';
import { BrowserFactory } from '../../utils/browser.factory';
import { LoggerService } from '../../utils/logger.service';

@Module({
  controllers: [BankScraperController],
  providers: [
    BankScraperService,
    BrowserFactory,
    LoggerService,
    {
      provide: 'BANK_STRATEGY_MAP',
      useValue: {}, // 실제 은행 전략들은 여기에 추가됩니다
    },
  ],
  exports: [BankScraperService],
})
export class BankScraperModule {}
