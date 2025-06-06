import { Injectable } from '@nestjs/common';
import { ScrapingStrategy } from './scraping-strategy.interface';
import { LoggerService } from '../../utils/logger.service';

@Injectable()
export class ScrapingStrategyFactory {
  private strategies: Map<string, ScrapingStrategy> = new Map();

  constructor(private readonly logger: LoggerService) {}

  registerStrategy(bankCode: string, strategy: ScrapingStrategy): void {
    this.strategies.set(bankCode, strategy);
    this.logger.log(`Registered scraping strategy for bank: ${bankCode}`);
  }

  getStrategy(bankCode: string): ScrapingStrategy {
    const strategy = this.strategies.get(bankCode);
    if (!strategy) {
      this.logger.error(`No scraping strategy found for bank: ${bankCode}`);
      throw new Error(`No scraping strategy found for bank: ${bankCode}`);
    }
    return strategy;
  }

  hasStrategy(bankCode: string): boolean {
    return this.strategies.has(bankCode);
  }

  getAllSupportedBanks(): string[] {
    return Array.from(this.strategies.keys());
  }
}
