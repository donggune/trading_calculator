# 새로운 금융 데이터 추가 가이드 📊

이 문서는 금융 대시보드에 새로운 데이터 소스(지수, 자산 등)를 추가할 때 필요한 단계별 체크리스트입니다.

## 📋 추가 체크리스트

### 1️⃣ API 엔드포인트 생성

**파일**: `src/routes/api/[NAME]/+server.ts`

- [ ] API 파일 생성 (예: `src/routes/api/bitcoin/+server.ts`)
- [ ] 필요한 인터페이스 정의
  ```typescript
  interface YahooFinanceQuote { ... }
  interface ApiResponse { ... }
  ```
- [ ] API 호출 함수 구현 (`fetchFromAPI`)
- [ ] Mock 데이터 생성 함수 구현 (`generateMockData`)
- [ ] DB 저장 함수 구현 (`saveToDatabase`)
  - `asset_type` 올바르게 설정
  - `symbol` 설정
  - `name` 설정
  - 모든 필수 필드 매핑
- [ ] `GET` 핸들러 구현
  - 캐시 로직 (24시간, 매일 00시 서버에서 자동 수집)
  - API 호출 및 에러 처리
  - JSON 응답 반환
- [ ] `roundToTwo` 함수로 소수점 처리

**예시 코드 구조**:

```typescript
// src/routes/api/bitcoin/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertFinancialPrice, getLatestFinancialPrice } from '$lib/server/db';

const API_URL = 'https://api.example.com';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

// ... 인터페이스, 함수들 ...

export const GET: RequestHandler = async ({ url }) => {
	// ... 로직 ...
};
```

---

### 2️⃣ 프론트엔드 페이지 생성

**파일**: `src/routes/[NAME]/+page.svelte`

- [ ] 페이지 파일 생성 (예: `src/routes/bitcoin/+page.svelte`)
- [ ] 인터페이스 정의
  ```typescript
  interface BitcoinData { ... }
  interface PriceHistoryItem { ... }
  ```
- [ ] State 변수 정의
  - `data` (데이터)
  - `loading` (로딩 상태)
  - `error` (에러)
  - `lastUpdate` (마지막 업데이트)
  - `autoRefresh` (자동 갱신)
  - `priceHistory` (가격 히스토리)
- [ ] `fetchData` 함수 구현
- [ ] 자동 갱신 로직 구현
  - `startAutoRefresh`
  - `stopAutoRefresh`
  - `toggleAutoRefresh`
- [ ] UI 컴포넌트
  - [ ] 네비게이션 바
  - [ ] 헤더
  - [ ] 컨트롤 버튼
  - [ ] 캐시/Mock 정보 표시
  - [ ] 메인 가격 표시
  - [ ] 통계 그리드 (시가, 고가, 저가, 전일 종가)
  - [ ] 가격 차트 (PriceChart 컴포넌트)
  - [ ] Footer 정보
- [ ] 색상 테마 설정 (gradient, 버튼 색상 등)

**컬러 추천**:

- 금: `amber-*` 🏆
- 나스닥: `indigo-*` 📈
- 달러: `green-*` 💵
- 비트코인: `orange-*` ₿
- 이더리움: `blue-*` Ξ

---

### 3️⃣ DB 테이블 확인

**Supabase SQL Editor 또는 Migration**

- [ ] `asset_type` constraint 확인
  ```sql
  SELECT conname, pg_get_constraintdef(oid) as constraint_def
  FROM pg_constraint
  WHERE conrelid = 'financial_dashboard_prices'::regclass
  AND contype = 'c';
  ```
- [ ] 필요시 `asset_type` 값 추가

  ```sql
  -- Migration 생성
  ALTER TABLE financial_dashboard_prices
  DROP CONSTRAINT IF EXISTS financial_dashboard_prices_asset_type_check;

  ALTER TABLE financial_dashboard_prices
  ADD CONSTRAINT financial_dashboard_prices_asset_type_check
  CHECK (asset_type IN (
    'gold',
    'stock_index',
    'currency_index',
    'cryptocurrency',  -- 새로 추가
    'commodity',
    'currency'
  ));
  ```

**사용 가능한 `asset_type` 값**:

- `gold`: 금, 은 등 귀금속
- `stock_index`: 주식 지수 (나스닥, S&P500 등)
- `currency_index`: 통화 지수 (달러 지수 등)
- `cryptocurrency`: 암호화폐 (비트코인, 이더리움 등)
- `commodity`: 원자재 (원유, 천연가스 등)
- `currency`: 환율 (USD/KRW, EUR/USD 등)

---

### 4️⃣ Supabase Edge Function 업데이트

**Supabase Dashboard > Edge Functions > `update-financial-prices`**

- [ ] Edge Function 코드에 새 데이터 추가

  ```typescript
  // 1. API 호출 함수 추가
  async function updateBitcoin(supabase: any) {
    try {
      console.log('📊 Fetching Bitcoin from API...');
      const data = await fetchBitcoinAPI();

      const { error } = await supabase
        .from('financial_dashboard_prices')
        .insert({
          asset_type: 'cryptocurrency',
          symbol: 'BTC',
          name: 'Bitcoin (BTC)',
          // ... 나머지 필드
        });

      if (error) throw error;
      console.log('✅ Bitcoin saved to database');
      return { price: data.price, ... };
    } catch (error) {
      console.error('❌ Failed to update Bitcoin:', error);
      throw error;
    }
  }

  // 2. 메인 핸들러에 추가
  Deno.serve(async (req) => {
    // ...
    const results: any = {};

    // 기존 데이터
    try { results.gold = await updateGoldPrice(supabase); }
    catch (error) { results.gold = { error: ... }; }

    // 새 데이터 추가
    try { results.bitcoin = await updateBitcoin(supabase); }
    catch (error) { results.bitcoin = { error: ... }; }

    // ...
  });
  ```

- [ ] Edge Function 배포
  - Supabase Dashboard에서 직접 배포 또는
  - Supabase CLI 사용: `supabase functions deploy update-financial-prices`

- [ ] Edge Function 테스트
  ```sql
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/update-financial-prices',
    headers := '{"Authorization": "Bearer [ANON_KEY]"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  ```

---

### 5️⃣ 네비게이션 링크 추가

**모든 페이지 파일 업데이트**

- [ ] `src/routes/+page.svelte` (대시보드 메인)
- [ ] `src/routes/gold/+page.svelte` (금 시세)
- [ ] `src/routes/nasdaq/+page.svelte`
- [ ] `src/routes/dxy/+page.svelte`
- [ ] 새로 만든 페이지

**추가할 코드**:

```svelte
<div class="mb-4 flex flex-wrap justify-center gap-3">
	<a href="/" class="rounded-lg bg-slate-600 ...">💼 대시보드</a>
	<a href="/gold" class="rounded-lg bg-amber-500 ...">🏆 금 시세</a>
	<a href="/nasdaq" class="rounded-lg bg-indigo-500 ...">📈 나스닥 지수</a>
	<a href="/dxy" class="rounded-lg bg-green-500 ...">💵 달러 지수</a>
	<!-- 새 링크 추가 -->
	<a href="/bitcoin" class="rounded-lg bg-orange-500 ...">₿ 비트코인</a>
</div>
```

---

### 6️⃣ 환경변수 설정 (필요시)

**로컬 환경** (`.env` 파일)

- [ ] API 키가 필요한 경우 `.env` 파일에 추가
  ```bash
  # Bitcoin API
  COINMARKETCAP_API_KEY=your_api_key_here
  ```

**Supabase 환경** (Edge Function)

- [ ] Supabase Dashboard > Settings > Edge Functions > Environment Variables
- [ ] 새 환경 변수 추가
  - Key: `COINMARKETCAP_API_KEY`
  - Value: `your_api_key_here`
- [ ] Edge Function 재배포

---

### 7️⃣ 테스트

- [ ] 로컬 개발 서버 실행: `npm run dev`
- [ ] 브라우저에서 새 페이지 접속 (예: `http://localhost:5173/bitcoin`)
- [ ] API 호출 확인 (터미널 로그)
- [ ] DB 저장 확인
  ```sql
  SELECT * FROM financial_dashboard_prices
  WHERE symbol = 'BTC'
  ORDER BY created_at DESC
  LIMIT 5;
  ```
- [ ] 캐싱 동작 확인 (새로고침 후 캐시 표시)
- [ ] 자동 갱신 테스트
- [ ] Edge Function 자동 업데이트 확인 (매일 00시 자동 실행 또는 수동 실행)

---

## 📝 현재 구현된 데이터

| 데이터         | Symbol | Asset Type     | API           | 파일 경로                         |
| -------------- | ------ | -------------- | ------------- | --------------------------------- |
| 💼 대시보드    | -      | -              | -             | `/` (메인, DB 히스토리 차트 표시) |
| 🏆 금 시세     | XAU    | gold           | GoldAPI.io    | `/api/gold`, `/gold`              |
| 📈 나스닥 지수 | NDX    | stock_index    | Yahoo Finance | `/api/nasdaq`, `/nasdaq`          |
| 💵 달러 지수   | DXY    | currency_index | Yahoo Finance | `/api/dxy`, `/dxy`                |

**대시보드 특징**:

- 📊 DB에 저장된 과거 데이터를 활용한 시계열 차트
- 🔄 수동 새로고침 버튼 (자동 갱신 없음)
- 📈 3가지 지수를 정규화하여 한 그래프에 표시
- 💾 `/api/history` 엔드포인트로 히스토리 데이터 조회

---

## 🔧 유용한 명령어

### Supabase SQL 쿼리

```sql
-- 모든 asset_type 확인
SELECT DISTINCT asset_type FROM financial_dashboard_prices;

-- 최근 데이터 확인
SELECT asset_type, symbol, price, created_at
FROM financial_dashboard_prices
ORDER BY created_at DESC
LIMIT 10;

-- 특정 심볼 데이터 확인
SELECT * FROM financial_dashboard_prices
WHERE symbol = 'BTC'
ORDER BY created_at DESC;

-- 캐시 삭제 (테스트용)
DELETE FROM financial_dashboard_prices
WHERE symbol = 'BTC';
```

### API 테스트

```bash
# 로컬 API 테스트
curl http://localhost:5173/api/bitcoin?symbol=BTC

# Supabase Edge Function 수동 실행 (SQL)
SELECT net.http_post(
  url := 'https://[PROJECT_REF].supabase.co/functions/v1/update-financial-prices',
  headers := '{"Authorization": "Bearer [ANON_KEY]"}'::jsonb,
  body := '{}'::jsonb
) AS request_id;
```

---

## 🎨 API 소스 추천

### 무료 API (API 키 불필요)

- **Yahoo Finance**: 주식, 지수, 통화, 암호화폐
  - URL: `https://query1.finance.yahoo.com/v8/finance/chart/[SYMBOL]`
  - 예시: `^NDX` (나스닥), `DX-Y.NYB` (달러 지수), `BTC-USD` (비트코인)

### 무료 API (API 키 필요)

- **Alpha Vantage**: 주식, 환율
  - URL: `https://www.alphavantage.co`
  - 제한: 5 requests/min, 100 requests/day

- **GoldAPI.io**: 귀금속
  - URL: `https://www.goldapi.io`
  - 제한: 플랜에 따라 다름

- **CoinMarketCap**: 암호화폐
  - URL: `https://pro.coinmarketcap.com`
  - 제한: 333 credits/day (Basic)

- **Binance API**: 암호화폐 (무료, API 키 선택)
  - URL: `https://api.binance.com`
  - 제한: 1200 requests/min

---

## ⚠️ 주의사항

1. **서버 자동 수집**: Supabase Edge Function이 **매일 00시**에 자동으로 모든 데이터를 수집합니다
2. **캐시 전략**: API 캐시는 24시간으로 설정 (서버 자동 수집 주기와 일치)
3. **API Rate Limit**: API 제공자의 rate limit을 확인하고 24시간 캐싱이 적절한지 판단
4. **asset_type 제약 조건**: 새 타입 추가 시 반드시 DB constraint 업데이트
5. **환경변수**: Edge Function은 로컬 `.env` 파일을 읽지 못하므로 Supabase Dashboard에서 별도 설정
6. **심볼 이름**: API마다 심볼 표기가 다를 수 있음 (예: `BTC-USD` vs `BTCUSD`)
7. **데이터 형식**: API 응답 구조를 꼼꼼히 확인하고 필드 매핑 정확히 수행

---

## 📚 참고 문서

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/functions/schedule-functions)
- [SvelteKit Routing](https://kit.svelte.dev/docs/routing)
- [Yahoo Finance API 비공식 가이드](https://github.com/ranaroussi/yfinance)

---

---

## 🕐 자동 수집 설정

### Cron Job 현황

- **스케줄**: 매일 00:00 (UTC)
- **실행 함수**: `update-financial-prices-daily`
- **수집 데이터**: 금 시세, 나스닥 지수, 달러 지수

### 과거 데이터 채우기

**스크립트**: `scripts/seed-historical-data.ts`

- Yahoo Finance API에서 실제 과거 데이터 가져오기
- 금 시세는 시뮬레이션 데이터 생성
- 기본 90일치 데이터 생성

**실행 방법**:

```bash
npm run seed:history
```

---

**마지막 업데이트**: 2025-10-02
