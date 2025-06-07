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

### 5. DI 토큰(BANK_STRATEGY_MAP) 주입과 전략 패턴 적용
- 서비스 코드에서 은행별 스크래핑 전략을 DI 토큰(`BANK_STRATEGY_MAP`)으로 주입받아 사용했다.
- DI 토큰을 사용하면 서비스 코드와 전략 구현/선택이 완전히 분리되어, 유지보수성과 확장성이 크게 향상된다.
- 실서비스(AppModule)에서는 실제 전략 인스턴스를, 테스트 환경에서는 Mock 전략 인스턴스를 DI로 주입했다.
- 예시:
  ```typescript
  // AppModule (실서비스)
  providers: [
    BankScraperService,
    {
      provide: 'BANK_STRATEGY_MAP',
      useValue: {
        kb: new KbBankStrategy(),
        hana: new HanaBankStrategy(),
        // ...
      }
    },
  ]
  // 테스트 모듈
  providers: [
    BankScraperService,
    { provide: 'BANK_STRATEGY_MAP', useValue: mockStrategies },
    // ...
  ]
  ```
- DI 토큰을 활용하면 서비스 코드는 변경하지 않고, 환경에 따라 실제 전략/Mock 전략을 자유롭게 교체할 수 있다.
- 새로운 은행이 추가될 때도 전략만 추가하고 DI 맵에 등록하면 되므로, 확장성이 매우 뛰어나다.

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

## 트러블슈팅 (E2E 테스트 및 Puppeteer)

### 1. file:// 환경에서 navigation 대기 문제

- `page.goto(url, { waitUntil: 'networkidle2' })` 또는 `page.waitForNavigation({ waitUntil: 'networkidle2' })`는 file 프로토콜에서는 무한 대기/타임아웃이 발생할 수 있다.
- file 환경에서는 반드시 `waitUntil: 'load'`로 변경하거나, navigation 대신 DOM 요소가 등장할 때까지 `page.waitForSelector`로 대기했다.

### 2. SPA/정적 HTML에서 네트워크 응답 대기 문제

- 테스트용 HTML은 네트워크 요청 없이 DOM만 변경한다.
- `page.waitForResponse`로 네트워크 응답을 기다리면 영원히 대기하게 된다.
- 버튼 클릭 후, 원하는 데이터가 DOM에 렌더링될 때까지 `page.waitForSelector`로 대기했다.

### 3. Puppeteer의 file:// 접근 권한 문제

- 일부 환경에서는 Puppeteer가 file:// 경로를 제대로 읽지 못할 수 있다.
- Puppeteer 실행 시 아래 옵션을 추가했다:
  ```js
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--allow-file-access-from-files',
  ]
  ```

### 4. 테스트 타임아웃 문제

- Puppeteer 기반 테스트는 환경에 따라 시간이 오래 걸릴 수 있다.
- Jest 테스트의 타임아웃을 충분히 늘렸다. (예: `30000`ms)

### 5. 경로 별칭(import alias) 문제

- Jest는 TypeScript의 `src/` 경로 별칭을 기본적으로 인식하지 못한다.
- 루트에 `jest.config.js`를 만들고 아래와 같이 설정했다:
  ```js
  module.exports = {
    // ...
    moduleNameMapper: {
      '^src/(.*)$': '<rootDir>/src/$1',
    },
  };
  ```

### 6. 디버깅 팁

- 각 단계별로 `console.log`를 추가해 어디서 멈추는지 확인했다.
- 에러 발생 시 `page.screenshot({ path: '에러시점.png' })`로 실제 화면을 저장해 원인을 파악했다.

## Puppeteer/Playwright 실습 및 학습 내용

### 헤드리스 브라우저 제어
- Puppeteer를 활용해 실제 브라우저를 띄우지 않고(headless 모드) 자동으로 웹페이지를 로드하고, 여러 동작을 수행하는 과정을 실습했다.
- 브라우저 인스턴스 생성, 페이지 오픈, file:// 경로의 정적 HTML 파일 자동 로드 방법을 익혔다.

### DOM 조작과 이벤트 시뮬레이션
- 자동화 테스트 코드로 로그인 폼 입력, 버튼 클릭, 탭 전환 등 실제 사용자의 행동을 코드로 시뮬레이션했다.
- `page.type`으로 입력 필드에 값 입력, `page.click`으로 버튼 클릭 및 폼 제출, `waitForSelector`로 UI 상태 변화 감지 방법을 익혔다.

### 스크린샷, PDF 생성
- 에러 발생 시 `page.screenshot`을 활용해 실제 브라우저 상태를 이미지로 저장함으로써, 자동화 과정의 디버깅 및 결과 확인 역량을 실습했다.

### 네트워크 요청 가로채기 및 SPA/정적 페이지 대응
- file:// 환경의 정적 HTML에서는 네트워크 요청이 발생하지 않으므로, 네트워크 응답 대기 대신 DOM 변화 감지(`waitForSelector`)로 자동화 테스트를 설계했다.
- 네트워크 요청이 없는 SPA/정적 페이지에서의 자동화 전략을 경험했다.

### 트러블슈팅 및 실전 경험
- navigation 대기, 네트워크 응답 대기, 경로 권한, 경로 별칭 등 실제 프로젝트에서 발생할 수 있는 다양한 문제를 직접 해결했다.
- 각 단계별로 로그와 스크린샷을 활용해 문제를 진단하고, 테스트 신뢰성을 높이는 방법을 익혔다.
