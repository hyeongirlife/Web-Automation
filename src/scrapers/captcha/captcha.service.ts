import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../utils/logger.service';
import { Page } from 'puppeteer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CaptchaService {
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async solveCaptcha(page: Page, captchaSelector: string): Promise<boolean> {
    try {
      this.logger.log('Attempting to solve CAPTCHA');

      // CAPTCHA 요소가 있는지 확인
      const hasCaptcha = (await page.$(captchaSelector)) !== null;

      if (!hasCaptcha) {
        this.logger.log('No CAPTCHA detected');
        return true;
      }

      // CAPTCHA 이미지 스크린샷 캡처
      const captchaElement = await page.$(captchaSelector);
      if (!captchaElement) {
        throw new Error('CAPTCHA element not found');
      }

      const captchaImage = await captchaElement.screenshot({
        encoding: 'base64',
      });

      // CAPTCHA 솔루션 서비스 사용 (예: 2Captcha, Anti-Captcha 등)
      const captchaSolution = await this.sendCaptchaToSolver(captchaImage);

      // 솔루션 입력
      await page.type('#captcha-input', captchaSolution);
      await page.click('#submit-captcha');

      // 성공 여부 확인
      const success = await page
        .waitForFunction(() => !document.querySelector('#captcha-error'), {
          timeout: 5000,
        })
        .then(() => true)
        .catch(() => false);

      if (success) {
        this.logger.log('CAPTCHA solved successfully');
      } else {
        this.logger.warn('Failed to solve CAPTCHA');
      }

      return success;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CAPTCHA solving error: ${errorMessage}`, errorStack);
      return false;
    }
  }

  private async sendCaptchaToSolver(captchaImage: string): Promise<string> {
    // 실제 구현에서는 CAPTCHA 솔루션 API를 호출
    // 예시 코드이므로 실제 API 호출은 구현하지 않음

    const apiKey = this.configService.get<string>('CAPTCHA_API_KEY');

    if (!apiKey) {
      this.logger.warn('No CAPTCHA API key configured, using mock solution');
      return 'MOCK_SOLUTION';
    }

    // 여기서 실제 CAPTCHA 솔루션 API 호출
    // const response = await fetch('https://api.captcha-solver.com/solve', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ apiKey, image: captchaImage }),
    // });
    // const data = await response.json();
    // return data.solution;

    // 개발 환경에서는 모의 솔루션 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('MOCK_SOLUTION');
      }, 1000);
    });
  }

  async bypassRecaptcha(page: Page): Promise<boolean> {
    try {
      this.logger.log('Attempting to bypass reCAPTCHA');

      // reCAPTCHA 프레임 찾기
      const recaptchaFrame = page
        .frames()
        .find((frame) => frame.url().includes('recaptcha'));

      if (!recaptchaFrame) {
        this.logger.log('No reCAPTCHA frame found');
        return true;
      }

      // reCAPTCHA 체크박스 클릭
      await recaptchaFrame.click('.recaptcha-checkbox-border');

      // 이미지 챌린지가 나타나는지 확인
      const hasChallenge = await page
        .waitForFunction(
          () => {
            const frames = Array.from(document.querySelectorAll('iframe'));
            return frames.some((frame) =>
              frame.src.includes('recaptcha/api2/bframe'),
            );
          },
          { timeout: 5000 },
        )
        .then(() => true)
        .catch(() => false);

      if (!hasChallenge) {
        this.logger.log('reCAPTCHA passed without challenge');
        return true;
      }

      // 실제 구현에서는 외부 서비스를 사용하여 reCAPTCHA 해결
      this.logger.warn(
        'reCAPTCHA challenge detected, using external service would be required',
      );

      // 개발 환경에서는 실패로 처리
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`reCAPTCHA bypass error: ${errorMessage}`, errorStack);
      return false;
    }
  }
}
