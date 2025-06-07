import { Test, TestingModule } from '@nestjs/testing';
import { BankScraperService, LoginInfo } from './bank-scraper.service';
import * as puppeteer from 'puppeteer';
import { LoggerService } from '../../utils/logger.service';
import { BrowserFactory } from '../../utils/browser.factory';
import * as fs from 'fs';
import * as path from 'path';

class MockLoggerService {
  log(message: string) {
    console.log('[Logger]', message);
  }
  error(message: string, stack?: string) {
    console.error('[Logger][Error]', message, stack);
  }
}

class MockBrowserFactory {
  private browser: puppeteer.Browser;
  async newPage(): Promise<puppeteer.Page> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--allow-file-access-from-files',
        ],
      });
    }
    return this.browser.newPage();
  }
  async close() {
    if (this.browser) await this.browser.close();
  }
}

describe('BankScraperService (diagnostic e2e)', () => {
  let service: BankScraperService;
  let browserFactory: MockBrowserFactory;

  // 진단: 파일 경로 및 존재 여부 확인
  const htmlPath = path.resolve('public/test-bank.html');
  const testUrl = 'file://' + htmlPath;
  const credentials: LoginInfo = { username: 'testuser', password: 'testpass' };

  beforeAll(async () => {
    browserFactory = new MockBrowserFactory();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankScraperService,
        { provide: LoggerService, useClass: MockLoggerService },
        { provide: BrowserFactory, useValue: browserFactory },
      ],
    }).compile();

    service = module.get<BankScraperService>(BankScraperService);

    // 파일 존재 여부 로그
    console.log('HTML exists:', fs.existsSync(htmlPath));
    console.log('Test URL:', testUrl);
  });

  afterAll(async () => {
    await browserFactory.close();
  });

  it('진단: 로그인, 잔액, 거래내역, 로그아웃', async () => {
    let page;
    try {
      console.log('1. 로그인 시도');
      page = await service.login(testUrl, credentials);
      console.log('2. 로그인 성공');

      console.log('3. 잔액 조회 시도');
      const balance = await service.getBalance(page);
      console.log('4. 잔액 조회 성공:', balance);

      console.log('5. 거래내역 조회 시도');
      const startDate = new Date('2020-03-15');
      const endDate = new Date();
      const transactions = await service.getTransactionHistory(
        page,
        startDate,
        endDate,
      );
      console.log('6. 거래내역 조회 성공:', transactions.length);

      console.log('7. 로그아웃 시도');
      await service.logout(page);
      console.log('8. 로그아웃 성공');
    } catch (err) {
      console.error('에러 발생:', err.message, err.stack);
      if (page) {
        const screenshotPath = path.resolve('login-error.png');
        await page.screenshot({ path: screenshotPath });
        console.error('실패 시점 스크린샷 저장:', screenshotPath);
      }
      throw err;
    }
  }, 30000); // 타임아웃 30초로 증가
});
