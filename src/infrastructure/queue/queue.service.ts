import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LoggerService } from '../../utils/logger.service';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('scraping') private readonly scrapingQueue: Queue,
    private readonly logger: LoggerService,
  ) {}

  async addScrapingJob(
    userId: string,
    bankCode: string,
    credentials: Record<string, unknown>,
    options: {
      priority?: 'high' | 'medium' | 'low';
      attempts?: number;
      backoff?: number | { type: string; delay: number };
      delay?: number;
    } = {},
  ): Promise<string> {
    const jobOptions = {
      priority: options.priority === 'high' ? 1 : options.priority === 'low' ? 3 : 2,
      attempts: options.attempts || 3,
      backoff: options.backoff || { type: 'exponential', delay: 1000 },
      delay: options.delay || 0,
      removeOnComplete: true,
      removeOnFail: false,
    };

    try {
      const job = await this.scrapingQueue.add(
        'updateAccount',
        { userId, bankCode, credentials },
        jobOptions,
      );

      this.logger.log(
        `Added scraping job for user ${userId} and bank ${bankCode} with ID ${job.id}`,
        'QueueService',
      );

      return job.id as string;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to add scraping job for user ${userId} and bank ${bankCode}: ${errorMessage}`,
        errorStack,
        'QueueService',
      );
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
    progress: number;
    result?: unknown;
    failReason?: string;
  }> {
    try {
      const job = await this.scrapingQueue.getJob(jobId);

      if (!job) {
        return { status: 'unknown', progress: 0 };
      }

      const state = await job.getState();
      const progress = job.progress();
      const result = job.returnvalue;
      const failReason = job.failedReason;

      return {
        status: state as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown',
        progress: typeof progress === 'number' ? progress : 0,
        result,
        failReason,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get job status for job ${jobId}: ${errorMessage}`, errorStack, 'QueueService');
      return { status: 'unknown', progress: 0 };
    }
  }

  async removeJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.scrapingQueue.getJob(jobId);

      if (!job) {
        return false;
      }

      await job.remove();
      this.logger.log(`Removed job ${jobId}`, 'QueueService');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to remove job ${jobId}: ${errorMessage}`, errorStack, 'QueueService');
      return false;
    }
  }

  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.scrapingQueue.getWaitingCount(),
        this.scrapingQueue.getActiveCount(),
        this.scrapingQueue.getCompletedCount(),
        this.scrapingQueue.getFailedCount(),
        this.scrapingQueue.getDelayedCount(),
      ]);

      return { waiting, active, completed, failed, delayed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get queue metrics: ${errorMessage}`, errorStack, 'QueueService');
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }
}
