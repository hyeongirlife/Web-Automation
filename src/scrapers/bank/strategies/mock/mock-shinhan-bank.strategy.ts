import { BankStrategy } from '../../bank-strategy.interface';
import { Page } from 'puppeteer';
import { LoginInfo } from '../../bank-scraper.service';

export class MockShinhanBankStrategy implements BankStrategy {
  async login(page: Page, credentials: LoginInfo): Promise<void> {
    await page.type('#shinhan-id', credentials.username);
    await page.type('#shinhan-pw', credentials.password);
    await page.click('#shinhan-login-btn');
    await page.waitForSelector('#shinhan-account', {
      visible: true,
      timeout: 2000,
    });
  }
  async getBalance(page: Page): Promise<number> {
    const balanceText = await page.$eval(
      '.shinhan-balance',
      (el) => el.textContent || '0',
    );
    return parseFloat(balanceText.replace(/[^0-9.-]+/g, ''));
  }
  async getTransactionHistory(
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    await page.click('#shinhan-history-btn');
    await page.waitForSelector('#shinhan-date-form', { timeout: 2000 });
    await page.type(
      '#shinhan-date-start',
      startDate.toISOString().split('T')[0],
    );
    await page.type('#shinhan-date-end', endDate.toISOString().split('T')[0]);
    await page.click('#shinhan-search-btn');
    await page.waitForSelector('.shinhan-transaction', { timeout: 2000 });
    return await page.$$eval('.shinhan-transaction', (items) =>
      items.map((item) => ({
        date: item.querySelector('.shinhan-date')?.textContent,
        description: item.querySelector('.shinhan-desc')?.textContent,
        amount: item.querySelector('.shinhan-amount')?.textContent,
        balance: item.querySelector('.shinhan-balance')?.textContent,
      })),
    );
  }
}
