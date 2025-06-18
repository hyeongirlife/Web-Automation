import { Test, TestingModule } from '@nestjs/testing';
import { BankScraperService, LoginInfo } from './bank-scraper.service';
import { MockKbBankStrategy } from './strategies/mock/mock-kb-bank.strategy';
import { MockHanaBankStrategy } from './strategies/mock/mock-hana-bank.strategy';
import { MockIbkBankStrategy } from './strategies/mock/mock-ibk-bank.strategy';
import { MockWooriBankStrategy } from './strategies/mock/mock-woori-bank.strategy';
import { MockShinhanBankStrategy } from './strategies/mock/mock-shinhan-bank.strategy';
import { BrowserFactory } from '../../utils/browser.factory';
import { LoggerService } from '../../utils/logger.service';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

describe('BankScraperService 통합 테스트', () => {
  let service: BankScraperService;
  let browserFactory: BrowserFactory;
  let configService: ConfigService;
  let logger: LoggerService;

  const BANK_HTML = {
    kb: path.resolve('public/bank-kb.html'),
    hana: path.resolve('public/bank-hana.html'),
    ibk: path.resolve('public/bank-ibk.html'),
    woori: path.resolve('public/bank-woori.html'),
    shinhan: path.resolve('public/bank-shinhan.html'),
  };

  const TEST_CREDENTIALS: LoginInfo = {
    username: 'testuser',
    password: 'testpass',
  };

  beforeAll(async () => {
    // Given: 필요한 서비스와 모의 전략들을 설정
    configService = new ConfigService();
    logger = new LoggerService(configService);

    const mockStrategies = {
      kb: new MockKbBankStrategy(),
      hana: new MockHanaBankStrategy(),
      ibk: new MockIbkBankStrategy(),
      woori: new MockWooriBankStrategy(),
      shinhan: new MockShinhanBankStrategy(),
    };

    browserFactory = new BrowserFactory(configService, logger);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankScraperService,
        ConfigService,
        { provide: 'BANK_STRATEGY_MAP', useValue: mockStrategies },
        { provide: BrowserFactory, useValue: browserFactory },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<BankScraperService>(BankScraperService);
  });

  afterAll(async () => {
    await browserFactory.closeBrowser();
  });

  const runBankTest = (bankCode: keyof typeof BANK_HTML) => {
    describe(`${bankCode.toUpperCase()} 은행 스크래핑 테스트`, () => {
      let browser: puppeteer.Browser;
      let page: puppeteer.Page;

      beforeEach(async () => {
        // Given: 브라우저와 페이지를 설정
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--allow-file-access-from-files',
          ],
        });
        page = await browser.newPage();
        await page.goto('file://' + BANK_HTML[bankCode]);
      });

      afterEach(async () => {
        await browser.close();
      });

      it('로그인, 잔액조회, 거래내역 조회가 성공적으로 수행되어야 함', async () => {
        // Given: 테스트 날짜 범위 설정
        const startDate = new Date('2020-01-01');
        const endDate = new Date();

        // When: 로그인 수행
        await service['strategies'][bankCode].login(page, TEST_CREDENTIALS);

        // Then: 잔액 조회가 성공적으로 수행됨
        const balance = await service['strategies'][bankCode].getBalance(page);
        expect(typeof balance).toBe('number');
        expect(balance).not.toBeNaN();

        // When: 거래내역 조회 수행
        const transactions = await service['strategies'][
          bankCode
        ].getTransactionHistory(page, startDate, endDate);

        // Then: 거래내역이 성공적으로 조회됨
        expect(transactions).toBeDefined();
        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBeGreaterThan(0);
      }, 20000);
    });
  };

  // 각 은행별 테스트 실행
  runBankTest('kb');
  runBankTest('hana');
  runBankTest('ibk');
  runBankTest('woori');
  runBankTest('shinhan');
});
