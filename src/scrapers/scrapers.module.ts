import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BankScraperService } from './bank/bank-scraper.service';
import { CaptchaService } from './captcha/captcha.service';
import { ScrapingStrategyFactory } from './strategies/scraping-strategy.factory';
import { UtilsModule } from 'src/utils/utils.module';
import { KbBankStrategy } from './bank/strategies/kb-bank.strategy';
import { HanaBankStrategy } from './bank/strategies/hana-bank.strategy';
import { IbkBankStrategy } from './bank/strategies/ibk-bank.strategy';
import { WooriBankStrategy } from './bank/strategies/woori-bank.strategy';
import { ShinhanBankStrategy } from './bank/strategies/shinhan-bank.strategy';
import { BankScraperController } from './bank/bank-scraper.controller';

const strategies = {
  kb: new KbBankStrategy(),
  hana: new HanaBankStrategy(),
  ibk: new IbkBankStrategy(),
  woori: new WooriBankStrategy(),
  shinhan: new ShinhanBankStrategy(),
};

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scraping',
    }),
    UtilsModule,
  ],
  providers: [
    BankScraperController,
    BankScraperService,
    CaptchaService,
    ScrapingStrategyFactory,
    {
      provide: 'BANK_STRATEGY_MAP',
      useValue: strategies,
    },
  ],
  exports: [BankScraperService, CaptchaService, ScrapingStrategyFactory],
})
export class ScrapersModule {}
