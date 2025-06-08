import puppeteer, { Browser, Page } from 'puppeteer';
import * as path from 'path';

describe('CaptchaService E2E', () => {
  let browser: Browser;
  let page: Page;
  const htmlPath = path.resolve('public/test-captcha-toss.html');
  const htmlUrl = 'file://' + htmlPath;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--allow-file-access-from-files',
      ],
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should pass CAPTCHA only with MOCK_SOLUTION', async () => {
    // Arrange
    await page.goto(htmlUrl);
    await page.waitForSelector('#captcha-input');

    // Act: 잘못된 값 입력
    await page.type('#captcha-input', 'WRONG_ANSWER');
    await page.click('#submit-captcha');
    await page.waitForSelector('#captcha-error', { visible: true });
    const errorVisible = await page.$eval(
      '#captcha-error',
      (el) => getComputedStyle(el).display !== 'none',
    );

    // Assert: 에러 메시지 노출
    expect(errorVisible).toBe(true);

    // Act: 올바른 값 입력
    await page.evaluate(() => {
      (document.getElementById('captcha-input') as HTMLInputElement).value = '';
    });
    await page.type('#captcha-input', 'MOCK_SOLUTION');
    const dialogPromise = new Promise<string>((resolve) => {
      page.once('dialog', (dialog) => {
        const message = dialog.message();
        dialog.dismiss();
        resolve(message);
      });
    });
    await page.click('#submit-captcha');
    const dialogMessage = await dialogPromise;

    // Assert: CAPTCHA solved 메시지
    expect(dialogMessage).toContain('CAPTCHA solved');
  });
});
