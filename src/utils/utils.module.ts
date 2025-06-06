import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { BrowserFactory } from './browser.factory';

@Module({
  providers: [
    LoggerService,
    BrowserFactory,
  ],
  exports: [
    LoggerService,
    BrowserFactory,
  ],
})
export class UtilsModule {}
