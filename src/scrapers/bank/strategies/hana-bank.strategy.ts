import { BankStrategy } from '../bank-strategy.interface';
import { Page } from 'puppeteer';
import { LoginInfo } from '../bank-scraper.service';

export class HanaBankStrategy implements BankStrategy {
  async login(page: Page, credentials: LoginInfo): Promise<void> {
    await page.type('#hana-user', credentials.username);
    await page.type('#hana-pass', credentials.password);
    await page.click('#hana-login-btn');
    await page.waitForSelector('#hana-main', { visible: true, timeout: 5000 });
  }

  async getBalance(page: Page): Promise<number> {
    const balanceText = await page.$eval(
      '#hana-balance',
      (el) => el.textContent || '0',
    );
    return parseFloat(balanceText.replace(/[^0-9.-]+/g, ''));
  }

  async getTransactionHistory(
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    await page.click('#hana-history');
    await page.waitForSelector('#hana-date', { timeout: 5000 });
    await page.type('#hana-from', startDate.toISOString().split('T')[0]);
    await page.type('#hana-to', endDate.toISOString().split('T')[0]);
    await page.click('#hana-search');
    await page.waitForSelector('.hana-item', { timeout: 5000 });
    return await page.$$eval('.hana-item', (items) =>
      items.map((item) => ({
        date: item.querySelector('.hana-date')?.textContent,
        description: item.querySelector('.hana-desc')?.textContent,
        amount: item.querySelector('.hana-amt')?.textContent,
        balance: item.querySelector('.hana-bal')?.textContent,
      })),
    );
  }
}
