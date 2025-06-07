import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerService } from '../../utils/logger.service';
import { ScrapingStrategyFactory } from '../../scrapers/strategies/scraping-strategy.factory';
import { MetricsService } from '../../monitoring/metrics/metrics.service';
import { AccountData } from '../../scrapers/strategies/scraping-strategy.interface';

interface ScrapingJobData {
  userId: string;
  bankCode: string;
  credentials: Record<string, unknown>;
}

@Processor('scraping')
export class ScrapingProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly scrapingStrategyFactory: ScrapingStrategyFactory,
    private readonly metricsService: MetricsService,
  ) {}

  @Process('updateAccount')
  async handleAccountUpdate(job: Job<ScrapingJobData>): Promise<AccountData> {
    const { userId, bankCode, credentials } = job.data;
    const startTime = Date.now();

    try {
      this.logger.log(
        `Processing account update for user ${userId} and bank ${bankCode}`,
        'ScrapingProcessor',
      );

      // 적절한 스크래핑 전략 가져오기
      const strategy = this.scrapingStrategyFactory.getStrategy(bankCode);

      // 스크래핑 실행
      const result = (await strategy.execute(credentials)) as AccountData;

      // 작업 완료 시간 측정 및 메트릭 기록
      const duration = Date.now() - startTime;
      this.metricsService.recordScrapingDuration(bankCode, duration);
      this.metricsService.incrementSuccessfulScraping(bankCode);

      this.logger.log(
        `Account update completed for user ${userId} in ${duration}ms`,
        'ScrapingProcessor',
      );

      return result;
    } catch (error) {
      // 실패 메트릭 기록
      this.metricsService.incrementFailedScraping(bankCode);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update account for user ${userId} and bank ${bankCode}: ${errorMessage}`,
        errorStack,
        'ScrapingProcessor',
      );

      // 작업 재시도 여부 결정
      const attempts = job.attemptsMade;
      const maxAttempts = job.opts.attempts ?? 3;
      if (attempts < maxAttempts - 1) {
        this.logger.warn(
          `Retrying job for user ${userId} (attempt ${attempts + 1}/${maxAttempts})`,
          'ScrapingProcessor',
        );
      }

      throw error;
    }
  }
}
