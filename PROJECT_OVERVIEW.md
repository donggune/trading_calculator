# BullGaze 프로젝트 개요

## 📋 프로젝트 소개

**BullGaze**는 금융 시장 데이터를 실시간으로 분석하고, 투자 거래를 체계적으로 관리할 수 있는 웹 기반 투자 분석 플랫폼입니다.

### 🎯 핵심 가치

- 실시간 금융 데이터 시각화
- 스마트한 투자 전략 도구 제공
- 개인 투자 기록 관리 및 분석
- 자산 간 상관관계 분석

---

## 🛠️ 기술 스택

### 프론트엔드
- **프레임워크**: SvelteKit 2.43.2 (Svelte 5.39.5)
- **언어**: TypeScript 5.9.2
- **스타일링**: Tailwind CSS 4.1.13
- **차트**: Chart.js 4.5.0, chartjs-chart-matrix 3.0.0
- **통계**: simple-statistics 7.8.8

### 백엔드 & 인프라
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (Google OAuth)
- **배포**: Vercel (adapter-vercel 5.10.2)
- **빌드 도구**: Vite 7.1.7

### 개발 도구
- **테스트**: Vitest 3.2.4, Playwright 1.55.1
- **린팅**: ESLint 9.36.0, Prettier 3.6.2
- **타입 체크**: svelte-check 4.3.2

---

## 📁 프로젝트 구조

```
trading-calculator/
├── src/
│   ├── routes/                    # SvelteKit 라우트
│   │   ├── +page.svelte          # 대시보드 (메인)
│   │   ├── +layout.svelte        # 공통 레이아웃
│   │   ├── calculator/           # 분할 익절 계산기
│   │   ├── analytics/            # 시장 상관관계 분석
│   │   ├── journal/              # 매매일지
│   │   ├── auth/callback/        # OAuth 콜백
│   │   └── sitemap.xml/          # SEO 사이트맵
│   ├── lib/
│   │   ├── components/           # 재사용 가능한 컴포넌트
│   │   ├── api/                  # API 함수
│   │   ├── stores/               # Svelte 스토어
│   │   ├── utils/                # 유틸리티 함수
│   │   ├── types.ts              # TypeScript 타입 정의
│   │   └── supabaseClient.ts     # Supabase 클라이언트
│   └── app.html                  # HTML 템플릿
├── supabase/
│   └── migrations/               # 데이터베이스 마이그레이션
├── static/                       # 정적 파일
├── tests/                        # E2E 테스트
└── package.json
```

---

## 🎨 주요 기능

### 1. 📊 대시보드 (메인 페이지)

**경로**: `/`

**기능**:
- 실시간 금융 데이터 표시
- 자산별 가격 카드 (4열 그리드)
- 30일 히스토리 차트
- 자산 타입별 그룹화

**표시 데이터**:
- **주식 지수**: 나스닥-100 선물(NQ), 나스닥 종합(IXIC), S&P 500(SPX), 러셀 2000(RUT), 닛케이 225(N225)
- **경제 지표**: M2 통화 공급량(M2)
- **환율**: 달러 인덱스(DXY), USD/KRW, 엔화 선물(6J), 유로 선물(6E)
- **원자재**: 금 선물(GC), 원유 선물(CL)
- **채권**: 미국 10년 국채(TNX)

**데이터 소스**:
- Supabase `financial_dashboard_prices` 테이블
- Yahoo Finance API (주식, 환율, 원자재, 채권)
- FRED API (경제 지표 - M2)
- 최근 30일 데이터만 조회 (성능 최적화)
- 클라이언트 측에서 심볼별 최신 데이터 추출

**특징**:
- 반응형 디자인 (데스크톱 4열 → 태블릿 3열 → 모바일 1열)
- SEO 최적화 (Schema.org 구조화된 데이터)
- 접근성 고려 (ARIA 레이블, 스크린 리더 지원)

---

### 2. 🧮 분할 익절 계산기

**경로**: `/calculator`

**기능**:
- 4단계 분할 익절 전략 자동 계산
- 매수가, 수량, 상승률 입력
- 실시간 수익률 계산

**계산 로직**:
- **1차 매도 (50%)**: 초기 상승률 × 1 (1Δ)
- **2차 매도 (25%)**: 초기 상승률 × 3 (3Δ)
- **3차 매도 (12.5%)**: 초기 상승률 × 7 (7Δ)
- **4차 매도 (나머지)**: 초기 상승률 × 10.5 (10.5Δ)

**입력 방식**:
- 상승률 직접 입력 (권장: 4~9%)
- 또는 목표 수익금 입력 → 상승률 역계산

**출력**:
- 단계별 매도 가격 및 수량
- 단계별 수익금 및 수익률
- 총 투자금, 총 회수금, 순수익

**UI**:
- 모바일: 카드 형태
- 데스크톱: 테이블 형태
- 실시간 계산 (입력 즉시 반영)

---

### 3. 📈 시장 상관관계 분석

**경로**: `/analytics`

**기능**:
- 자산 간 상관관계 히트맵
- 자산 비교 차트 (최대 4개)
- 시장 인사이트 자동 추출

**분석 방법**:
- 피어슨 상관계수 계산
- 최근 30일 데이터 기반
- 정규화 옵션 (시작점 = 100)

**인터랙션**:
- 히트맵 셀 클릭 → 자산 자동 선택
- 자산 칩 클릭 → 비교 차트 업데이트
- 최대 4개 자산 선택 (FIFO 방식)

**인사이트 유형**:
- 강한 양의 상관관계 (> 0.7)
- 강한 음의 상관관계 (< -0.7)
- 독립적 움직임 (-0.3 ~ 0.3)

**컴포넌트**:
- `CorrelationHeatmap`: 상관관계 매트릭스 시각화
- `AssetComparisonChart`: 다중 자산 비교 차트
- `InsightCard`: 시장 인사이트 카드

---

### 4. �  실시간 캔들차트

**경로**: `/realtime`

**기능**:
- 나스닥-100 선물(NQ=F) 실시간 가격 차트
- 8가지 타임프레임 지원 (1분, 5분, 15분, 1시간, 1일, 1주, 1월, 분기)
- 실시간 자동 업데이트 (폴링)
- 현재가 및 업데이트 시간 표시

**타임프레임별 설정**:
- **1분봉**: 1일 데이터, 10초 폴링 (초단타 매매)
- **5분봉**: 1일 데이터, 1분 폴링 (단타 매매)
- **15분봉**: 1일 데이터, 1분 폴링 (단기 매매)
- **1시간봉**: 1개월 데이터, 1분 폴링 (스윙 트레이딩)
- **일봉**: 1년 데이터, 1분 폴링 (중기 투자)
- **주봉**: 2년 데이터, 10분 폴링 (장기 투자)
- **월봉**: 10년 데이터, 10분 폴링 (장기 투자)
- **분기봉**: 최대 데이터, 10분 폴링 (초장기 분석)

**데이터 소스**:
- Yahoo Finance API (비공식)
- SvelteKit API 라우트를 통한 CORS 우회
- 클라이언트 캐싱 (1분)

**차트 라이브러리**:
- Lightweight Charts 5.0.9 (TradingView)
- Canvas 기반 렌더링
- GPU 가속 지원

**특징**:
- 실시간 토글 버튼 (🔴 라이브 / ⚪ 정지)
- 타임프레임별 최적화된 폴링 간격
- 효율적인 캐싱으로 API 호출 최소화
- 에러 처리 및 재시도 기능
- 반응형 디자인

**성능**:
- 클라이언트 캐싱으로 불필요한 API 호출 방지
- 타임프레임별 폴링 간격 최적화
- Rate Limit 안전 (15.9% 사용)

**컴포넌트**:
- `RealtimeCandlestickChart.svelte`: 차트 컴포넌트
- `/api/candles/[symbol]/+server.ts`: 서버 API 라우트
- `src/lib/api/candles.ts`: API 함수

---

### 5. 📝 매매일지

**경로**: `/journal`

**기능**:
- 거래 기록 추가/수정/삭제
- 통계 대시보드
- 성과 분석

**데이터 모델**:
```typescript
interface TradingEntry {
  id: string;
  user_id: string;
  date: string;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}
```

**통계 계산**:
- 총 거래 수
- 승률 (이익 거래 / 전체 거래)
- 총 수익 / 총 손실
- 순수익
- 평균 수익 / 평균 손실
- 수익 팩터 (Profit Factor)

**보안**:
- Supabase Auth 인증 필수
- Row Level Security (RLS) 정책
- 사용자별 데이터 격리

**UI**:
- 모바일: 카드 형태
- 데스크톱: 테이블 형태
- 인라인 편집 지원

---

## 🗄️ 데이터베이스 구조

### Supabase 테이블

#### 1. `financial_dashboard_prices`

금융 자산 가격 데이터 저장

```sql
CREATE TABLE financial_dashboard_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type VARCHAR(50) CHECK (asset_type IN (
    'gold',
    'stock_index',
    'currency_index',
    'cryptocurrency',
    'commodity',
    'currency',
    'economic_indicator'
  )),
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  price NUMERIC(20, 8),
  currency VARCHAR(10) DEFAULT 'USD',
  change_24h NUMERIC(20, 8),
  change_percent NUMERIC(10, 4),
  high_24h NUMERIC(20, 8),
  low_24h NUMERIC(20, 8),
  open_24h NUMERIC(20, 8),
  volume_24h NUMERIC(30, 8),
  market_cap NUMERIC(30, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_symbol ON financial_dashboard_prices(symbol);
CREATE INDEX idx_created_at ON financial_dashboard_prices(created_at);
CREATE INDEX idx_asset_type ON financial_dashboard_prices(asset_type);
```

**데이터 수집**:
- Supabase Edge Function (`update-financial-prices`)
- 매일 00:00 UTC 자동 실행 (Cron Job)
- Yahoo Finance API 사용 (주식, 환율, 원자재, 채권)
- FRED API 사용 (경제 지표 - M2 통화 공급량)

---

#### 2. `financial_trading_entries`

사용자 거래 기록 저장

```sql
CREATE TABLE financial_trading_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) CHECK (action IN ('buy', 'sell')),
  quantity NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_id ON financial_trading_entries(user_id);
CREATE INDEX idx_date ON financial_trading_entries(date);
CREATE INDEX idx_symbol_trading ON financial_trading_entries(symbol);
```

**RLS 정책**:
```sql
-- 사용자는 자신의 데이터만 조회
CREATE POLICY "Users can view own entries"
  ON financial_trading_entries FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 추가
CREATE POLICY "Users can insert own entries"
  ON financial_trading_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 수정
CREATE POLICY "Users can update own entries"
  ON financial_trading_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 삭제
CREATE POLICY "Users can delete own entries"
  ON financial_trading_entries FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 🔐 인증 시스템

### Supabase Auth

**인증 방식**:
- Google OAuth 2.0

**인증 흐름**:
1. 사용자가 "Google로 로그인" 클릭
2. Google OAuth 페이지로 리디렉션
3. 사용자 승인 후 `/auth/callback`으로 리디렉션
4. Supabase가 세션 생성
5. 클라이언트에서 세션 확인

**상태 관리**:
```typescript
// src/lib/stores/auth.ts
export const userStore = writable<User | null>(null);

// 세션 초기화
supabase.auth.getSession().then(({ data: { session } }) => {
  userStore.set(session?.user ?? null);
});

// 세션 변경 감지
supabase.auth.onAuthStateChange((event, session) => {
  userStore.set(session?.user ?? null);
});
```

**보호된 기능**:
- 매매일지 (`/journal`)
  - 로그인하지 않은 사용자는 로그인 프롬프트 표시
  - 로그인 후 자동으로 데이터 로드

---

## 🎨 디자인 시스템

### 색상 팔레트

**자산별 색상**:
- 금: `amber-*` (🏆)
- 주식 지수: `indigo-*`, `blue-*`, `red-*`, `green-*`, `orange-*`
- 경제 지표: `purple-*` (📊)
- 환율: `green-*`, `pink-*`, `sky-*`
- 원자재: `amber-*`, `purple-*`
- 채권: `yellow-*`

**상태 색상**:
- 성공/이익: `emerald-*`
- 실패/손실: `red-*`
- 정보: `blue-*`
- 경고: `yellow-*`

### 레이아웃

**반응형 브레이크포인트**:
- 모바일: `< 768px`
- 태블릿: `768px ~ 1024px`
- 데스크톱: `> 1024px`

**그리드 시스템**:
- 대시보드 가격 카드: 4열 → 3열 → 2열 → 1열
- 계산기: 12열 그리드 (입력 4열, 테이블 8열)
- 차트: 1열 (전체 너비)

### 타이포그래피

**폰트**:
- 시스템 폰트 스택 (Tailwind 기본)
- 숫자: `font-mono` (고정폭 폰트)

**크기**:
- 헤더: `text-3xl` ~ `text-4xl`
- 본문: `text-sm` ~ `text-base`
- 캡션: `text-xs`

---

## 📦 주요 컴포넌트

### 차트 컴포넌트

#### `LineChart.svelte`
- Chart.js 기반 라인 차트
- Props: `labels`, `datasets`, `title`, `currentPrice`, `currency`
- 반응형 크기 조정
- 툴팁 커스터마이징

#### `CorrelationHeatmap.svelte`
- chartjs-chart-matrix 기반 히트맵
- 상관계수 시각화 (-1 ~ 1)
- 셀 클릭 이벤트 지원
- 색상 그라디언트 (빨강 → 노랑 → 초록)

#### `AssetComparisonChart.svelte`
- 다중 자산 비교 차트
- 정규화 옵션 지원
- 최대 4개 자산 동시 표시

### UI 컴포넌트

#### `PriceCard.svelte`
- 자산 가격 카드
- Props: `name`, `symbol`, `price`, `currency`, `change24h`, `changePercent`
- 변동률에 따른 색상 변경
- 호버 효과

#### `InsightCard.svelte`
- 시장 인사이트 카드
- 상관관계 분석 결과 표시
- 아이콘 및 색상 코딩

---

## 🔧 유틸리티 함수

### `src/lib/utils/correlation.ts`

#### `createCorrelationMatrix()`
```typescript
function createCorrelationMatrix(
  data: { [key: string]: FinancialPrice[] }
): CorrelationMatrix
```
- 자산 간 상관계수 계산
- 피어슨 상관계수 사용
- simple-statistics 라이브러리 활용

#### `extractInsights()`
```typescript
function extractInsights(
  matrix: CorrelationMatrix
): MarketInsight[]
```
- 상관관계 매트릭스에서 인사이트 추출
- 강한 상관관계 (|r| > 0.7) 식별
- 독립적 움직임 (|r| < 0.3) 식별

#### `normalizeData()`
```typescript
function normalizeData(data: number[]): number[]
```
- 데이터 정규화 (시작점 = 100)
- 자산 비교 시 사용

---

## 🚀 배포 및 운영

### 배포 환경

**프로덕션**:
- 플랫폼: Vercel
- 도메인: `bullgaze.com`
- 자동 배포: `main` 브랜치 푸시 시

**환경 변수**:
```bash
# .env.local (로컬 개발)
PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
FRED_API_KEY=[FRED_API_KEY]  # FRED API 키 (경제 지표 데이터)
```

**Supabase Edge Function 환경 변수**:
- `FRED_API_KEY`: FRED API 키 (Supabase Dashboard에서 설정)

### 성능 최적화

**데이터 로딩**:
- 최근 30일 데이터만 조회
- 클라이언트 측 캐싱 (Map 사용)
- 날짜 포맷팅 캐시

**렌더링**:
- Svelte 5 Runes 사용 (`$state`, `$derived`, `$effect`)
- 반응형 데이터 자동 업데이트
- 불필요한 재렌더링 방지

**번들 크기**:
- Vite 코드 스플리팅
- 트리 쉐이킹
- 동적 임포트

### SEO 최적화

**메타 태그**:
- 페이지별 `<title>`, `<meta description>`
- Open Graph 태그 (Facebook, LinkedIn)
- Twitter Card 태그

**구조화된 데이터**:
- Schema.org JSON-LD
- WebApplication 타입
- 기능 목록, 가격 정보 포함

**사이트맵**:
- `/sitemap.xml` 자동 생성
- 모든 주요 페이지 포함

---

## 🧪 테스트

### 단위 테스트 (Vitest)

**실행**:
```bash
npm run test:unit
```

**테스트 파일**:
- `src/routes/page.svelte.spec.ts`

### E2E 테스트 (Playwright)

**실행**:
```bash
npm run test:e2e
```

**브라우저**:
- Chromium
- Firefox
- WebKit

---

## 📚 개발 가이드

### 로컬 개발 환경 설정

1. **저장소 클론**:
```bash
git clone [repository-url]
cd trading-calculator
```

2. **의존성 설치**:
```bash
npm install
```

3. **환경 변수 설정**:
```bash
cp .env.example .env.local
# .env.local 파일 편집
```

4. **개발 서버 실행**:
```bash
npm run dev
```

5. **브라우저 접속**:
```
http://localhost:5173
```

### 새로운 금융 데이터 추가

자세한 가이드는 `ADDING_NEW_DATA.md` 참조

**요약**:
1. API 엔드포인트 생성 (`src/routes/api/[NAME]/+server.ts`)
2. 프론트엔드 페이지 생성 (`src/routes/[NAME]/+page.svelte`)
3. DB 테이블 확인 (`asset_type` constraint)
4. Supabase Edge Function 업데이트
5. 네비게이션 링크 추가
6. 환경 변수 설정 (필요시)
7. 테스트

### 코드 스타일

**린팅**:
```bash
npm run lint
```

**포맷팅**:
```bash
npm run format
```

**타입 체크**:
```bash
npm run check
```

---

## 🐛 문제 해결

### 데이터가 로드되지 않는 경우

1. Supabase 연결 확인
   - `.env.local` 파일의 환경 변수 확인
   - Supabase 프로젝트 상태 확인

2. 브라우저 콘솔 확인
   - 네트워크 에러 확인
   - JavaScript 에러 확인

3. 데이터베이스 확인
   - Supabase Dashboard에서 테이블 확인
   - 데이터 존재 여부 확인

### 인증 문제

1. Google OAuth 설정 확인
   - Supabase Dashboard > Authentication > Providers
   - Google OAuth 활성화 확인

2. 리디렉션 URL 확인
   - Authorized redirect URIs에 콜백 URL 추가
   - `http://localhost:5173/auth/callback` (로컬)
   - `https://bullgaze.com/auth/callback` (프로덕션)

3. 세션 확인
   - 브라우저 개발자 도구 > Application > Local Storage
   - `supabase.auth.token` 확인

---

## 📖 참고 문서

### 프로젝트 문서
- `README.md`: 기본 프로젝트 정보
- `README_TRADING_JOURNAL.md`: 매매일지 기능 가이드
- `README_TRADING_JOURNAL_UPDATE.md`: 매매일지 수정 기능
- `ADDING_NEW_DATA.md`: 새로운 금융 데이터 추가 가이드
- `REALTIME_CANDLESTICK_GUIDE.md`: 실시간 캔들차트 가이드

### 외부 문서
- [SvelteKit 공식 문서](https://kit.svelte.dev/docs)
- [Svelte 5 문서](https://svelte.dev/docs/svelte/overview)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Chart.js 문서](https://www.chartjs.org/docs)

---

## 📝 라이선스

이 프로젝트는 비공개 프로젝트입니다.

---

## 👥 기여

현재 개인 프로젝트로 운영 중입니다.

---

---

## 🆕 최근 업데이트

### 2025-10-09: M2 통화 공급량 지표 추가
- **새로운 경제 지표**: M2 통화 공급량 데이터 추가
- **데이터 소스**: FRED API (Federal Reserve Economic Data)
- **표시 위치**: 
  - 대시보드 메인 페이지 (경제 지표 섹션)
  - 상관관계 분석 페이지
- **차트**: 30일 히스토리 차트 (보라색 테마)
- **업데이트 주기**: 매일 자동 업데이트
- **기술 구현**:
  - `update-financial-prices` Edge Function에 M2 데이터 수집 로직 추가
  - `seed-historical-data` Edge Function에 FRED API 통합
  - 데이터베이스 스키마에 `economic_indicator` asset_type 추가

---

**마지막 업데이트**: 2025-10-09
