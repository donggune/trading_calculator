# Design Document

## Overview

M2 통화 공급량 지표를 BullGaze 플랫폼에 통합하기 위한 기술 설계 문서입니다. 기존 시스템 아키텍처를 최대한 활용하여 일관성 있고 확장 가능한 방식으로 M2 지표를 추가합니다.

**핵심 설계 원칙:**
- 기존 데이터 구조 및 컴포넌트 재사용
- FRED API를 통한 신뢰할 수 있는 데이터 소스 활용
- 다른 자산과 동일한 패턴 및 스타일 유지
- 성능 최적화 및 에러 처리

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    브라우저 (클라이언트)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Dashboard (+page.svelte)                             │  │
│  │  - fetchLatestPrices()                                │  │
│  │  - fetchHistoricalData()                              │  │
│  │  - M2 카드 렌더링 (PriceCard)                          │  │
│  │  - M2 차트 렌더링 (LineChart)                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓ Supabase Client                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  financial_dashboard_prices 테이블                     │  │
│  │  - asset_type: 'economic_indicator'                   │  │
│  │  - symbol: 'M2'                                       │  │
│  │  - 최근 30일 데이터                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↑ Edge Functions                    │
└─────────────────────────────────────────────────────────────┘
                           ↑
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  update-financial-prices                              │  │
│  │  - updateM2MoneySupply()                              │  │
│  │  - FRED API 호출 (최신 2개 데이터)                      │  │
│  │  - 변화량/변화율 계산                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  seed-historical-data                                 │  │
│  │  - M2 심볼 추가                                        │  │
│  │  - FRED API 호출 (최근 30일)                           │  │
│  │  - upsertHistoricalData()                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓ fetch                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  FRED API (Federal Reserve)                  │
│  https://api.stlouisfed.org/fred/series/observations        │
│  - series_id: M2SL                                          │
│  - file_type: json                                          │
└─────────────────────────────────────────────────────────────┘
```


### Data Flow

#### 1. 최신 M2 데이터 수집 (일일 자동 실행)

```
Cron Job (매일 00:00 UTC)
  → update-financial-prices Edge Function 실행
  → updateM2MoneySupply() 호출
  → FRED API 요청 (M2SL, 최근 2개 관측값)
  → 변화량/변화율 계산
  → financial_dashboard_prices 테이블에 INSERT
  → 성공/실패 로그
```

#### 2. M2 과거 데이터 수집 (수동 실행)

```
관리자가 seed-historical-data 실행
  → M2 심볼 처리
  → FRED API 요청 (M2SL, 최근 30일)
  → 각 날짜별 데이터 처리
  → upsertHistoricalData() 호출
  → 중복 체크 (날짜 기준)
  → INSERT 또는 UPDATE
  → 통계 반환 (inserted, updated, errors)
```

#### 3. 대시보드 데이터 로딩

```
사용자가 대시보드 접속
  → fetchLatestPrices() 실행
  → Supabase 쿼리 (모든 자산)
  → 클라이언트에서 심볼별 최신 데이터 추출
  → M2 포함 latestPrices 배열 생성
  → groupedPrices() derived 함수 실행
  → economicIndicators 그룹에 M2 포함
  → PriceCard 렌더링

  → fetchHistoricalData() 실행
  → Supabase 쿼리 (최근 30일)
  → 심볼별 그룹화 (M2 포함)
  → LineChart 렌더링
```

## Components and Interfaces

### 1. Database Schema

#### financial_dashboard_prices 테이블 (기존)

```sql
-- asset_type CHECK 제약조건 업데이트
ALTER TABLE financial_dashboard_prices 
DROP CONSTRAINT IF EXISTS financial_dashboard_prices_asset_type_check;

ALTER TABLE financial_dashboard_prices 
ADD CONSTRAINT financial_dashboard_prices_asset_type_check 
CHECK (asset_type IN (
  'gold',
  'stock_index',
  'currency_index',
  'cryptocurrency',
  'commodity',
  'currency',
  'economic_indicator'  -- 새로 추가
));
```

#### M2 데이터 예시

```json
{
  "id": 12345,
  "asset_type": "economic_indicator",
  "symbol": "M2",
  "name": "M2 Money Supply",
  "currency": "USD",
  "price": 21234.5,  // 십억 달러
  "change": 45.2,     // 전월 대비 변화량
  "change_percent": 0.21,  // 전월 대비 변화율 (%)
  "open": null,
  "high": null,
  "low": null,
  "prev_close": 21189.3,
  "volume": null,
  "extra_data": {},
  "api_source": "fred-api",
  "api_timestamp": "2025-10-09T00:00:00Z",
  "is_mock": false,
  "created_at": "2025-10-09T00:00:00Z",
  "updated_at": "2025-10-09T00:00:00Z"
}
```


### 2. Edge Function: update-financial-prices

#### updateM2MoneySupply 함수 추가

```typescript
// FRED API 설정
const FRED_API_KEY = Deno.env.get('FRED_API_KEY');
const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';

async function updateM2MoneySupply(supabase) {
  try {
    console.log('📊 Fetching M2 Money Supply from FRED API...');
    
    if (!FRED_API_KEY) {
      throw new Error('FRED_API_KEY not found in environment variables');
    }

    // FRED API 요청 (최근 2개 관측값)
    const url = `${FRED_API_URL}?series_id=M2SL&api_key=${FRED_API_KEY}&file_type=json&limit=2&sort_order=desc`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FRED API responded with status ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.observations || result.observations.length < 2) {
      throw new Error('Insufficient M2 data from FRED API');
    }

    // 최신 2개 데이터 (내림차순이므로 [0]이 최신)
    const latest = result.observations[0];
    const previous = result.observations[1];

    const latestValue = parseFloat(latest.value);
    const previousValue = parseFloat(previous.value);

    // 변화량 및 변화율 계산
    const change = roundToTwo(latestValue - previousValue);
    const changePercent = roundToTwo((change / previousValue) * 100);

    // 데이터베이스에 저장
    const { error } = await supabase
      .from('financial_dashboard_prices')
      .insert({
        asset_type: 'economic_indicator',
        symbol: 'M2',
        name: 'M2 Money Supply',
        currency: 'USD',
        price: roundToTwo(latestValue),
        change: change,
        change_percent: changePercent,
        prev_close: roundToTwo(previousValue),
        extra_data: {
          observation_date: latest.date,
          unit: 'Billions of Dollars'
        },
        api_source: 'fred-api',
        api_timestamp: new Date().toISOString(),
        is_mock: false
      });

    if (error) throw error;

    console.log('✅ M2 Money Supply saved to database');
    
    return {
      price: roundToTwo(latestValue),
      change: change,
      changePercent: changePercent,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update M2 Money Supply:', error);
    throw error;
  }
}
```

#### 메인 핸들러에 추가

```typescript
// 메인 핸들러 내부
try {
  results.m2MoneySupply = await updateM2MoneySupply(supabase);
} catch (error) {
  results.m2MoneySupply = {
    error: error instanceof Error ? error.message : 'Failed'
  };
}
```


### 3. Edge Function: seed-historical-data

#### SYMBOLS 배열에 M2 추가

```typescript
const SYMBOLS = [
  // ... 기존 심볼들 ...
  {
    symbol: 'M2SL',  // FRED 시리즈 ID
    dbSymbol: 'M2',
    name: 'M2 Money Supply',
    assetType: 'economic_indicator',
    currency: 'USD',
    apiType: 'fred'  // 새로운 필드: API 타입 구분
  }
];
```

#### FRED API 데이터 가져오기 함수

```typescript
async function fetchFREDHistoricalData(seriesId, days = 30) {
  console.log(`📊 Fetching ${days} days of FRED data for ${seriesId}...`);
  
  const FRED_API_KEY = Deno.env.get('FRED_API_KEY');
  if (!FRED_API_KEY) {
    throw new Error('FRED_API_KEY not found');
  }

  // 날짜 계산
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDateStr}&observation_end=${endDateStr}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API responded with status ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.observations) {
    throw new Error(`No data returned for ${seriesId}`);
  }

  // FRED 데이터를 Yahoo Finance 형식으로 변환
  return {
    timestamps: result.observations.map(obs => 
      Math.floor(new Date(obs.date).getTime() / 1000)
    ),
    close: result.observations.map(obs => parseFloat(obs.value)),
    // FRED는 일일 OHLV 데이터가 없으므로 close 값으로 대체
    open: result.observations.map(obs => parseFloat(obs.value)),
    high: result.observations.map(obs => parseFloat(obs.value)),
    low: result.observations.map(obs => parseFloat(obs.value)),
    volume: result.observations.map(() => 0)
  };
}
```

#### 심볼별 데이터 수집 함수 수정

```typescript
async function seedHistoricalDataForSymbol(
  supabase, 
  yahooSymbol, 
  dbSymbol, 
  name, 
  assetType, 
  currency, 
  days = 90,
  apiType = 'yahoo'  // 기본값: yahoo
) {
  try {
    console.log(`\n🔄 Starting data collection for ${name}...`);
    
    let historicalData;
    
    // API 타입에 따라 다른 함수 호출
    if (apiType === 'fred') {
      historicalData = await fetchFREDHistoricalData(yahooSymbol, days);
    } else {
      historicalData = await fetchHistoricalData(yahooSymbol, days);
    }

    const { timestamps, open, high, low, close, volume } = historicalData;

    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < timestamps.length; i++) {
      if (close[i] === null || close[i] === undefined || isNaN(close[i])) {
        continue;
      }

      const result = await upsertHistoricalData(
        supabase,
        dbSymbol,
        name,
        assetType,
        currency,
        timestamps[i],
        open[i],
        high[i],
        low[i],
        close[i],
        volume[i]
      );

      if (result === 'inserted') {
        insertCount++;
      } else if (result === 'updated') {
        updateCount++;
      } else {
        errorCount++;
      }

      // API 요청 제한 방지
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ ${name}: ${insertCount} inserted, ${updateCount} updated, ${errorCount} errors`);
    
    return {
      symbol: dbSymbol,
      name,
      insertCount,
      updateCount,
      errorCount
    };
  } catch (error) {
    console.error(`❌ Failed to seed data for ${name}:`, error);
    return {
      symbol: dbSymbol,
      name,
      insertCount: 0,
      updateCount: 0,
      errorCount: 1,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

#### 메인 핸들러 수정

```typescript
for (const item of SYMBOLS) {
  const result = await seedHistoricalDataForSymbol(
    supabase,
    item.symbol,
    item.dbSymbol,
    item.name,
    item.assetType,
    item.currency,
    item.apiType === 'fred' ? 30 : 90,  // M2는 30일, 나머지는 90일
    item.apiType || 'yahoo'
  );
  results.push(result);
  
  // 심볼 간 대기
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```


### 4. Frontend: Dashboard UI

#### assetTypeMap 업데이트

```typescript
const assetTypeMap = {
  stockIndices: new Set(['SPX', 'IXIC', 'N225', 'RUT', 'NQ']),
  commodities: new Set(['GC', 'CL', 'GOLD', 'OIL']),
  bonds: new Set(['TNX', 'TREASURY', 'BOND']),
  currencies: new Set(['DXY', 'USD', 'USDKRW', '6J', '6E', 'KRW', 'JPY', 'EUR']),
  economicIndicators: new Set(['M2'])  // 새로 추가
};
```

#### getAssetType 함수 업데이트

```typescript
function getAssetType(symbol: string): keyof typeof assetTypeMap | 'stockIndices' {
  const upperSymbol = symbol.toUpperCase();

  // 정확한 매칭
  for (const [type, symbols] of Object.entries(assetTypeMap)) {
    if (symbols.has(upperSymbol)) {
      return type as keyof typeof assetTypeMap;
    }
  }

  // 부분 매칭 (하위 호환성)
  if (upperSymbol.includes('M2')) {
    return 'economicIndicators';
  }
  
  // ... 기존 로직 ...

  return 'stockIndices';
}
```

#### groupedPrices derived 함수 업데이트

```typescript
const groupedPrices = $derived(() => {
  const groups = {
    stockIndices: [] as FinancialPrice[],
    currencies: [] as FinancialPrice[],
    commodities: [] as FinancialPrice[],
    bonds: [] as FinancialPrice[],
    economicIndicators: [] as FinancialPrice[]  // 새로 추가
  };

  latestPrices.forEach((price) => {
    const type = getAssetType(price.symbol);
    groups[type].push(price);
  });

  // ... 기존 정렬 로직 ...

  // 경제 지표는 심볼순으로 정렬
  groups.economicIndicators.sort((a, b) => a.symbol.localeCompare(b.symbol));

  return groups;
});
```

#### M2 차트 데이터 생성

```typescript
const m2ChartData = $derived(() =>
  createChartData(
    'M2',
    'M2 Money Supply',
    'rgb(139, 92, 246)',  // 보라색
    'rgba(139, 92, 246, 0.1)'
  )
);
```

#### 대시보드 렌더링 (경제 지표 섹션 추가)

```svelte
<!-- 주식 지수 섹션 -->
{#if groupedPrices().stockIndices.length > 0}
  <article class="asset-group" aria-labelledby="stock-indices-title">
    <h3 id="stock-indices-title" class="group-title">📈 주식 지수</h3>
    <div class="price-cards">
      {#each groupedPrices().stockIndices as price}
        <PriceCard {...price} />
      {/each}
    </div>
  </article>
{/if}

<!-- 경제 지표 섹션 (새로 추가) -->
{#if groupedPrices().economicIndicators.length > 0}
  <article class="asset-group" aria-labelledby="economic-indicators-title">
    <h3 id="economic-indicators-title" class="group-title">📊 경제 지표</h3>
    <div class="price-cards">
      {#each groupedPrices().economicIndicators as price}
        <PriceCard
          name={price.name}
          symbol={price.symbol}
          price={Number(price.price)}
          currency={price.currency}
          change24h={price.change ? Number(price.change) : undefined}
          changePercent={price.change_percent ? Number(price.change_percent) : undefined}
        />
      {/each}
    </div>
  </article>
{/if}

<!-- 환율 섹션 -->
{#if groupedPrices().currencies.length > 0}
  <!-- ... -->
{/if}
```

#### M2 차트 렌더링

```svelte
<!-- 경제 지표 차트 -->
{#if historicalData['M2']?.length}
  <div class="chart-wrapper" id="chart-M2">
    <LineChart
      labels={m2ChartData().labels}
      datasets={m2ChartData().datasets}
      title="M2 통화 공급량 (M2) 추이"
      currentPrice={getCurrentPrice('M2')}
      currency={getCurrency('M2')}
    />
  </div>
{/if}
```


## Data Models

### TypeScript Interfaces

#### FinancialPrice (기존 - 변경 없음)

```typescript
export interface FinancialPrice {
  id: number;
  asset_type: 'gold' | 'stock_index' | 'currency_index' | 'cryptocurrency' | 'commodity' | 'currency' | 'economic_indicator';
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change?: number;
  change_percent?: number;
  open?: number;
  high?: number;
  low?: number;
  prev_close?: number;
  volume?: number;
  extra_data?: Record<string, any>;
  api_source?: string;
  api_timestamp?: string;
  is_mock?: boolean;
  created_at: string;
  updated_at: string;
}
```

### FRED API Response

#### Series Observations Response

```typescript
interface FREDObservationsResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: Array<{
    realtime_start: string;
    realtime_end: string;
    date: string;  // YYYY-MM-DD
    value: string;  // 숫자를 문자열로 반환
  }>;
}
```

#### 예시 응답

```json
{
  "realtime_start": "2025-10-09",
  "realtime_end": "2025-10-09",
  "observation_start": "2025-09-01",
  "observation_end": "2025-10-09",
  "units": "lin",
  "output_type": 1,
  "file_type": "json",
  "order_by": "observation_date",
  "sort_order": "desc",
  "count": 2,
  "offset": 0,
  "limit": 2,
  "observations": [
    {
      "realtime_start": "2025-10-09",
      "realtime_end": "2025-10-09",
      "date": "2025-09-01",
      "value": "21234.5"
    },
    {
      "realtime_start": "2025-10-09",
      "realtime_end": "2025-10-09",
      "date": "2025-08-01",
      "value": "21189.3"
    }
  ]
}
```

## Error Handling

### Edge Function Error Handling

#### 1. FRED API 에러

```typescript
// API 키 누락
if (!FRED_API_KEY) {
  throw new Error('FRED_API_KEY not found in environment variables');
}

// HTTP 에러
if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`FRED API error (${response.status}): ${errorText}`);
}

// 데이터 부족
if (!result.observations || result.observations.length < 2) {
  throw new Error('Insufficient M2 data from FRED API');
}

// 잘못된 데이터 형식
const latestValue = parseFloat(latest.value);
if (isNaN(latestValue)) {
  throw new Error('Invalid M2 value from FRED API');
}
```

#### 2. 데이터베이스 에러

```typescript
const { error } = await supabase
  .from('financial_dashboard_prices')
  .insert({...});

if (error) {
  console.error('Database error:', error);
  throw new Error(`Failed to save M2 data: ${error.message}`);
}
```

#### 3. 메인 핸들러 에러 처리

```typescript
try {
  results.m2MoneySupply = await updateM2MoneySupply(supabase);
} catch (error) {
  console.error('❌ M2 update failed:', error);
  results.m2MoneySupply = {
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date().toISOString()
  };
  // 다른 자산 업데이트는 계속 진행
}
```

### Frontend Error Handling

#### 1. 데이터 로딩 에러

```typescript
async function fetchLatestPrices() {
  try {
    const { data, error: fetchError } = await supabase
      .from('financial_dashboard_prices')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    // M2 데이터가 없어도 에러로 처리하지 않음
    latestPrices = Array.from(latestMap.values());
    lastUpdated = new Date();
  } catch (e) {
    error = e instanceof Error ? e.message : '데이터를 불러오는데 실패했습니다.';
    console.error('Failed to fetch prices:', e);
  }
}
```

#### 2. 차트 렌더링 에러

```svelte
<!-- M2 데이터가 없으면 차트를 표시하지 않음 -->
{#if historicalData['M2']?.length}
  <div class="chart-wrapper" id="chart-M2">
    <LineChart {...} />
  </div>
{/if}
```


## Testing Strategy

### 1. Edge Function Testing

#### update-financial-prices 테스트

```bash
# Supabase CLI로 로컬 테스트
supabase functions serve update-financial-prices

# cURL로 테스트
curl -X POST http://localhost:54321/functions/v1/update-financial-prices \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# 예상 응답 확인
# - results.m2MoneySupply.price 존재
# - results.m2MoneySupply.change 존재
# - results.m2MoneySupply.changePercent 존재
```

#### seed-historical-data 테스트

```bash
# Supabase CLI로 로컬 테스트
supabase functions serve seed-historical-data

# cURL로 테스트
curl -X POST http://localhost:54321/functions/v1/seed-historical-data \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# 예상 응답 확인
# - M2 심볼이 results 배열에 포함
# - insertCount > 0 또는 updateCount > 0
# - errorCount = 0
```

### 2. Database Testing

```sql
-- M2 데이터 확인
SELECT * FROM financial_dashboard_prices 
WHERE symbol = 'M2' 
ORDER BY created_at DESC 
LIMIT 10;

-- asset_type 제약조건 확인
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%asset_type%';

-- M2 데이터 개수 확인
SELECT COUNT(*) FROM financial_dashboard_prices 
WHERE symbol = 'M2';
```

### 3. Frontend Testing

#### 수동 테스트 체크리스트

- [ ] 대시보드 로딩 시 M2 카드 표시 확인
- [ ] M2 카드에 가격, 변화량, 변화율 표시 확인
- [ ] M2 차트 렌더링 확인
- [ ] M2 차트에 최근 30일 데이터 표시 확인
- [ ] 모바일 반응형 레이아웃 확인
- [ ] 경제 지표 섹션 순서 확인 (주식 지수 다음)
- [ ] 에러 처리 확인 (M2 데이터 없을 때)

#### 브라우저 콘솔 확인

```javascript
// 개발자 도구 콘솔에서 확인
console.log('Latest Prices:', latestPrices);
console.log('M2 Data:', latestPrices.find(p => p.symbol === 'M2'));
console.log('Historical Data:', historicalData['M2']);
console.log('Grouped Prices:', groupedPrices());
```

### 4. Integration Testing

#### E2E 테스트 (Playwright)

```typescript
// tests/m2-indicator.spec.ts
import { test, expect } from '@playwright/test';

test('M2 indicator displays on dashboard', async ({ page }) => {
  await page.goto('/');
  
  // 경제 지표 섹션 확인
  const economicSection = page.locator('text=📊 경제 지표');
  await expect(economicSection).toBeVisible();
  
  // M2 카드 확인
  const m2Card = page.locator('text=M2 Money Supply');
  await expect(m2Card).toBeVisible();
  
  // M2 차트 확인
  const m2Chart = page.locator('#chart-M2');
  await expect(m2Chart).toBeVisible();
});

test('M2 indicator shows correct data format', async ({ page }) => {
  await page.goto('/');
  
  // M2 가격 형식 확인 (십억 달러)
  const priceElement = page.locator('[data-testid="m2-price"]');
  const priceText = await priceElement.textContent();
  expect(priceText).toMatch(/\d{1,3}(,\d{3})*(\.\d{1,2})?/);
  
  // 변화율 색상 확인
  const changeElement = page.locator('[data-testid="m2-change-percent"]');
  const color = await changeElement.evaluate(el => 
    window.getComputedStyle(el).color
  );
  // 초록색 또는 빨간색
  expect(['rgb(16, 185, 129)', 'rgb(239, 68, 68)']).toContain(color);
});
```

## Performance Considerations

### 1. API 호출 최적화

#### FRED API Rate Limits

- **무료 플랜**: 120 requests/minute
- **일일 업데이트**: 1 request/day (충분함)
- **과거 데이터 수집**: 1 request (30일 데이터 한 번에 가져옴)

#### 캐싱 전략

```typescript
// 클라이언트 캐싱 (기존 시스템 활용)
const dateFormatCache = new Map<string, string>();

// Supabase 쿼리 최적화 (기존 시스템 활용)
// - 최근 30일 데이터만 조회
// - 인덱스 활용 (symbol, created_at, asset_type)
```

### 2. 데이터베이스 최적화

#### 인덱스 활용 (기존)

```sql
-- 이미 존재하는 인덱스 활용
CREATE INDEX idx_symbol ON financial_dashboard_prices(symbol);
CREATE INDEX idx_created_at ON financial_dashboard_prices(created_at);
CREATE INDEX idx_asset_type ON financial_dashboard_prices(asset_type);
```

#### 쿼리 최적화

```typescript
// 최근 30일 데이터만 조회
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data } = await supabase
  .from('financial_dashboard_prices')
  .select('*')
  .gte('created_at', thirtyDaysAgo.toISOString())
  .order('created_at', { ascending: true });
```

### 3. 프론트엔드 최적화

#### Svelte 5 Runes 활용

```typescript
// $derived: 자동 재계산 (메모이제이션)
const m2ChartData = $derived(() => createChartData('M2', ...));

// $state: 반응형 상태 관리
let latestPrices = $state<FinancialPrice[]>([]);

// $effect: 사이드 이펙트 관리
$effect(() => {
  if (latestPrices.length > 0) {
    console.log('Prices updated');
  }
});
```

#### 불필요한 재렌더링 방지

```svelte
<!-- 조건부 렌더링으로 불필요한 컴포넌트 생성 방지 -->
{#if groupedPrices().economicIndicators.length > 0}
  <article class="asset-group">
    <!-- ... -->
  </article>
{/if}
```

## Security Considerations

### 1. API 키 보안

```typescript
// ✅ 올바른 방법: 환경 변수 사용
const FRED_API_KEY = Deno.env.get('FRED_API_KEY');

// ❌ 잘못된 방법: 하드코딩
// const FRED_API_KEY = 'abc123...';
```

### 2. SQL Injection 방지

```typescript
// ✅ Supabase 클라이언트 사용 (자동 이스케이핑)
await supabase
  .from('financial_dashboard_prices')
  .insert({ symbol: 'M2', ... });

// ❌ 직접 SQL 쿼리 작성 금지
```

### 3. CORS 설정

```typescript
// Edge Function에서 CORS 헤더 설정 (기존 패턴 유지)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
```

### 4. Rate Limiting

```typescript
// FRED API Rate Limit 준수
// - 요청 간 1초 대기 (seed-historical-data)
await new Promise(resolve => setTimeout(resolve, 1000));

// - 에러 발생 시 재시도하지 않음
catch (error) {
  console.error('FRED API error:', error);
  // 재시도 로직 없음
}
```

## Deployment

### 1. Database Migration

```bash
# 마이그레이션 파일 생성
supabase migration new add_economic_indicator_asset_type

# 마이그레이션 실행
supabase db push

# 프로덕션 배포
# Supabase Dashboard > Database > Migrations > Run migration
```

### 2. Edge Functions Deployment

```bash
# update-financial-prices 배포
supabase functions deploy update-financial-prices

# seed-historical-data 배포
supabase functions deploy seed-historical-data

# 환경 변수 설정 (Supabase Dashboard)
# Settings > Edge Functions > Environment Variables
# FRED_API_KEY=your_api_key_here
```

### 3. Frontend Deployment

```bash
# 로컬 테스트
npm run dev

# 빌드
npm run build

# Vercel 배포 (자동)
git push origin main
```

### 4. 배포 후 확인 사항

- [ ] 데이터베이스 마이그레이션 성공 확인
- [ ] Edge Functions 배포 성공 확인
- [ ] 환경 변수 설정 확인
- [ ] update-financial-prices 수동 실행 테스트
- [ ] seed-historical-data 수동 실행 테스트
- [ ] 프로덕션 대시보드에서 M2 카드 확인
- [ ] 프로덕션 대시보드에서 M2 차트 확인
- [ ] 모바일 반응형 확인
- [ ] 브라우저 콘솔 에러 확인

## Monitoring and Maintenance

### 1. 로그 모니터링

```bash
# Edge Function 로그 확인
supabase functions logs update-financial-prices
supabase functions logs seed-historical-data

# 확인 사항:
# - FRED API 호출 성공/실패
# - 데이터베이스 저장 성공/실패
# - 에러 메시지
```

### 2. 데이터 품질 모니터링

```sql
-- M2 데이터 최신성 확인
SELECT MAX(created_at) as last_update 
FROM financial_dashboard_prices 
WHERE symbol = 'M2';

-- M2 데이터 개수 확인 (최근 30일)
SELECT COUNT(*) as data_count 
FROM financial_dashboard_prices 
WHERE symbol = 'M2' 
AND created_at >= NOW() - INTERVAL '30 days';

-- M2 데이터 이상치 확인
SELECT * FROM financial_dashboard_prices 
WHERE symbol = 'M2' 
AND (price < 10000 OR price > 50000)  -- 비정상 범위
ORDER BY created_at DESC;
```

### 3. 알림 설정

- FRED API 호출 실패 시 알림
- 데이터베이스 저장 실패 시 알림
- M2 데이터 24시간 이상 업데이트 안 될 시 알림

## Future Enhancements

### Phase 2 (향후 개선)

1. **추가 경제 지표**
   - M1 통화 공급량
   - GDP 성장률
   - 실업률
   - CPI (소비자물가지수)
   - PPI (생산자물가지수)

2. **고급 분석 기능**
   - M2와 주식 시장 상관관계 분석
   - M2 변화율 예측 모델
   - M2 기반 투자 신호 생성

3. **알림 기능**
   - M2 급격한 변화 시 알림
   - 사용자 정의 임계값 설정

4. **데이터 내보내기**
   - CSV 다운로드
   - Excel 내보내기
   - API 엔드포인트 제공
