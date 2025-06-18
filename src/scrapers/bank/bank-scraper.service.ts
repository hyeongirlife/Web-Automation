import { Inject, Injectable } from '@nestjs/common';
import { BrowserFactory } from '../../utils/browser.factory';
import { LoggerService } from '../../utils/logger.service';
import { Page } from 'puppeteer';
import { BankStrategy } from './bank-strategy.interface';
import { ConfigService } from '@nestjs/config';

export interface LoginInfo {
  username: string;
  password: string;
}

export interface TransactionHistoryResponse {
  date: string;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  balance: number;
  category?: string;
}

interface BankError extends Error {
  statusCode?: number;
}

@Injectable()
export class BankScraperService {
  private readonly timeouts: {
    navigation: number;
    element: number;
    render: number;
  };

  constructor(
    private readonly browserFactory: BrowserFactory,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    @Inject('BANK_STRATEGY_MAP')
    private readonly strategies: Record<string, BankStrategy>,
  ) {
    // 설정에서 타임아웃 값을 가져옴
    this.timeouts = {
      navigation: this.configService.get<number>('NAVIGATION_TIMEOUT', 30000),
      element: this.configService.get<number>('ELEMENT_TIMEOUT', 10000),
      render: this.configService.get<number>('RENDER_TIMEOUT', 5000),
    };
  }

  async login(
    bankCode: string,
    page: Page,
    credentials: LoginInfo,
  ): Promise<void> {
    const strategy = this.strategies[bankCode];
    if (!strategy) {
      throw new Error(`지원하지 않는 은행: ${bankCode}`);
    }
    await strategy.login(page, credentials);
  }

  async getBalance(bankCode: string, page: Page): Promise<number> {
    const strategy = this.strategies[bankCode];
    if (!strategy) {
      throw new Error(`지원하지 않는 은행: ${bankCode}`);
    }
    return await strategy.getBalance(page);
  }

  async getTransactionHistory(
    bankCode: string,
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<TransactionHistoryResponse[]> {
    const strategy = this.strategies[bankCode];
    if (!strategy) {
      throw new Error(`지원하지 않는 은행: ${bankCode}`);
    }
    return await strategy.getTransactionHistory(page, startDate, endDate);
  }

  async logout(page: Page): Promise<void> {
    try {
      this.logger.log('Logging out');

      // 로그아웃 버튼 클릭
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#logout-btn'),
      ]);

      // 로그아웃 완료 확인
      await page.waitForSelector('#account-section', {
        visible: true,
        timeout: 5000,
      });

      this.logger.log('Logout successful');
    } catch (error) {
      const bankError = error as BankError;
      const errorMessage = bankError.message || 'Unknown error';
      const errorStack = bankError.stack;
      this.logger.error(`Logout failed: ${errorMessage}`, errorStack);
      throw new Error(`Failed to logout: ${errorMessage}`);
    } finally {
      // 페이지는 항상 닫기 시도
      try {
        await page.close();
      } catch (closeError) {
        this.logger.error('Failed to close page after logout');
      }
    }
  }

  protected async waitForLoadingToComplete(page: Page): Promise<void> {
    await page.waitForFunction(
      () => {
        const loadingElement = document.querySelector('.loading-indicator');
        return (
          !loadingElement ||
          window.getComputedStyle(loadingElement).display === 'none'
        );
      },
      { timeout: 30000 },
    );
  }

  protected async getErrorMessage(page: Page): Promise<string | null> {
    const errorElement = await page.$('.error-message');
    if (!errorElement) return null;

    const textContent = await errorElement.evaluate(
      (element: Element) => element.textContent || '',
    );
    return textContent.trim() || null;
  }

  protected async waitForElementToBeVisible(
    page: Page,
    selector: string,
    timeout = 5000,
  ): Promise<void> {
    await page.waitForFunction(
      (sel: string) => {
        const element = document.querySelector(sel);
        return (
          element &&
          window.getComputedStyle(element).display !== 'none' &&
          window.getComputedStyle(element).visibility !== 'hidden'
        );
      },
      { timeout },
      selector,
    );

    // 추가 안정성을 위한 짧은 대기
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
