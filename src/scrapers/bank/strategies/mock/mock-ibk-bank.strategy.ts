import { BankStrategy } from '../../bank-strategy.interface';
import { Page } from 'puppeteer';
import { LoginInfo } from '../../bank-scraper.service';

export class MockIbkBankStrategy implements BankStrategy {
  async login(page: Page, credentials: LoginInfo): Promise<void> {
    await page.type('#ibk-id', credentials.username);
    await page.type('#ibk-pw', credentials.password);
    await page.click('#ibk-login-btn');
    await page.waitForSelector('#ibk-account', {
      visible: true,
      timeout: 2000,
    });
  }
  async getBalance(page: Page): Promise<number> {
    const balanceText = await page.$eval(
      '.ibk-balance',
      (el) => el.textContent || '0',
    );
    return parseFloat(balanceText.replace(/[^0-9.-]+/g, ''));
  }
  async getTransactionHistory(
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    await page.click('#ibk-history-btn');
    await page.waitForSelector('#ibk-date-form', { timeout: 2000 });
    await page.type('#ibk-date-start', startDate.toISOString().split('T')[0]);
    await page.type('#ibk-date-end', endDate.toISOString().split('T')[0]);
    await page.click('#ibk-search-btn');
    await page.waitForSelector('.ibk-transaction', { timeout: 2000 });
    return await page.$$eval('.ibk-transaction', (items) =>
      items.map((item) => ({
        date: item.querySelector('.ibk-date')?.textContent,
        description: item.querySelector('.ibk-desc')?.textContent,
        amount: item.querySelector('.ibk-amount')?.textContent,
        balance: item.querySelector('.ibk-balance')?.textContent,
      })),
    );
  }
}
