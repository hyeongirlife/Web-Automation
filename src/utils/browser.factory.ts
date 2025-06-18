import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';

@Injectable()
export class BrowserFactory implements OnModuleInit, OnModuleDestroy {
  private browser: Browser | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.initBrowser();
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  private async initBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: this.configService.get<boolean>('HEADLESS_BROWSER', true),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
      this.logger.log('Browser initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to initialize browser', errorMessage);
      throw error;
    }
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      await this.initBrowser();
    }
    return this.browser as Browser;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Browser closed successfully');
    }
  }

  async newPage() {
    const browser = await this.getBrowser();
    return browser.newPage();
  }

  async createPage(): Promise<Page> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Set default timeout
      page.setDefaultTimeout(30000);

      // Enable request interception
      await page.setRequestInterception(true);

      // Handle requests
      page.on('request', (request) => {
        if (request.resourceType() === 'image') {
          request.abort();
        } else {
          request.continue();
        }
      });

      return page;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create page: ${errorMessage}`);
      throw new Error(`Failed to create browser page: ${errorMessage}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
