# Design Document

## Overview

이 디자인은 실시간 캔들스틱 차트에서 타임프레임별로 적절한 데이터 범위를 사용하도록 수정합니다. 현재 문제는 `loadData()` 함수와 `startRealtime()` 함수에서 range 결정 로직이 분리되어 있고, 실시간 폴링에서는 하드코딩된 `'1d'` range를 사용한다는 것입니다.

## Architecture

### Current Issues

1. **중복된 Range 로직**: `loadData()`에서 타임프레임별 range를 결정하지만, `startRealtime()`에서는 이 로직을 재사용하지 않음
2. **하드코딩된 Range**: `startRealtimePolling()` 호출 시 항상 `'1d'` range를 사용
3. **불일치하는 데이터**: 초기 로드와 실시간 업데이트가 서로 다른 range를 사용하여 데이터 불일치 발생

### Proposed Solution

1. **중앙화된 Range 결정 함수**: 타임프레임을 입력받아 적절한 range를 반환하는 유틸리티 함수 생성
2. **일관된 Range 사용**: 초기 로드와 실시간 폴링 모두 동일한 함수를 사용
3. **타임프레임별 최적화된 Range**: 각 타임프레임에 맞는 적절한 데이터 범위 설정

## Components and Interfaces

### 1. Range 결정 함수

```typescript
/**
 * 타임프레임에 따라 적절한 데이터 범위를 반환
 */
function getRangeForInterval(interval: string): string {
	const rangeMap: Record<string, string> = {
		'1m': '5d',    // 1분봉: 5일
		'5m': '5d',    // 5분봉: 5일
		'15m': '5d',   // 15분봉: 5일
		'1h': '3mo',   // 1시간봉: 3개월
		'1d': '5y',    // 일봉: 5년
		'1wk': '10y',  // 주봉: 10년
		'1mo': '20y',  // 월봉: 20년
		'3mo': 'max'   // 분기봉: 최대
	};
	
	return rangeMap[interval] || '1d';
}
```

### 2. 수정된 loadData() 함수

```typescript
async function loadData() {
	loading = true;
	error = null;

	console.log(`🔄 Loading data for ${symbol} (${selectedInterval})...`);

	try {
		const { fetchCandlesWithCache } = await import('$lib/api/candles');
		
		// 중앙화된 함수 사용
		const range = getRangeForInterval(selectedInterval);
		
		const candles = await fetchCandlesWithCache(symbol, selectedInterval, range);
		// ... 나머지 로직
	}
}
```

### 3. 수정된 startRealtime() 함수

```typescript
function startRealtime() {
	if (stopPolling) return;

	isLive = true;
	
	// 타임프레임에 따라 폴링 간격 조정
	let pollingInterval = 60000; // 기본 1분
	if (selectedInterval === '1m') {
		pollingInterval = 10000; // 1분봉: 10초
	} else if (['1wk', '1mo', '3mo'].includes(selectedInterval)) {
		pollingInterval = 600000; // 장기 차트: 10분
	}

	// 중앙화된 함수 사용
	const range = getRangeForInterval(selectedInterval);

	let lastCandleTime: number | null = null;

	stopPolling = startRealtimePolling(
		symbol, 
		selectedInterval, 
		range,  // 동적 range 전달
		pollingInterval, 
		(candles) => {
			// ... 콜백 로직
		}
	);
}
```

### 4. 수정된 startRealtimePolling() 함수

```typescript
export function startRealtimePolling(
	symbol: string,
	interval: string,
	range: string,  // range 파라미터 추가
	pollingInterval: number,
	callback: (candles: CandleData[]) => void
): () => void {
	// 즉시 실행 (강제 새로고침)
	fetchCandlesForceRefresh(symbol, interval, range).then(callback).catch(console.error);

	// 주기적 실행 (강제 새로고침)
	const intervalId = setInterval(async () => {
		try {
			const candles = await fetchCandlesForceRefresh(symbol, interval, range);
			callback(candles);
		} catch (error) {
			console.error('Polling error:', error);
		}
	}, pollingInterval);

	return () => clearInterval(intervalId);
}
```

## Data Models

변경 사항 없음. 기존 `CandleData` 타입을 그대로 사용합니다.

## Error Handling

1. **잘못된 타임프레임**: `getRangeForInterval()`에서 알 수 없는 interval이 들어오면 기본값 `'1d'` 반환
2. **API 오류**: 기존 에러 핸들링 로직 유지
3. **로깅**: 각 단계에서 사용되는 range를 콘솔에 로깅하여 디버깅 용이성 향상

## Testing Strategy

### Manual Testing

1. **타임프레임 전환 테스트**
   - 각 타임프레임(1M, 5M, 15M, 1H, 1D, 1W, 1MO, Q)을 순차적으로 선택
   - 각 타임프레임이 서로 다른 캔들 데이터를 표시하는지 확인
   - 브라우저 콘솔에서 올바른 range가 사용되는지 확인

2. **실시간 업데이트 테스트**
   - 각 타임프레임에서 실시간 모드 활성화
   - 네트워크 탭에서 올바른 range 파라미터가 전달되는지 확인
   - 데이터가 주기적으로 업데이트되는지 확인

3. **데이터 일관성 테스트**
   - 초기 로드 후 실시간 모드 활성화
   - 데이터가 끊김 없이 연속적으로 표시되는지 확인

### Console Logging

디버깅을 위해 다음 정보를 로깅:
- 선택된 타임프레임
- 결정된 range 값
- API 요청 URL 및 파라미터
- 받은 캔들 개수

## Implementation Notes

1. **Range 값 최적화**: 각 타임프레임에 대한 range 값은 Yahoo Finance API의 제한사항과 사용자 경험을 고려하여 설정
2. **폴링 간격**: 장기 타임프레임(1W, 1MO, Q)은 폴링 간격을 길게 설정하여 불필요한 API 호출 감소
3. **캐시 전략**: 기존 캐시 로직 유지하되, 타임프레임별로 독립적인 캐시 키 사용
4. **하위 호환성**: 기존 API 시그니처를 최대한 유지하여 다른 컴포넌트에 영향 최소화
