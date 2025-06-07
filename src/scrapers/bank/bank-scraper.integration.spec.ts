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

describe('BankScraperService (통합 Mock 전략)', () => {
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

  const credentials: LoginInfo = { username: 'testuser', password: 'testpass' };

  beforeAll(async () => {
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
    it(`${bankCode}은행 잔액/거래내역 통합 테스트`, async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--allow-file-access-from-files',
        ],
      });
      const page = await browser.newPage();
      await page.goto('file://' + BANK_HTML[bankCode]);
      await service['strategies'][bankCode].login(page, credentials);
      const balance = await service['strategies'][bankCode].getBalance(page);
      expect(typeof balance).toBe('number');
      const startDate = new Date('2020-01-01');
      const endDate = new Date();
      const transactions = await service['strategies'][
        bankCode
      ].getTransactionHistory(page, startDate, endDate);
      expect(transactions.length).toBeGreaterThan(0);
      await browser.close();
    }, 20000);
  };

  runBankTest('kb');
  runBankTest('hana');
  runBankTest('ibk');
  runBankTest('woori');
  runBankTest('shinhan');
});
