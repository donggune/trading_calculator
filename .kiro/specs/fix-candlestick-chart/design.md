# Design Document

## Overview

Lightweight Charts 라이브러리를 사용한 실시간 캔들차트 컴포넌트의 초기화 타이밍 문제를 해결합니다. 핵심 문제는 Svelte 5의 라이프사이클에서 DOM 바인딩이 `onMount` 이후에 발생하여 차트 초기화가 실패하는 것입니다.

## Architecture

### 컴포넌트 구조

```
RealtimeCandlestickChart.svelte
├── State Management (Svelte 5 Runes)
├── Chart Initialization (Lightweight Charts)
├── Data Loading (API calls)
├── Real-time Updates (Polling)
└── UI (Controls + Chart Container)
```

### 초기화 흐름

```
1. Component Mount
   ↓
2. Render DOM (including chartContainer)
   ↓
3. $effect triggers when chartContainer is bound
   ↓
4. Initialize Lightweight Charts
   ↓
5. Load data from API
   ↓
6. Display chart
```

## Components and Interfaces

### 1. Chart Initialization Strategy

**문제**: `bind:this`가 `onMount` 시점에 아직 설정되지 않음

**해결책**: Svelte 5의 `$effect` 사용

```typescript
let chartContainer = $state<HTMLDivElement>();
let chart: IChartApi | null = null;
let candlestickSeries: any = null;

// chartContainer가 바인딩되면 자동으로 실행
$effect(() => {
  if (chartContainer && !chart) {
    initializeChart();
  }
});

function initializeChart() {
  chart = createChart(chartContainer!, {
    // options
  });
  
  candlestickSeries = chart.addCandlestickSeries({
    // options
  });
  
  // 초기화 완료 후 데이터 로드
  loadData();
}
```

### 2. Data Loading

```typescript
async function loadData() {
  loading = true;
  error = null;
  
  try {
    const candles = await fetchCandlesWithCache(symbol, interval, '1d');
    
    if (candlestickSeries) {
      candlestickSeries.setData(candles);
      currentPrice = candles[candles.length - 1].close;
    }
  } catch (e) {
    error = e.message;
  } finally {
    loading = false;
  }
}
```

### 3. Real-time Updates

```typescript
function startRealtime() {
  const pollingInterval = interval === '1m' ? 10000 : 60000;
  
  stopPolling = startRealtimePolling(
    symbol,
    interval,
    pollingInterval,
    (candles) => {
      if (candlestickSeries && candles.length > 0) {
        const lastCandle = candles[candles.length - 1];
        candlestickSeries.update(lastCandle);
        currentPrice = lastCandle.close;
        lastUpdate = new Date();
      }
    }
  );
}
```

## Data Models

### CandleData

```typescript
interface CandleData {
  time: number;        // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
```

### Component Props

```typescript
interface Props {
  symbol: string;      // 예: 'NQ=F'
  title?: string;      // 차트 제목
  interval?: string;   // '1m' | '5m' | '15m' | '1h' | '1d'
  realtime?: boolean;  // 자동 실시간 시작 여부
}
```

### Component State

```typescript
// Chart instances
let chartContainer = $state<HTMLDivElement>();
let chart: IChartApi | null = null;
let candlestickSeries: any = null;

// UI state
let loading = $state(true);
let error = $state<string | null>(null);
let isLive = $state(false);
let currentPrice = $state<number | null>(null);
let lastUpdate = $state<Date | null>(null);
let selectedInterval = $state(interval);

// Cleanup
let stopPolling: (() => void) | null = null;
```

## Error Handling

### 1. Chart Initialization Errors

```typescript
function initializeChart() {
  try {
    if (!chartContainer) {
      throw new Error('Chart container not found');
    }
    
    chart = createChart(chartContainer, options);
    candlestickSeries = chart.addCandlestickSeries(seriesOptions);
    
    loadData();
  } catch (e) {
    error = '차트 초기화에 실패했습니다: ' + e.message;
    loading = false;
  }
}
```

### 2. Data Loading Errors

```typescript
async function loadData() {
  try {
    const candles = await fetchCandlesWithCache(symbol, interval, '1d');
    
    if (candles.length === 0) {
      throw new Error('데이터가 없습니다');
    }
    
    candlestickSeries.setData(candles);
  } catch (e) {
    error = e.message;
    // 재시도 버튼 제공
  }
}
```

### 3. API Errors

```typescript
// src/lib/api/candles.ts
export async function fetchYahooCandles(symbol, interval, range) {
  try {
    const response = await fetch(`/api/candles/${symbol}?interval=${interval}&range=${range}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API 호출 실패');
    }
    
    return data.candles;
  } catch (e) {
    console.error('API Error:', e);
    throw e;
  }
}
```

## Testing Strategy

### Unit Tests

1. **Chart Initialization**
   - `chartContainer`가 없을 때 에러 처리
   - 차트 생성 성공 확인
   - 캔들스틱 시리즈 추가 확인

2. **Data Loading**
   - API 호출 성공 시나리오
   - API 호출 실패 시나리오
   - 빈 데이터 처리

3. **Real-time Updates**
   - 폴링 시작/중지
   - 데이터 업데이트
   - 에러 처리

### Integration Tests

1. **Component Lifecycle**
   - 마운트 → 초기화 → 데이터 로드 → 표시
   - 언마운트 시 정리 (cleanup)

2. **User Interactions**
   - 타임프레임 변경
   - 실시간 토글
   - 재시도 버튼

### Manual Tests

1. 페이지 로드 시 차트 표시 확인
2. 타임프레임 전환 확인
3. 실시간 업데이트 확인
4. 에러 시나리오 확인 (네트워크 끊김 등)

## Performance Considerations

### 1. API Caching

```typescript
const cache = new Map<string, { data: CandleData[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1분

export async function fetchCandlesWithCache(symbol, interval, range) {
  const cacheKey = `${symbol}-${interval}-${range}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchYahooCandles(symbol, interval, range);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

### 2. Chart Rendering

- Lightweight Charts는 Canvas 기반으로 성능 우수
- 데이터 포인트 수 제한 (최대 1000개)
- 불필요한 리렌더링 방지

### 3. Memory Management

```typescript
onDestroy(() => {
  // 폴링 중지
  if (stopPolling) {
    stopPolling();
  }
  
  // 차트 인스턴스 제거
  if (chart) {
    chart.remove();
  }
  
  // 참조 해제
  chart = null;
  candlestickSeries = null;
});
```

## Deployment Considerations

### Environment Variables

```bash
# .env.local
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
```

### Build Configuration

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter()
  }
};
```

### Browser Compatibility

- Chrome/Edge: ✅ 완전 지원
- Firefox: ✅ 완전 지원
- Safari: ✅ 완전 지원
- IE11: ❌ 미지원 (Canvas API 필요)

## Security Considerations

1. **API Rate Limiting**: 클라이언트 캐싱으로 과도한 요청 방지
2. **CORS**: 서버 사이드 API 라우트로 우회
3. **XSS**: Svelte의 자동 이스케이프 활용
4. **Input Validation**: 심볼 및 인터벌 파라미터 검증

## Monitoring and Logging

### Console Logging

```typescript
// Development only
if (import.meta.env.DEV) {
  console.log('📈 Chart initialized');
  console.log('✅ Data loaded:', candles.length);
}
```

### Error Tracking

```typescript
function handleError(error: Error, context: string) {
  console.error(`[${context}]`, error);
  
  // Production: Send to error tracking service
  if (import.meta.env.PROD) {
    // Sentry, LogRocket, etc.
  }
}
```
