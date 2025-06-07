import { BankStrategy } from '../bank-strategy.interface';
import { Page } from 'puppeteer';
import { LoginInfo } from '../bank-scraper.service';

export class WooriBankStrategy implements BankStrategy {
  async login(page: Page, credentials: LoginInfo): Promise<void> {
    await page.type('#woori-user', credentials.username);
    await page.type('#woori-pass', credentials.password);
    await page.click('#woori-login-btn');
    await page.waitForSelector('#woori-main', { visible: true, timeout: 5000 });
  }

  async getBalance(page: Page): Promise<number> {
    const balanceText = await page.$eval(
      '#woori-balance',
      (el) => el.textContent || '0',
    );
    return parseFloat(balanceText.replace(/[^0-9.-]+/g, ''));
  }

  async getTransactionHistory(
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    await page.click('#woori-history');
    await page.waitForSelector('#woori-date', { timeout: 5000 });
    await page.type('#woori-from', startDate.toISOString().split('T')[0]);
    await page.type('#woori-to', endDate.toISOString().split('T')[0]);
    await page.click('#woori-search');
    await page.waitForSelector('.woori-item', { timeout: 5000 });
    return await page.$$eval('.woori-item', (items) =>
      items.map((item) => ({
        date: item.querySelector('.woori-date')?.textContent,
        description: item.querySelector('.woori-desc')?.textContent,
        amount: item.querySelector('.woori-amt')?.textContent,
        balance: item.querySelector('.woori-bal')?.textContent,
      })),
    );
  }
}
