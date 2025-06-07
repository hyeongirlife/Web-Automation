import { BankStrategy } from '../../bank-strategy.interface';
import { Page } from 'puppeteer';
import { LoginInfo } from '../../bank-scraper.service';

export class MockKbBankStrategy implements BankStrategy {
  async login(page: Page, credentials: LoginInfo): Promise<void> {
    await page.type('#kb-username', credentials.username);
    await page.type('#kb-password', credentials.password);
    await page.click('#kb-login-btn');
    await page.waitForSelector('#kb-account-section', {
      visible: true,
      timeout: 2000,
    });
  }
  async getBalance(page: Page): Promise<number> {
    const balanceText = await page.$eval(
      '.kb-balance',
      (el) => el.textContent || '0',
    );
    return parseFloat(balanceText.replace(/[^0-9.-]+/g, ''));
  }
  async getTransactionHistory(
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    await page.click('#kb-history-tab');
    await page.waitForSelector('#kb-date-form', { timeout: 2000 });
    await page.type('#kb-start-date', startDate.toISOString().split('T')[0]);
    await page.type('#kb-end-date', endDate.toISOString().split('T')[0]);
    await page.click('#kb-search-btn');
    await page.waitForSelector('.kb-transaction', { timeout: 2000 });
    return await page.$$eval('.kb-transaction', (items) =>
      items.map((item) => ({
        date: item.querySelector('.kb-date')?.textContent,
        description: item.querySelector('.kb-desc')?.textContent,
        amount: item.querySelector('.kb-amount')?.textContent,
        balance: item.querySelector('.kb-balance')?.textContent,
      })),
    );
  }
}
