# Design Document

## Overview

실시간 캔들차트 페이지에서 차트 위에 다른 UI 요소가 겹치는 문제를 해결합니다. 문제의 원인을 파악하고, DOM 구조, CSS 스타일, z-index 계층을 재설계하여 차트가 독립적으로 깔끔하게 표시되도록 합니다.

## Problem Analysis

### 현재 문제점

1. **차트 위에 BullGaze 로고와 텍스트가 겹침**
   - 스크린샷에서 차트 중앙 하단에 BullGaze 로고와 "시장 분석 도구" 텍스트가 표시됨
   - 이는 Lightweight Charts의 워터마크가 아닌 다른 요소

2. **가능한 원인**
   - Footer 요소가 position: fixed로 설정되어 차트 위에 떠있을 가능성
   - 다른 UI 요소가 position: absolute로 차트 영역에 배치될 가능성
   - z-index 설정 문제로 요소 순서가 잘못될 가능성
   - 차트 컨테이너 내부에 예상치 못한 요소가 삽입될 가능성

### 조사 필요 사항

1. Footer의 position 속성 확인
2. 차트 컨테이너 내부 DOM 구조 확인
3. 모든 position: fixed/absolute 요소 확인
4. z-index 계층 구조 확인

## Architecture

### 레이아웃 구조

```
<body>
  ├── Header (z-index: 1000, position: sticky)
  ├── Main Content (position: relative)
  │   ├── Page Header
  │   ├── Symbol Selector
  │   └── Chart Section
  │       └── Chart Wrapper
  │           └── Chart Container (Lightweight Charts만 포함)
  └── Footer (position: static, 차트 아래 배치)
```

### z-index 계층

```
1000: Header (sticky)
100: Modal/Dialog (필요시)
10: Chart Container
1: 일반 콘텐츠
auto: Footer
```

## Components and Interfaces

### 1. Chart Container 격리

**목표**: 차트 컨테이너가 독립적인 영역을 가지도록 보장

```svelte
<!-- RealtimeCandlestickChart.svelte -->
<div class="chart-wrapper">
  <!-- 차트 헤더 -->
  <div class="chart-header">...</div>
  
  <!-- 차트 컨테이너 - 오직 Lightweight Charts만 -->
  <div 
    bind:this={chartContainer} 
    class="chart-container"
    class:hidden={loading || error}
  ></div>
  
  <!-- 로딩/에러 상태 -->
  {#if loading}...{/if}
  {#if error}...{/if}
</div>
```

**CSS 수정**:
```css
.chart-container {
  width: 100%;
  height: 500px;
  position: relative;
  z-index: 10;
  isolation: isolate; /* 새로운 stacking context 생성 */
}
```

### 2. Footer Position 확인 및 수정

**현재 상태 확인**:
- `+layout.svelte`의 Footer가 position: static인지 확인
- Footer가 차트 영역을 침범하지 않는지 확인

**수정 방안**:
```css
.footer {
  position: static; /* fixed가 아닌 static */
  z-index: auto;
  margin-top: auto; /* flex 레이아웃에서 하단 배치 */
}
```

### 3. DOM 구조 검증

**차트 초기화 시 컨테이너 정리**:
```typescript
function initializeChart() {
  if (!chartContainer) return;
  
  // 기존 내용 완전히 제거
  chartContainer.innerHTML = '';
  
  // 차트 생성
  chart = createChart(chartContainer, options);
  candlestickSeries = chart.addSeries(CandlestickSeries, seriesOptions);
}
```

**검증 로직 추가**:
```typescript
function validateChartContainer() {
  if (!chartContainer) return false;
  
  // 차트 컨테이너에 예상치 못한 자식 요소가 있는지 확인
  const children = Array.from(chartContainer.children);
  const hasUnexpectedElements = children.some(child => 
    !child.classList.contains('tv-lightweight-charts')
  );
  
  if (hasUnexpectedElements) {
    console.warn('⚠️ Unexpected elements in chart container:', children);
    return false;
  }
  
  return true;
}
```

### 4. CSS Isolation

**Scoped Styles 강화**:
```css
.chart-wrapper {
  /* 독립적인 stacking context */
  isolation: isolate;
  position: relative;
  z-index: 1;
}

.chart-container {
  /* 차트 영역 명확히 정의 */
  position: relative;
  z-index: 10;
  overflow: hidden; /* 차트 밖으로 요소가 나가지 않도록 */
  background: transparent;
}

/* 차트 내부 요소가 밖으로 나가지 않도록 */
.chart-container > * {
  position: relative;
  z-index: 1;
}
```

### 5. 모바일 최적화

**반응형 차트 크기**:
```css
@media (max-width: 768px) {
  .chart-container {
    height: 350px;
    /* 모바일에서 터치 이벤트 보장 */
    touch-action: pan-x pan-y;
  }
}

@media (max-width: 480px) {
  .chart-container {
    height: 300px;
  }
}
```

## Data Models

### Chart State

```typescript
interface ChartState {
  container: HTMLDivElement | null;
  instance: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  isInitialized: boolean;
  isValid: boolean; // DOM 구조 검증 결과
}
```

## Error Handling

### DOM 구조 검증 실패

```typescript
if (!validateChartContainer()) {
  error = '차트 컨테이너에 예상치 못한 요소가 있습니다. 페이지를 새로고침해주세요.';
  console.error('Chart container validation failed');
  
  // 컨테이너 정리 시도
  if (chartContainer) {
    chartContainer.innerHTML = '';
  }
}
```

### z-index 충돌 감지

```typescript
function detectZIndexConflicts() {
  if (!chartContainer) return;
  
  const chartRect = chartContainer.getBoundingClientRect();
  const elementsAtPoint = document.elementsFromPoint(
    chartRect.left + chartRect.width / 2,
    chartRect.top + chartRect.height / 2
  );
  
  // 차트 컨테이너보다 위에 있는 요소 확인
  const overlayingElements = elementsAtPoint.filter(el => 
    !chartContainer.contains(el) && 
    el !== chartContainer
  );
  
  if (overlayingElements.length > 0) {
    console.warn('⚠️ Elements overlaying chart:', overlayingElements);
  }
}
```

## Testing Strategy

### 1. DOM 구조 테스트

```typescript
// 차트 초기화 후 DOM 구조 확인
test('chart container should only contain Lightweight Charts elements', () => {
  const container = document.querySelector('.chart-container');
  const children = Array.from(container.children);
  
  expect(children.length).toBeGreaterThan(0);
  expect(children.every(child => 
    child.classList.contains('tv-lightweight-charts')
  )).toBe(true);
});
```

### 2. z-index 테스트

```typescript
test('no elements should overlay the chart', () => {
  const chartContainer = document.querySelector('.chart-container');
  const chartRect = chartContainer.getBoundingClientRect();
  
  const elementsAtCenter = document.elementsFromPoint(
    chartRect.left + chartRect.width / 2,
    chartRect.top + chartRect.height / 2
  );
  
  // 첫 번째 요소는 차트 컨테이너 또는 그 자식이어야 함
  expect(
    elementsAtCenter[0] === chartContainer ||
    chartContainer.contains(elementsAtCenter[0])
  ).toBe(true);
});
```

### 3. 모바일 반응형 테스트

```typescript
test('chart should resize on mobile viewport', () => {
  // 모바일 뷰포트로 변경
  window.innerWidth = 375;
  window.dispatchEvent(new Event('resize'));
  
  const chartContainer = document.querySelector('.chart-container');
  const height = chartContainer.offsetHeight;
  
  expect(height).toBeLessThanOrEqual(350);
});
```

### 4. 수동 테스트 체크리스트

- [ ] 데스크톱에서 차트 위에 다른 요소가 겹치지 않는지 확인
- [ ] 모바일에서 차트 위에 다른 요소가 겹치지 않는지 확인
- [ ] 페이지 스크롤 시 차트 영역이 올바르게 동작하는지 확인
- [ ] 심볼 전환 시 차트가 깔끔하게 업데이트되는지 확인
- [ ] 개발자 도구로 DOM 구조 확인
- [ ] 개발자 도구로 z-index 계층 확인

## Implementation Plan

### Phase 1: 문제 진단

1. 브라우저 개발자 도구로 겹친 요소 식별
2. 해당 요소의 CSS 속성 확인 (position, z-index)
3. DOM 구조 확인

### Phase 2: CSS 수정

1. 차트 컨테이너에 `isolation: isolate` 추가
2. Footer의 position 확인 및 수정
3. z-index 계층 정리

### Phase 3: DOM 검증

1. 차트 초기화 시 컨테이너 정리 로직 강화
2. DOM 구조 검증 함수 추가
3. z-index 충돌 감지 로직 추가

### Phase 4: 테스트

1. 데스크톱 브라우저에서 테스트
2. 모바일 브라우저에서 테스트
3. 다양한 화면 크기에서 테스트

## Performance Considerations

- `isolation: isolate` 사용 시 새로운 stacking context 생성으로 인한 성능 영향 최소화
- DOM 검증 로직은 개발 모드에서만 실행
- z-index 충돌 감지는 초기화 시 한 번만 실행

## Security Considerations

- 차트 컨테이너에 외부 스크립트가 요소를 삽입하지 못하도록 보호
- XSS 공격 방지를 위한 innerHTML 사용 최소화
