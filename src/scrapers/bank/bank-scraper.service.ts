import { Injectable } from '@nestjs/common';
import { BrowserFactory } from '../../utils/browser.factory';
import { LoggerService } from '../../utils/logger.service';
import { Page } from 'puppeteer';

export interface LoginInfo {
  username: string;
  password: string;
}

@Injectable()
export class BankScraperService {
  constructor(
    private readonly browserFactory: BrowserFactory,
    private readonly logger: LoggerService,
  ) {}

  async login(bankUrl: string, credentials: LoginInfo): Promise<Page> {
    try {
      this.logger.log(`Logging into bank: ${bankUrl}`);

      const page = await this.browserFactory.newPage();

      // 기본 설정
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      // 페이지 로드 (file:// 환경에서는 'load' 사용)
      await page.goto(bankUrl, { waitUntil: 'load' });

      // 로그인 폼 작성
      await page.type('#username', credentials.username);
      await page.type('#password', credentials.password);

      // 로그인 버튼 클릭 및 account-section이 보일 때까지 대기
      await page.click('#login-btn');
      await page.waitForSelector('#account-section', {
        visible: true,
        timeout: 5000,
      });

      this.logger.log('Login successful');
      return page;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Login failed: ${errorMessage}`, errorStack);
      throw new Error(`Failed to login to bank: ${errorMessage}`);
    }
  }
  // ...생략...

  async getBalance(page: Page): Promise<number> {
    try {
      this.logger.log('Fetching account balance');

      // 잔액 정보가 있는 요소 대기
      await page.waitForSelector('#account-balance', { timeout: 10000 });

      // 잔액 추출
      const balanceText = await page.$eval(
        '#account-balance',
        (el) => el.textContent,
      );

      // 숫자만 추출 (쉼표, 통화 기호 등 제거)
      const balance = parseFloat(balanceText?.replace(/[^0-9.-]+/g, '') || '0');

      this.logger.log(`Balance fetched: ${balance}`);
      return balance;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get balance: ${errorMessage}`, errorStack);
      throw new Error(`Failed to get account balance: ${errorMessage}`);
    }
  }

  async getTransactionHistory(
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    try {
      this.logger.log(
        `Fetching transaction history from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

      // 거래내역 페이지로 이동
      await page.click('#transaction-history-tab');
      await page.waitForSelector('#date-range-form', { timeout: 10000 });

      // 날짜 범위 설정
      await page.type('#start-date', startDate.toISOString().split('T')[0]);
      await page.type('#end-date', endDate.toISOString().split('T')[0]);

      // 조회 버튼 클릭
      await page.click('#search-transactions-btn');
      // 거래내역이 렌더링될 때까지 대기
      await page.waitForSelector('.transaction-item', { timeout: 5000 });

      // 거래내역 추출
      const transactions = await page.$$eval('.transaction-item', (items) => {
        return items.map((item) => ({
          date: item.querySelector('.date')?.textContent,
          description: item.querySelector('.description')?.textContent,
          amount: item.querySelector('.amount')?.textContent,
          balance: item.querySelector('.balance')?.textContent,
        }));
      });

      this.logger.log(`Fetched ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get transaction history: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Failed to get transaction history: ${errorMessage}`);
    }
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
