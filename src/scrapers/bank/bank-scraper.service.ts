import { Inject, Injectable } from '@nestjs/common';
import { BrowserFactory } from '../../utils/browser.factory';
import { LoggerService } from '../../utils/logger.service';
import { Page } from 'puppeteer';
import { BankStrategy } from './bank-strategy.interface';

export interface LoginInfo {
  username: string;
  password: string;
}

@Injectable()
export class BankScraperService {
  constructor(
    private readonly browserFactory: BrowserFactory,
    private readonly logger: LoggerService,
    @Inject('BANK_STRATEGY_MAP')
    private readonly strategies: Record<string, BankStrategy>,
  ) {}

  async login(
    bankCode: string,
    page: Page,
    credentials: LoginInfo,
  ): Promise<void> {
    const strategy = this.strategies[bankCode];
    if (!strategy) throw new Error(`지원하지 않는 은행: ${bankCode}`);
    await strategy.login(page, credentials);
  }

  async getBalance(bankCode: string, page: Page): Promise<number> {
    const strategy = this.strategies[bankCode];
    if (!strategy) throw new Error(`지원하지 않는 은행: ${bankCode}`);
    return await strategy.getBalance(page);
  }

  async getTransactionHistory(
    bankCode: string,
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const strategy = this.strategies[bankCode];
    if (!strategy) throw new Error(`지원하지 않는 은행: ${bankCode}`);
    return await strategy.getTransactionHistory(page, startDate, endDate);
  }

  async logout(page: Page): Promise<void> {
    try {
      this.logger.log('Logging out');

      // 로그아웃 버튼 클릭
      await Promise.all([
        // page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#logout-btn'),
        await page.waitForSelector('#account-section', {
          visible: true,
          timeout: 5000,
        }),
      ]);

      await page.close();
      this.logger.log('Logout successful');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Logout failed: ${errorMessage}`, errorStack);
      // 페이지는 항상 닫아야 함
      await page.close().catch(() => {});
      throw new Error(`Failed to logout: ${errorMessage}`);
    }
  }
}
