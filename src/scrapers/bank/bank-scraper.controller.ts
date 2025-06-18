import {
  Controller,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  BankScraperService,
  TransactionHistoryResponse,
} from './bank-scraper.service';
import { LoginDto } from './dto/login.dto';
import { TransactionHistoryDto } from './dto/transaction-history.dto';
import { BrowserFactory } from '../../utils/browser.factory';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SessionGuard } from '../../guards/session.guard';
import { LoggerService } from '../../utils/logger.service';
import { Page } from 'puppeteer';

interface BankError extends Error {
  message: string;
  statusCode?: number;
}

@ApiTags('bank-scraper')
@Controller('bank-scraper')
@UseInterceptors(ClassSerializerInterceptor)
export class BankScraperController {
  constructor(
    private readonly bankScraperService: BankScraperService,
    private readonly browserFactory: BrowserFactory,
    private readonly logger: LoggerService,
  ) {}

  @Get('supported-banks')
  @ApiOperation({ summary: 'Get list of supported banks' })
  @ApiResponse({
    status: 200,
    description: 'List of supported banks',
  })
  getSupportedBanks() {
    try {
      // 지원하는 은행 목록 반환
      return {
        banks: [
          { code: 'kb', name: 'KB국민은행' },
          { code: 'shinhan', name: '신한은행' },
          { code: 'woori', name: '우리은행' },
          { code: 'hana', name: '하나은행' },
          { code: 'ibk', name: 'IBK기업은행' },
        ],
      };
    } catch (error) {
      this.handleError(error, 'Failed to get supported banks');
    }
  }

  @Post(':bankCode/login')
  @ApiOperation({ summary: 'Bank login' })
  @ApiParam({
    name: 'bankCode',
    description: 'Bank code (kb, shinhan, woori, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid credentials or bank code',
  })
  @ApiResponse({
    status: 500,
    description: 'Server error',
  })
  async login(
    @Param('bankCode') bankCode: string,
    @Body() loginDto: LoginDto,
  ): Promise<{ message: string; sessionId: string }> {
    let page: Page | null = null;

    try {
      this.logger.log(`Attempting login for bank: ${bankCode}`);

      // 브라우저 페이지 생성
      page = await this.browserFactory.createPage();

      // 은행 웹사이트 URL 설정
      const bankUrls = {
        kb: 'https://banking.kbstar.com',
        shinhan: 'https://bank.shinhan.com',
        woori: 'https://www.wooribank.com',
        hana: 'https://www.hanabank.com',
        ibk: 'https://www.ibk.co.kr',
      };

      // 은행 웹사이트로 이동
      await page.goto(bankUrls[bankCode] || `https://${bankCode}.com`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // 로그인 시도
      await this.bankScraperService.login(bankCode, page, loginDto);

      // 세션 ID 생성 (실제로는 세션 관리 서비스를 통해 관리해야 함)
      const sessionId = this.generateSessionId();

      // 세션 저장 (실제 구현에서는 Redis나 다른 세션 스토어에 저장)
      this.storeSession(sessionId, { bankCode, page });

      this.logger.log(`Login successful for bank: ${bankCode}`);
      return { message: 'Login successful', sessionId };
    } catch (error) {
      // 에러 발생 시 페이지 정리
      if (page) {
        await page.close().catch(() => {});
      }

      this.handleError(error, `Login failed for bank: ${bankCode}`);
    }
  }

  @Post(':bankCode/balance')
  @UseGuards(SessionGuard)
  @ApiBearerAuth('session-id')
  @ApiOperation({ summary: 'Get bank balance' })
  @ApiParam({
    name: 'bankCode',
    description: 'Bank code (kb, shinhan, woori, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved balance',
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to get balance',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired session',
  })
  async getBalance(
    @Param('bankCode') bankCode: string,
    @Query('sessionId') sessionId: string,
  ): Promise<{ balance: number; currency: string; lastUpdated: string }> {
    try {
      this.logger.log(`Fetching balance for bank: ${bankCode}`);

      // 세션에서 페이지 가져오기
      const { page } = this.getSession(sessionId, bankCode);

      // 잔액 조회
      const balance = await this.bankScraperService.getBalance(bankCode, page);

      return {
        balance,
        currency: 'KRW',
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.handleError(error, `Failed to get balance for bank: ${bankCode}`);
    }
  }

  @Post(':bankCode/transactions')
  @UseGuards(SessionGuard)
  @ApiBearerAuth('session-id')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiParam({
    name: 'bankCode',
    description: 'Bank code (kb, shinhan, woori, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved transactions',
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to get transactions',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired session',
  })
  async getTransactionHistory(
    @Param('bankCode') bankCode: string,
    @Query('sessionId') sessionId: string,
    @Body() transactionHistoryDto: TransactionHistoryDto,
  ): Promise<{ transactions: TransactionHistoryResponse[]; summary: any }> {
    try {
      this.logger.log(`Fetching transactions for bank: ${bankCode}`);

      // 세션에서 페이지 가져오기
      const { page } = this.getSession(sessionId, bankCode);

      // 날짜 객체로 변환
      const startDate = new Date(transactionHistoryDto.startDate);
      const endDate = new Date(transactionHistoryDto.endDate);

      // 거래 내역 조회
      const transactions = await this.bankScraperService.getTransactionHistory(
        bankCode,
        page,
        startDate,
        endDate,
      );

      // 거래 내역 요약 계산
      const summary = this.calculateTransactionSummary(transactions);

      return { transactions, summary };
    } catch (error) {
      this.handleError(
        error,
        `Failed to get transaction history for bank: ${bankCode}`,
      );
    }
  }

  @Post(':bankCode/logout')
  @UseGuards(SessionGuard)
  @ApiBearerAuth('session-id')
  @ApiOperation({ summary: 'Logout from bank' })
  @ApiParam({
    name: 'bankCode',
    description: 'Bank code (kb, shinhan, woori, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to logout',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired session',
  })
  async logout(
    @Param('bankCode') bankCode: string,
    @Query('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Logging out from bank: ${bankCode}`);

      // 세션에서 페이지 가져오기
      const { page } = this.getSession(sessionId, bankCode);

      // 로그아웃 실행
      await this.bankScraperService.logout(page);

      // 세션 제거
      this.removeSession(sessionId);

      return { message: 'Logout successful' };
    } catch (error) {
      // 세션은 항상 제거
      this.removeSession(sessionId);

      this.handleError(error, `Logout failed for bank: ${bankCode}`);
    }
  }

  // 에러 처리 헬퍼 메서드
  private handleError(error: any, defaultMessage: string): never {
    const bankError = error as BankError;
    const statusCode = bankError.statusCode || HttpStatus.BAD_REQUEST;
    const message = bankError.message || defaultMessage;

    this.logger.error(`${defaultMessage}: ${message}`);

    throw new HttpException(message, statusCode);
  }

  // 세션 ID 생성 (실제로는 더 안전한 방식으로 구현해야 함)
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // 세션 저장 (실제로는 Redis나 다른 세션 스토어를 사용해야 함)
  private sessions: Map<
    string,
    { bankCode: string; page: any; createdAt: Date }
  > = new Map();

  private storeSession(
    sessionId: string,
    data: { bankCode: string; page: any },
  ): void {
    this.sessions.set(sessionId, { ...data, createdAt: new Date() });

    // 30분 후 세션 만료
    setTimeout(
      () => {
        this.removeSession(sessionId);
      },
      30 * 60 * 1000,
    );
  }

  private getSession(sessionId: string, bankCode: string): { page: Page } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new HttpException(
        'Invalid or expired session',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (session.bankCode !== bankCode) {
      throw new HttpException(
        'Session bank code mismatch',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return { page: session.page };
  }

  private removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);

    if (session) {
      // 페이지 닫기 시도
      if (session.page) {
        session.page.close().catch(() => {});
      }

      this.sessions.delete(sessionId);
    }
  }

  // 거래 내역 요약 계산
  private calculateTransactionSummary(
    transactions: TransactionHistoryResponse[],
  ): any {
    if (!transactions || transactions.length === 0) {
      return {
        count: 0,
        totalDeposit: 0,
        totalWithdrawal: 0,
        netChange: 0,
      };
    }

    let totalDeposit = 0;
    let totalWithdrawal = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === 'deposit') {
        totalDeposit += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        totalWithdrawal += transaction.amount;
      }
    });

    return {
      count: transactions.length,
      totalDeposit,
      totalWithdrawal,
      netChange: totalDeposit - totalWithdrawal,
      firstDate: transactions[0]?.date,
      lastDate: transactions[transactions.length - 1]?.date,
    };
  }
}
