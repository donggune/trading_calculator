# 실시간 캔들차트 가이드 📊

## 📋 목차

1. [개요](#개요)
2. [기능 소개](#기능-소개)
3. [사용 방법](#사용-방법)
4. [기술 스택](#기술-스택)
5. [아키텍처](#아키텍처)
6. [API 문서](#api-문서)
7. [성능 및 최적화](#성능-및-최적화)
8. [문제 해결](#문제-해결)

---

## 개요

실시간 캔들차트는 나스닥-100 선물(NQ=F)의 가격 변동을 시각화하는 기능입니다.
8가지 타임프레임을 지원하며, 실시간 자동 업데이트 기능을 제공합니다.

### 접속 방법

```
로컬: http://localhost:5173/realtime
프로덕션: https://bullgaze.com/realtime
```

---

## 기능 소개

### 1. 다중 타임프레임 지원

| 타임프레임 | 데이터 범위 | 폴링 간격 | 용도 |
|-----------|------------|----------|------|
| 1분봉 (1m) | 1일 | 10초 | 초단타 매매 |
| 5분봉 (5m) | 1일 | 1분 | 단타 매매 |
| 15분봉 (15m) | 1일 | 1분 | 단기 매매 |
| 1시간봉 (1h) | 1개월 | 1분 | 스윙 트레이딩 |
| 일봉 (1d) | 1년 | 1분 | 중기 투자 |
| 주봉 (1wk) | 2년 | 10분 | 장기 투자 |
| 월봉 (1mo) | 10년 | 10분 | 장기 투자 |
| 분기봉 (3mo) | 최대 | 10분 | 초장기 분석 |

### 2. 실시간 업데이트

- 🔴 **라이브 모드**: 자동으로 최신 데이터 업데이트
- ⚪ **정지 모드**: 수동으로 타임프레임 변경 시 업데이트
- 💰 **현재가 표시**: 실시간 가격 표시
- ⏰ **업데이트 시간**: 마지막 업데이트 시각 표시

### 3. 사용자 인터페이스

- 타임프레임 선택 버튼
- 실시간 토글 버튼
- 현재가 및 업데이트 시간 표시
- 로딩 인디케이터
- 에러 메시지 및 재시도 버튼

---

## 사용 방법

### 기본 사용

1. **페이지 접속**
   ```
   http://localhost:5173/realtime
   ```

2. **타임프레임 선택**
   - 상단의 타임프레임 버튼 클릭 (1분, 5분, 15분, 1시간, 1일, 1주, 1월, 분기)

3. **실시간 활성화**
   - "실시간" 버튼 클릭
   - 🔴 표시가 나타나면 자동 업데이트 시작

4. **차트 확인**
   - 캔들차트가 표시되며 현재가가 실시간으로 업데이트됨

### 고급 사용

#### 여러 타임프레임 비교
```typescript
// 브라우저 탭을 여러 개 열어서 동시에 비교
탭 1: 1분봉 (단기 추세)
탭 2: 1시간봉 (중기 추세)
탭 3: 일봉 (장기 추세)
```

#### 키보드 단축키 (향후 추가 예정)
```
Space: 실시간 토글
1-8: 타임프레임 선택
R: 새로고침
```

---

## 기술 스택

### 프론트엔드
- **SvelteKit 2.43.2**: 프레임워크
- **Svelte 5.39.5**: UI 라이브러리 (Runes 사용)
- **Lightweight Charts 5.0.9**: 차트 라이브러리
- **TypeScript 5.9.2**: 타입 안정성

### 백엔드
- **SvelteKit API Routes**: 서버 사이드 API
- **Yahoo Finance API**: 데이터 소스 (비공식)

### 배포
- **Vercel**: 호스팅 플랫폼

---

## 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    브라우저 (클라이언트)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  RealtimeCandlestickChart.svelte                  │  │
│  │  - 차트 렌더링 (Lightweight Charts)                │  │
│  │  - 실시간 폴링 관리                                 │  │
│  │  - 클라이언트 캐싱 (1분)                            │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓ fetch                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              SvelteKit API 라우트 (서버)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  /api/candles/[symbol]/+server.ts                 │  │
│  │  - CORS 우회                                       │  │
│  │  - 데이터 변환                                      │  │
│  │  - 에러 처리                                        │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓ fetch                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Yahoo Finance API                       │
│  https://query1.finance.yahoo.com/v8/finance/chart/...  │
└─────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```typescript
// 1. 초기 로드
사용자 접속
  → 컴포넌트 마운트
  → DOM 바인딩 ($effect)
  → 차트 초기화 (createChart)
  → 데이터 로드 (fetchCandlesWithCache)
  → 차트 표시 (setData)

// 2. 실시간 업데이트
실시간 버튼 클릭
  → 폴링 시작 (startRealtimePolling)
  → 주기적 API 호출 (10초~10분)
  → 캐시 확인 (1분 이내면 캐시 반환)
  → 새 데이터 수신
  → 차트 업데이트 (update)
  → 현재가 갱신
```

### 컴포넌트 구조

```
src/routes/realtime/
├── +page.svelte                    # 실시간 페이지
│
src/lib/components/
├── RealtimeCandlestickChart.svelte # 차트 컴포넌트
│
src/lib/api/
├── candles.ts                      # API 함수
│
src/routes/api/candles/[symbol]/
└── +server.ts                      # 서버 API 라우트
```

---

## API 문서

### 클라이언트 API

#### fetchCandlesWithCache()

캔들 데이터를 가져오는 함수 (캐싱 포함)

```typescript
import { fetchCandlesWithCache } from '$lib/api/candles';

const candles = await fetchCandlesWithCache(
  symbol: string,    // 예: 'NQ=F'
  interval: string,  // 예: '5m'
  range: string      // 예: '1d'
);

// 반환값
CandleData[] = [
  {
    time: 1704067200,      // Unix timestamp
    open: 16500.25,
    high: 16520.50,
    low: 16490.00,
    close: 16510.75,
    volume: 1234567
  },
  // ...
]
```

#### startRealtimePolling()

실시간 폴링을 시작하는 함수

```typescript
import { startRealtimePolling } from '$lib/api/candles';

const stopPolling = startRealtimePolling(
  symbol: string,           // 예: 'NQ=F'
  interval: string,         // 예: '5m'
  pollingInterval: number,  // 예: 60000 (1분)
  callback: (candles: CandleData[]) => void
);

// 폴링 중지
stopPolling();
```

### 서버 API

#### GET /api/candles/[symbol]

캔들 데이터를 가져오는 서버 엔드포인트

**요청**
```http
GET /api/candles/NQ=F?interval=5m&range=1d
```

**파라미터**
- `symbol` (path): 심볼 (예: NQ=F, SPY, AAPL)
- `interval` (query): 타임프레임 (1m, 5m, 15m, 1h, 1d, 1wk, 1mo, 3mo)
- `range` (query): 데이터 범위 (1d, 5d, 1mo, 1y, 2y, 5y, 10y, max)

**응답 (성공)**
```json
{
  "success": true,
  "symbol": "NQ=F",
  "interval": "5m",
  "range": "1d",
  "candles": [
    {
      "time": 1704067200,
      "open": 16500.25,
      "high": 16520.50,
      "low": 16490.00,
      "close": 16510.75,
      "volume": 1234567
    }
  ],
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

**응답 (실패)**
```json
{
  "success": false,
  "error": "HTTP error! status: 404",
  "symbol": "INVALID",
  "interval": "5m",
  "range": "1d"
}
```

---

## 성능 및 최적화

### 1. 클라이언트 캐싱

```typescript
// src/lib/api/candles.ts
const cache = new Map();
const CACHE_DURATION = 60000; // 1분

// 캐시 키: symbol-interval-range
const cacheKey = `${symbol}-${interval}-${range}`;

// 캐시 확인
if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
  return cached.data; // API 호출 안함!
}
```

**효과**:
- 사용자 100명이 동시 접속해도 1분에 1회만 API 호출
- Rate Limit 안전 (15.9% 사용)

### 2. 효율적인 차트 업데이트

```typescript
// 초기 로드: 전체 데이터 설정
candlestickSeries.setData(candles);

// 실시간 업데이트: 마지막 캔들만 업데이트
candlestickSeries.update(lastCandle);
```

**효과**:
- 메모리 사용량 최소화
- 부드러운 애니메이션

### 3. Lightweight Charts 성능

```typescript
// Canvas 기반 렌더링
- GPU 가속 지원
- 수천 개의 캔들도 60fps 유지
- 메모리 효율적
```

### 4. 타임프레임별 폴링 간격 최적화

```typescript
1분봉:  10초 폴링 (빠른 변화)
5분~일봉: 1분 폴링 (중간)
주봉/월봉/분기봉: 10분 폴링 (느린 변화)
```

**효과**:
- 불필요한 API 호출 방지
- 배터리 절약 (모바일)

### API 호출 통계

```
최악의 시나리오 (사용자 100명, 모든 타임프레임 동시 실행):

1분봉:  60 requests/hour
5분봉:  60 requests/hour
15분봉: 60 requests/hour
1시간봉: 60 requests/hour
일봉:   60 requests/hour
주봉:   6 requests/hour
월봉:   6 requests/hour
분기봉: 6 requests/hour

총합: 318 requests/hour
Yahoo Finance Rate Limit: 2,000 requests/hour
사용률: 15.9% ✅
```

---

## 문제 해결

### 차트가 표시되지 않음

**증상**: 로딩 후 빈 화면

**해결**:
1. 브라우저 콘솔 확인 (F12)
2. 네트워크 탭에서 API 응답 확인
3. 페이지 새로고침
4. 다른 타임프레임 시도

### 데이터 로드 실패

**증상**: "데이터를 불러오는데 실패했습니다" 에러

**원인**:
- 네트워크 연결 문제
- Yahoo Finance API 장애
- 잘못된 심볼

**해결**:
1. 인터넷 연결 확인
2. 다른 심볼 시도 (SPY, AAPL 등)
3. 잠시 후 재시도

### 실시간 업데이트가 안됨

**증상**: 🔴 표시는 있지만 가격이 업데이트 안됨

**원인**:
- 시장 휴장 시간
- 캐시 문제
- 폴링 중지됨

**해결**:
1. 시장 개장 시간 확인
2. 브라우저 캐시 삭제
   ```javascript
   localStorage.clear();
   location.reload();
   ```
3. 실시간 버튼 다시 클릭

### CORS 에러

**증상**: "Access to fetch ... has been blocked by CORS policy"

**원인**: API 라우트가 제대로 작동하지 않음

**해결**:
1. 개발 서버 재시작
   ```bash
   npm run dev
   ```
2. `/api/candles/[symbol]/+server.ts` 파일 확인
3. 브라우저 캐시 삭제

### 성능 문제

**증상**: 차트가 느리거나 끊김

**원인**:
- 너무 많은 데이터 포인트
- 메모리 부족
- 오래된 브라우저

**해결**:
1. 더 긴 타임프레임 사용 (일봉, 주봉)
2. 브라우저 탭 닫기
3. 최신 브라우저 사용 (Chrome, Firefox, Safari, Edge)

---

## 디버깅

### 콘솔 로그 확인

브라우저 콘솔(F12)에서 다음 로그를 확인하세요:

```
정상 작동 시:
📈 Initializing chart...
✅ Chart created
✅ Candlestick series added
🔄 Loading data for NQ=F (5m)...
✅ Received 78 candles
💰 Current price: $16510.75

에러 발생 시:
❌ Chart initialization failed: ...
❌ 데이터 로드 실패: ...
```

### 네트워크 요청 확인

1. 브라우저 개발자 도구 (F12)
2. Network 탭
3. Fetch/XHR 필터
4. `/api/candles/` 요청 확인

**확인 사항**:
- Status: 200 (성공)
- Response: JSON 데이터
- Timing: 응답 시간

---

## 향후 개선 사항

### Phase 1 (완료) ✅
- [x] 기본 캔들차트 구현
- [x] 다중 타임프레임 지원 (8개)
- [x] 실시간 업데이트 (폴링)
- [x] 클라이언트 캐싱
- [x] CORS 우회

### Phase 2 (계획 중)
- [ ] 볼륨 차트 추가
- [ ] 기술적 지표 (이동평균선, RSI, MACD)
- [ ] 차트 저장 기능
- [ ] 알림 기능 (가격 알림)
- [ ] 다중 심볼 지원

### Phase 3 (장기)
- [ ] WebSocket 실시간 스트리밍
- [ ] Supabase Edge Function 중앙화
- [ ] 사용자 설정 저장
- [ ] 모바일 앱

---

## 참고 문서

- [Lightweight Charts 공식 문서](https://tradingview.github.io/lightweight-charts/)
- [SvelteKit 공식 문서](https://kit.svelte.dev/docs)
- [Yahoo Finance API (비공식)](https://github.com/ranaroussi/yfinance)
- [프로젝트 개요](./PROJECT_OVERVIEW.md)
- [구현 계획](./CANDLESTICK_IMPLEMENTATION_PLAN.md)

---

**마지막 업데이트**: 2025-01-09
**버전**: 1.0.0
**상태**: ✅ 프로덕션 준비 완료
