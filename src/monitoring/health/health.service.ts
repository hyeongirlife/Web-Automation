import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '../../utils/logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { AlertsService } from '../alerts/alerts.service';

export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  errorRate: number;
  averageResponseTime: number;
  activeConnections: number;
  lastChecked: Date;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime: number;
      lastChecked: Date;
    };
  };
}

@Injectable()
export class HealthService {
  private healthData: HealthData = {
    status: 'healthy',
    errorRate: 0,
    averageResponseTime: 0,
    activeConnections: 0,
    lastChecked: new Date(),
    services: {},
  };

  constructor(
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService,
    private readonly alertsService: AlertsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSystemHealth(): Promise<void> {
    this.logger.log('Running system health check');
    
    try {
      // 메트릭 데이터 가져오기
      const metrics = this.metricsService.getAllMetrics();
      
      // 총 요청 수 계산
      const totalRequests = metrics.scraping.totalSuccess + metrics.scraping.totalFailure;
      
      // 에러율 계산
      const errorRate = totalRequests > 0 ? metrics.scraping.totalFailure / totalRequests : 0;
      
      // 평균 응답 시간 계산
      let totalDuration = 0;
      let durationCount = 0;
      
      Object.values(metrics.scraping.averageDurations).forEach((duration: number) => {
        if (duration > 0) {
          totalDuration += duration;
          durationCount++;
        }
      });
      
      const averageResponseTime = durationCount > 0 ? totalDuration / durationCount : 0;
      
      // 서비스 상태 업데이트
      const services = {};
      for (const bankCode of Object.keys(metrics.scraping.successRates)) {
        const successRate = metrics.scraping.successRates[bankCode];
        const responseTime = metrics.scraping.averageDurations[bankCode] || 0;
        
        let status: 'up' | 'down' | 'degraded' = 'up';
        if (successRate < 50) {
          status = 'down';
        } else if (successRate < 90) {
          status = 'degraded';
        }
        
        services[bankCode] = {
          status,
          responseTime,
          lastChecked: new Date(),
        };
      }
      
      // 전체 시스템 상태 결정
      let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (errorRate > 0.2) {
        systemStatus = 'unhealthy';
      } else if (errorRate > 0.05) {
        systemStatus = 'degraded';
      }
      
      // 헬스 데이터 업데이트
      this.healthData = {
        status: systemStatus,
        errorRate,
        averageResponseTime,
        activeConnections: Object.keys(services).length,
        lastChecked: new Date(),
        services,
      };
      
      // 알람 발생 여부 확인
      if (systemStatus === 'unhealthy') {
        await this.alertsService.sendAlert('System is unhealthy', {
          errorRate,
          averageResponseTime,
          details: 'High error rate detected in the system',
        });
      } else if (systemStatus === 'degraded') {
        await this.alertsService.sendAlert('System is degraded', {
          errorRate,
          averageResponseTime,
          details: 'System performance is degraded',
        });
      }
      
      this.logger.log(`Health check completed: System status is ${systemStatus}`);
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      
      // 에러 발생 시 시스템 상태를 unhealthy로 설정
      this.healthData.status = 'unhealthy';
      this.healthData.lastChecked = new Date();
      
      await this.alertsService.sendAlert('Health check failed', {
        error: error.message,
        details: 'Failed to complete system health check',
      });
    }
  }

  getSystemHealth(): HealthData {
    return this.healthData;
  }
}
