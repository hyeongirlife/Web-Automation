# Web-Automation

웹 자동화 및 스크래핑 전문 기술 개발 프로젝트

## 프로젝트 아키텍처 및 흐름도

```
+---------------------+     +----------------------+     +----------------------+
|                     |     |                      |     |                      |
|  브라우저 자동화 계층  |     |   스크래핑 전략 계층   |     |    데이터 처리 계층    |
|                     |     |                      |     |                      |
| +---------------+   |     | +----------------+   |     | +----------------+   |
| | Puppeteer/    |   |     | | 금융사별 스크래핑 |   |     | | 데이터 정제     |   |
| | Playwright    |   |     | | 전략 구현       |   |     | | 및 변환        |   |
| +---------------+   |     | +----------------+   |     | +----------------+   |
|         |          |     |         |          |     |         |          |
|         v          |     |         v          |     |         v          |
| +---------------+   |     | +----------------+   |     | +----------------+   |
| | 브라우저 제어   |   |     | | 세션/쿠키 관리  |   |     | | 데이터 저장     |   |
| | 및 DOM 조작    |   |     | | CAPTCHA 처리   |   |     | | 및 API 연동    |   |
| +---------------+   |     | +----------------+   |     | +----------------+   |
|                     |     |                      |     |                      |
+---------------------+     +----------------------+     +----------------------+
          |                           |                            |
          v                           v                            v
+---------------------------------------------------------------------+
|                                                                     |
|                          작업 관리 계층                              |
|                                                                     |
| +-------------------+    +-------------------+    +----------------+ |
| | 작업 스케줄러      |    | 분산 큐 시스템     |    | 장애 복구 시스템 | |
| +-------------------+    +-------------------+    +----------------+ |
|                                                                     |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
|                                                                     |
|                          모니터링 계층                               |
|                                                                     |
| +-------------------+    +-------------------+    +----------------+ |
| | 로그 수집 (ELK)    |    | 메트릭 대시보드    |    | 알람 시스템     | |
| +-------------------+    +-------------------+    +----------------+ |
|                                                                     |
+---------------------------------------------------------------------+
```

## 프로젝트 개요

이 프로젝트는 웹 자동화 및 스크래핑 기술을 체계적으로 학습하고 실제 금융 서비스에 적용 가능한 수준의 자동화 시스템을 구축하는 것을 목표로 합니다. 브라우저 자동화부터 대규모 스크래핑 인프라 구축, 모니터링 시스템까지 2개월 과정으로 구성되어 있습니다.

## 학습 로드맵

### 1. 브라우저 자동화 기초 (Week 9-10)

**목표**: Puppeteer/Playwright 마스터

**학습 내용**:

- 헤드리스 브라우저 제어
- DOM 조작과 이벤트 시뮬레이션
- 스크린샷, PDF 생성
- 네트워크 요청 가로채기

**실습 프로젝트**: 은행 잔액 조회 자동화

```typescript
// 은행 잔액 조회 자동화 예시 코드
class BankScraper {
  private browser: Browser;

  async login(credentials: LoginInfo): Promise<void> {
    const page = await this.browser.newPage();
    await page.goto('https://bank-example.com/login');
    await page.type('#username', credentials.username);
    await page.type('#password', credentials.password);
    await page.click('#login-btn');
    await page.waitForNavigation();
  }

  async getBalance(): Promise<number> {
    // 잔액 스크래핑 로직
  }
}
```

### 2. 고급 스크래핑 기법 (Week 11-12)

**목표**: 실제 금융사 연동 수준의 스크래핑 구현

**학습 내용**:

- CAPTCHA 우회 기법
- 세션 관리와 쿠키 처리
- 동적 콘텐츠 로딩 대응
- 봇 탐지 회피 전략

**실습 프로젝트**: 다중 금융사 통합 스크래퍼

```typescript
// 다중 금융사 통합 스크래퍼 예시 코드
class UniversalFinancialScraper {
  private strategies: Map<string, ScrapingStrategy>;

  async scrapeAccount(bankCode: string, credentials: any): Promise<AccountData> {
    const strategy = this.strategies.get(bankCode);
    return await strategy.execute(credentials);
  }
}
```

### 3. 스크래핑 인프라 구축 (Week 13-14)

**목표**: 대규모 스크래핑 시스템 설계

**학습 내용**:

- Proxy 서버 관리
- 분산 스크래핑 아키텍처
- Rate Limiting과 Queue 시스템
- 장애 복구 메커니즘

**실습 프로젝트**: 스크래핑 작업 스케줄러

```typescript
// 스크래핑 작업 스케줄러 예시 코드
@Injectable()
export class ScrapingScheduler {
  constructor(
    @InjectQueue('scraping') private scrapingQueue: Queue
  ) {}

  async scheduleAccountUpdate(userId: string): Promise<void> {
    await this.scrapingQueue.add('updateAccount', {
      userId,
      priority: 'high',
      attempts: 3,
      backoff: 'exponential'
    });
  }
}
```

### 4. 모니터링 및 안정성 (Week 15-16)

**목표**: 프로덕션 레벨 모니터링 시스템

**학습 내용**:

- ELK 스택 구축 (Elasticsearch, Logstash, Kibana)
- 메트릭 수집과 알람 설정
- 성능 최적화 기법
- 장애 대응 자동화

**실습 프로젝트**: 스크래핑 모니터링 시스템

```typescript
// 스크래핑 모니터링 시스템 예시 코드
@Injectable()
export class ScrapingMonitor {
  constructor(private readonly logger: Logger) {}

  @Cron('*/5 * * * *')
  async checkScrapingHealth(): Promise<void> {
    const healthData = await this.getSystemHealth();

    if (healthData.errorRate > 0.1) {
      await this.sendAlert('High error rate detected');
    }

    this.logger.log('Health check completed', { healthData });
  }
}
```

## 기술 스택

- **프로그래밍 언어**: TypeScript
- **브라우저 자동화**: Puppeteer/Playwright
- **백엔드 프레임워크**: NestJS
- **작업 큐**: Bull/Redis
- **모니터링**: ELK Stack (Elasticsearch, Logstash, Kibana)

## 설치 및 실행 방법

```bash
# 레포지토리 클론
git clone https://github.com/hyeongirlife/Web-Automation.git

# 디렉토리 이동
cd Web-Automation

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 프로젝트 구조

```
Web-Automation/
├── src/
│   ├── scrapers/         # 스크래핑 관련 클래스
│   ├── infrastructure/   # 인프라 관련 코드
│   ├── monitoring/       # 모니터링 시스템
│   └── utils/            # 유틸리티 함수
├── tests/                # 테스트 코드
├── config/               # 설정 파일
└── README.md             # 프로젝트 문서
```

## 기여 방법

1. 이 레포지토리를 포크합니다.
2. 새로운 브랜치를 생성합니다: `git checkout -b feature/amazing-feature`
3. 변경사항을 커밋합니다: `git commit -m 'Add some amazing feature'`
4. 브랜치에 푸시합니다: `git push origin feature/amazing-feature`
5. Pull Request를 제출합니다.

## 라이센스

MIT License
`<p align="center">`
  `<a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />``</a>`

</p>
