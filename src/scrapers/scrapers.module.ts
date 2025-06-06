import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BankScraperService } from './bank/bank-scraper.service';
import { CaptchaService } from './captcha/captcha.service';
import { ScrapingStrategyFactory } from './strategies/scraping-strategy.factory';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scraping',
    }),
  ],
  providers: [
    BankScraperService,
    CaptchaService,
    ScrapingStrategyFactory,
  ],
  exports: [
    BankScraperService,
    CaptchaService,
    ScrapingStrategyFactory,
  ],
})
export class ScrapersModule {}
