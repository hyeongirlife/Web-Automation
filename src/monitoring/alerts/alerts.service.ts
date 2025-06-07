import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../utils/logger.service';
import { ConfigService } from '@nestjs/config';

export interface AlertConfig {
  enabled: boolean;
  channels: {
    email: boolean;
    slack: boolean;
    sms: boolean;
  };
  thresholds: {
    errorRate: number;
    responseTime: number;
  };
}

interface AlertData {
  [key: string]: unknown;
}

@Injectable()
export class AlertsService {
  private alertConfig: AlertConfig;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    // 기본 알림 설정
    this.alertConfig = {
      enabled: this.configService.get<boolean>('ALERTS_ENABLED', true),
      channels: {
        email: this.configService.get<boolean>('ALERTS_EMAIL_ENABLED', true),
        slack: this.configService.get<boolean>('ALERTS_SLACK_ENABLED', false),
        sms: this.configService.get<boolean>('ALERTS_SMS_ENABLED', false),
      },
      thresholds: {
        errorRate: this.configService.get<number>(
          'ALERTS_ERROR_RATE_THRESHOLD',
          0.1,
        ),
        responseTime: this.configService.get<number>(
          'ALERTS_RESPONSE_TIME_THRESHOLD',
          5000,
        ),
      },
    };
  }

  async sendAlert(message: string, data: AlertData = {}): Promise<void> {
    if (!this.alertConfig.enabled) {
      this.logger.debug(`Alert suppressed (alerts disabled): ${message}`);
      return;
    }

    this.logger.warn(`ALERT: ${message}`);

    const promises: Promise<void>[] = [];

    // 이메일 알림
    if (this.alertConfig.channels.email) {
      promises.push(this.sendEmailAlert(message, data));
    }

    // Slack 알림
    if (this.alertConfig.channels.slack) {
      promises.push(this.sendSlackAlert(message, data));
    }

    // SMS 알림
    if (this.alertConfig.channels.sms) {
      promises.push(this.sendSmsAlert(message, data));
    }

    try {
      await Promise.all(promises);
      this.logger.log(`Alert sent successfully: ${message}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send alert: ${errorMessage}`, errorStack);
    }
  }

  private async sendEmailAlert(
    message: string,
    data: AlertData,
  ): Promise<void> {
    // 실제 구현에서는 이메일 서비스를 사용하여 알림을 보냄
    // 예: AWS SES, Nodemailer 등
    this.logger.log(`[EMAIL ALERT] ${message}`);

    // 개발 환경에서는 실제 이메일을 보내지 않고 로그만 남김
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      return;
    }

    // TODO: 실제 이메일 전송 로직 구현
    return Promise.resolve();
  }

  private async sendSlackAlert(
    message: string,
    data: AlertData,
  ): Promise<void> {
    // Slack Webhook을 사용하여 알림을 보냄
    this.logger.log(`[SLACK ALERT] ${message}`);

    // 개발 환경에서는 실제 Slack 메시지를 보내지 않고 로그만 남김
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      return;
    }

    // TODO: 실제 Slack 메시지 전송 로직 구현
    return Promise.resolve();
  }

  private async sendSmsAlert(message: string, data: AlertData): Promise<void> {
    // SMS 서비스를 사용하여 알림을 보냄
    // 예: AWS SNS, Twilio 등
    this.logger.log(`[SMS ALERT] ${message}`);

    // 개발 환경에서는 실제 SMS를 보내지 않고 로그만 남김
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      return;
    }

    // TODO: 실제 SMS 전송 로직 구현
    return Promise.resolve();
  }

  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = {
      ...this.alertConfig,
      ...config,
      channels: {
        ...this.alertConfig.channels,
        ...(config.channels || {}),
      },
      thresholds: {
        ...this.alertConfig.thresholds,
        ...(config.thresholds || {}),
      },
    };

    this.logger.log('Alert configuration updated');
  }

  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }
}
