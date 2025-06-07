import { Page } from 'puppeteer';
import { LoginInfo } from './bank-scraper.service';

export interface BankStrategy {
  login(page: Page, credentials: LoginInfo): Promise<void>;
  getBalance(page: Page): Promise<number>;
  getTransactionHistory(
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]>;
}
