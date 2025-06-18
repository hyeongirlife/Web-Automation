import { Test, TestingModule } from '@nestjs/testing';
import { CaptchaService } from '../../src/scrapers/captcha/captcha.service';
import { LoggerService } from '../../src/utils/logger.service';
import { ConfigService } from '@nestjs/config';
import { Browser, Page } from 'puppeteer';
import * as puppeteer from 'puppeteer';

describe('CaptchaService 통합 테스트', () => {
  let module: TestingModule;
  let captchaService: CaptchaService;
  let browser: Browser;
  let page: Page;
  let logger: jest.Mocked<LoggerService>;

  // 실제 base64 이미지 데이터 (1x1 투명 픽셀)
  const base64Image =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  // 테스트용 HTML 컨텐츠
  const mockHtmlWithCaptcha = `
    <html>
      <body>
        <img id="captcha-image" src="${base64Image}" alt="captcha" />
        <input id="captcha-input" type="text" />
        <button id="submit-captcha">Submit</button>
        <div id="captcha-error">Error</div>
      </body>
    </html>
  `;

  const mockHtmlWithRecaptcha = `
    <html>
      <body>
        <iframe src="https://www.google.com/recaptcha/api2/anchor"></iframe>
      </body>
    </html>
  `;

  // 페이지 모킹 헬퍼 함수
  const setupPageMocking = async (page: Page) => {
    // waitForFunction 모킹
    const originalWaitForFunction = page.waitForFunction.bind(page);
    jest.spyOn(page, 'waitForFunction').mockImplementation((pageFunction) => {
      if (typeof pageFunction === 'string') {
        return originalWaitForFunction(pageFunction);
      }
      // CAPTCHA 에러 요소 체크를 위한 waitForFunction 모킹
      if (pageFunction.toString().includes('document.querySelector')) {
        return Promise.resolve(true);
      }
      // reCAPTCHA 챌린지 체크를 위한 waitForFunction 모킹
      if (pageFunction.toString().includes('recaptcha/api2/bframe')) {
        return Promise.resolve(true);
      }
      return originalWaitForFunction(pageFunction);
    });

    // type 메서드 모킹
    const originalType = page.type.bind(page);
    jest.spyOn(page, 'type').mockImplementation(async (selector, text) => {
      if (selector === '#captcha-input') {
        // CAPTCHA 입력 필드에 대한 타이핑 시뮬레이션
        await page.evaluate((text) => {
          const input = document.querySelector(
            '#captcha-input',
          ) as HTMLInputElement;
          if (input) {
            input.value = text;
          }
        }, text);
        return Promise.resolve();
      }
      return originalType(selector, text);
    });

    // click 메서드 모킹
    const originalClick = page.click.bind(page);
    jest.spyOn(page, 'click').mockImplementation(async (selector) => {
      if (selector === '#submit-captcha') {
        // Submit 버튼 클릭 시 CAPTCHA 검증 로직 시뮬레이션
        await page.evaluate(() => {
          const error = document.querySelector('#captcha-error');
          const input = document.querySelector(
            '#captcha-input',
          ) as HTMLInputElement;
          if (error && input) {
            error.textContent =
              input.value === 'MOCK_SOLUTION' ? '' : 'Invalid CAPTCHA';
          }
        });
        return Promise.resolve();
      }
      return originalClick(selector);
    });

    // screenshot 메서드 모킹
    jest.spyOn(page, '$').mockImplementation(async (selector) => {
      if (selector === '#captcha-image') {
        return {
          screenshot: async () => base64Image.split(',')[1],
        } as any;
      }
      const element = await page.$(selector);
      return element;
    });
  };

  // reCAPTCHA 테스트를 위한 모킹 헬퍼 함수
  const setupRecaptchaMocking = async (page: Page) => {
    // frames 메서드 모킹
    jest.spyOn(page, 'frames').mockImplementation(() => {
      return [
        {
          url: () => 'https://www.google.com/recaptcha/api2/anchor',
          click: async () => Promise.resolve(),
        },
      ] as any;
    });

    // waitForFunction 모킹 (챌린지 감지용)
    jest.spyOn(page, 'waitForFunction').mockImplementation(() => {
      return Promise.resolve({
        asElement: () => null,
      } as unknown as puppeteer.JSHandle<unknown>);
    });
  };

  beforeAll(async () => {
    // 테스트 모듈 설정
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    module = await Test.createTestingModule({
      providers: [
        CaptchaService,
        {
          provide: LoggerService,
          useValue: logger,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'CAPTCHA_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    captchaService = module.get<CaptchaService>(CaptchaService);

    // Puppeteer 브라우저 설정
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  beforeEach(async () => {
    // 각 테스트 전에 새로운 페이지 생성
    page = await browser.newPage();

    // 페이지 에러와 콘솔 로그를 캡처
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  });

  afterEach(async () => {
    if (page && !page.isClosed()) {
      await page.close();
    }
  });

  afterAll(async () => {
    await browser.close();
    await module.close();
  });

  describe('일반 CAPTCHA 처리', () => {
    const tests = [
      {
        name: '주어진 페이지에 CAPTCHA가 없을 때 성공을 반환해야 함',
        fn: async () => {
          // Given
          await page.setContent('<html><body></body></html>');

          // When
          const result = await captchaService.solveCaptcha(
            page,
            '#captcha-image',
          );

          // Then
          expect(result).toBe(true);
          expect(logger.log).toHaveBeenCalledWith('No CAPTCHA detected');
        },
      },
      {
        name: '주어진 페이지에 CAPTCHA가 있을 때 해결을 시도해야 함',
        fn: async () => {
          // Given
          await page.setContent(mockHtmlWithCaptcha);
          await setupPageMocking(page);
          await page.waitForSelector('#captcha-image');

          // When
          const result = await captchaService.solveCaptcha(
            page,
            '#captcha-image',
          );

          // Then
          expect(result).toBe(true);
          expect(logger.log).toHaveBeenCalledWith('CAPTCHA를 시도합니다.');
        },
      },
      {
        name: 'CAPTCHA 해결 중 오류 발생 시 실패를 반환해야 함',
        fn: async () => {
          // Given
          await page.setContent(mockHtmlWithCaptcha);
          await setupPageMocking(page);
          jest.spyOn(page, '$').mockImplementation(() => {
            throw new Error('Selector error');
          });

          // When
          const result = await captchaService.solveCaptcha(
            page,
            '#non-existent-captcha',
          );

          // Then
          expect(result).toBe(false);
          expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('CAPTCHA solving error'),
            expect.any(String),
          );
        },
      },
    ];

    tests.forEach(({ name, fn }) => {
      it(name, fn);
    });
  });

  describe('reCAPTCHA 처리', () => {
    const tests = [
      {
        name: '주어진 페이지에 reCAPTCHA가 없을 때 성공을 반환해야 함',
        fn: async () => {
          // Given
          await page.setContent('<html><body></body></html>');

          // When
          const result = await captchaService.bypassRecaptcha(page);

          // Then
          expect(result).toBe(true);
          expect(logger.log).toHaveBeenCalledWith('No reCAPTCHA frame found');
        },
      },
      {
        name: '주어진 페이지에 reCAPTCHA가 있을 때 우회를 시도해야 함',
        fn: async () => {
          // Given
          await page.setContent(mockHtmlWithRecaptcha);
          await setupRecaptchaMocking(page);

          // When
          const result = await captchaService.bypassRecaptcha(page);

          // Then
          expect(result).toBe(false);
          expect(logger.warn).toHaveBeenCalledWith(
            'reCAPTCHA challenge detected, using external service would be required',
          );
        },
      },
      {
        name: 'reCAPTCHA 우회 중 오류 발생 시 실패를 반환해야 함',
        fn: async () => {
          // Given
          await page.setContent(mockHtmlWithRecaptcha);
          jest.spyOn(page, 'frames').mockImplementation(() => {
            throw new Error('Frame error');
          });

          // When
          const result = await captchaService.bypassRecaptcha(page);

          // Then
          expect(result).toBe(false);
          expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('reCAPTCHA bypass error'),
            expect.any(String),
          );
        },
      },
    ];

    tests.forEach(({ name, fn }) => {
      it(name, fn);
    });
  });

  describe('오류 처리', () => {
    const tests = [
      {
        name: '페이지 평가 중 오류 발생 시 실패를 반환해야 함',
        fn: async () => {
          // Given
          await page.setContent(mockHtmlWithCaptcha);
          await setupPageMocking(page);
          const closedPage = page;
          await page.close();

          // When
          const result = await captchaService.solveCaptcha(
            closedPage,
            '#captcha-image',
          );

          // Then
          expect(result).toBe(false);
          expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('CAPTCHA solving error'),
            expect.any(String),
          );
        },
      },
    ];

    tests.forEach(({ name, fn }) => {
      it(name, fn);
    });
  });
});
