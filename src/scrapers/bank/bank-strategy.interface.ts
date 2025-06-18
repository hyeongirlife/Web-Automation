import { Page } from 'puppeteer';
import { LoginInfo, TransactionHistoryResponse } from './bank-scraper.service';

export interface BankStrategy {
  /**
   * 은행 웹사이트에 로그인합니다.
   * @param page Puppeteer Page 인스턴스
   * @param credentials 로그인 정보
   */
  login(page: Page, credentials: LoginInfo): Promise<void>;

  /**
   * 현재 계좌 잔액을 조회합니다.
   * @param page Puppeteer Page 인스턴스
   * @returns 계좌 잔액
   */
  getBalance(page: Page): Promise<number>;

  /**
   * 지정된 기간의 거래 내역을 조회합니다.
   * @param page Puppeteer Page 인스턴스
   * @param startDate 조회 시작 날짜
   * @param endDate 조회 종료 날짜
   * @returns 거래 내역 목록
   */
  getTransactionHistory(
    page: Page,
    startDate: Date,
    endDate: Date,
  ): Promise<TransactionHistoryResponse[]>;
}
