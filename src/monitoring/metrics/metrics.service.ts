import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../utils/logger.service';

@Injectable()
export class MetricsService {
  private metrics = {
    scraping: {
      success: new Map<string, number>(),
      failure: new Map<string, number>(),
      duration: new Map<string, number[]>(),
    },
    proxy: {
      usage: new Map<string, number>(),
      failures: new Map<string, number>(),
    },
    rateLimit: {
      hits: new Map<string, number>(),
    },
  };

  constructor(private readonly logger: LoggerService) {}

  // 스크래핑 성공 횟수 증가
  incrementSuccessfulScraping(bankCode: string): void {
    const current = this.metrics.scraping.success.get(bankCode) || 0;
    this.metrics.scraping.success.set(bankCode, current + 1);
  }

  // 스크래핑 실패 횟수 증가
  incrementFailedScraping(bankCode: string): void {
    const current = this.metrics.scraping.failure.get(bankCode) || 0;
    this.metrics.scraping.failure.set(bankCode, current + 1);
  }

  // 스크래핑 소요 시간 기록
  recordScrapingDuration(bankCode: string, durationMs: number): void {
    const durations = this.metrics.scraping.duration.get(bankCode) || [];
    durations.push(durationMs);
    this.metrics.scraping.duration.set(bankCode, durations);
  }

  // 프록시 사용 횟수 증가
  incrementProxyUsage(proxyId: string): void {
    const current = this.metrics.proxy.usage.get(proxyId) || 0;
    this.metrics.proxy.usage.set(proxyId, current + 1);
  }

  // 프록시 실패 횟수 증가
  incrementProxyFailure(proxyId: string): void {
    const current = this.metrics.proxy.failures.get(proxyId) || 0;
    this.metrics.proxy.failures.set(proxyId, current + 1);
  }

  // 속도 제한 히트 횟수 증가
  incrementRateLimitHit(bankCode: string): void {
    const current = this.metrics.rateLimit.hits.get(bankCode) || 0;
    this.metrics.rateLimit.hits.set(bankCode, current + 1);
  }

  // 은행별 성공률 계산
  getSuccessRate(bankCode: string): number {
    const success = this.metrics.scraping.success.get(bankCode) || 0;
    const failure = this.metrics.scraping.failure.get(bankCode) || 0;
    const total = success + failure;
    
    if (total === 0) return 0;
    return (success / total) * 100;
  }

  // 은행별 평균 스크래핑 시간 계산
  getAverageScrapingDuration(bankCode: string): number {
    const durations = this.metrics.scraping.duration.get(bankCode) || [];
    
    if (durations.length === 0) return 0;
    
    const sum = durations.reduce((acc, duration) => acc + duration, 0);
    return sum / durations.length;
  }

  // 모든 메트릭 가져오기
  getAllMetrics(): any {
    const result = {
      scraping: {
        successRates: {},
        averageDurations: {},
        totalSuccess: 0,
        totalFailure: 0,
      },
      proxy: {
        usage: {},
        failures: {},
      },
      rateLimit: {
        hits: {},
      },
    };

    // 스크래핑 성공률 및 평균 시간 계산
    for (const bankCode of this.metrics.scraping.success.keys()) {
      result.scraping.successRates[bankCode] = this.getSuccessRate(bankCode);
      result.scraping.averageDurations[bankCode] = this.getAverageScrapingDuration(bankCode);
      result.scraping.totalSuccess += this.metrics.scraping.success.get(bankCode) || 0;
    }

    // 스크래핑 실패 총합 계산
    for (const bankCode of this.metrics.scraping.failure.keys()) {
      result.scraping.totalFailure += this.metrics.scraping.failure.get(bankCode) || 0;
    }

    // 프록시 사용 및 실패 데이터
    for (const [proxyId, usage] of this.metrics.proxy.usage.entries()) {
      result.proxy.usage[proxyId] = usage;
    }

    for (const [proxyId, failures] of this.metrics.proxy.failures.entries()) {
      result.proxy.failures[proxyId] = failures;
    }

    // 속도 제한 히트 데이터
    for (const [bankCode, hits] of this.metrics.rateLimit.hits.entries()) {
      result.rateLimit.hits[bankCode] = hits;
    }

    return result;
  }

  // 메트릭 리셋
  resetMetrics(): void {
    this.metrics = {
      scraping: {
        success: new Map<string, number>(),
        failure: new Map<string, number>(),
        duration: new Map<string, number[]>(),
      },
      proxy: {
        usage: new Map<string, number>(),
        failures: new Map<string, number>(),
      },
      rateLimit: {
        hits: new Map<string, number>(),
      },
    };
    
    this.logger.log('All metrics have been reset');
  }
}
