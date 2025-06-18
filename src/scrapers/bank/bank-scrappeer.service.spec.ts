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

describe('BankScraperService 단위 테스트', () => {
  let service: BankScraperService;
  let browserFactory: MockBrowserFactory;
  let page: puppeteer.Page;

  const TEST_HTML_PATH = path.resolve('public/test-bank.html');
  const TEST_URL = 'file://' + TEST_HTML_PATH;
  const TEST_CREDENTIALS: LoginInfo = {
    username: 'testuser',
    password: 'testpass',
  };

  beforeAll(async () => {
    // Given: 테스트에 필요한 서비스와 모의 객체들을 설정
    browserFactory = new MockBrowserFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankScraperService,
        { provide: LoggerService, useClass: MockLoggerService },
        { provide: BrowserFactory, useValue: browserFactory },
      ],
    }).compile();

    service = module.get<BankScraperService>(BankScraperService);

    // 테스트 파일 존재 여부 확인 및 로깅
    console.log('테스트 HTML 파일 존재:', fs.existsSync(TEST_HTML_PATH));
    console.log('테스트 URL:', TEST_URL);
  });

  afterAll(async () => {
    await browserFactory.close();
  });

  describe('은행 스크래핑 전체 흐름 테스트', () => {
    it('로그인부터 로그아웃까지 전체 프로세스가 정상적으로 동작해야 함', async () => {
      try {
        // Given: 거래내역 조회를 위한 날짜 범위 설정
        const startDate = new Date('2020-03-15');
        const endDate = new Date();

        // When: 로그인 수행
        console.log('1. 로그인 시도 중...');
        page = await service.login(TEST_URL, TEST_CREDENTIALS);

        // Then: 로그인이 성공적으로 수행됨
        console.log('2. 로그인 성공');
        expect(page).toBeDefined();

        // When: 잔액 조회 수행
        console.log('3. 잔액 조회 시도 중...');
        const balance = await service.getBalance(page);

        // Then: 잔액이 성공적으로 조회됨
        console.log('4. 잔액 조회 성공:', balance);
        expect(typeof balance).toBe('number');
        expect(balance).not.toBeNaN();

        // When: 거래내역 조회 수행
        console.log('5. 거래내역 조회 시도 중...');
        const transactions = await service.getTransactionHistory(
          page,
          startDate,
          endDate,
        );

        // Then: 거래내역이 성공적으로 조회됨
        console.log('6. 거래내역 조회 성공:', transactions.length);
        expect(transactions).toBeDefined();
        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBeGreaterThan(0);

        // When: 로그아웃 수행
        console.log('7. 로그아웃 시도 중...');
        await service.logout(page);

        // Then: 로그아웃이 성공적으로 수행됨
        console.log('8. 로그아웃 성공');
      } catch (err) {
        // 테스트 실패 시 스크린샷 저장
        console.error('테스트 실패:', err.message);
        if (page) {
          const screenshotPath = path.resolve('login-error.png');
          await page.screenshot({ path: screenshotPath });
          console.error('실패 시점 스크린샷 저장됨:', screenshotPath);
        }
        throw err;
      }
    }, 30000);
  });
});
