# Requirements Document

## Introduction

M2 통화 공급량 지표를 BullGaze 플랫폼에 추가하여 사용자가 경제의 유동성 상태를 모니터링하고 투자 결정에 활용할 수 있도록 합니다. M2는 현금, 요구불예금, 저축성 예금, 소액 정기예금, 머니마켓펀드를 포함하는 광의 통화 지표로, 중앙은행의 통화정책 효과와 시장 유동성을 평가하는 중요한 경제 지표입니다.

기존 시스템 분석 결과:
- `financial_dashboard_prices` 테이블 사용 (19개 컬럼)
- asset_type CHECK 제약조건: 'gold', 'stock_index', 'currency_index', 'cryptocurrency', 'commodity', 'currency'
- `update-financial-prices` Edge Function: 12개 자산 업데이트 (Yahoo Finance API 사용)
- `seed-historical-data` Edge Function: 11개 자산의 90일 과거 데이터 수집
- 대시보드: 자산 타입별 그룹화 (주식 지수, 환율, 원자재, 채권)

## Requirements

### Requirement 1: 데이터베이스 스키마 업데이트

**User Story:** 시스템 관리자로서, M2 데이터를 저장할 수 있도록 데이터베이스 스키마를 확장하고 싶습니다.

#### Acceptance Criteria

1. WHEN 데이터베이스 마이그레이션을 실행할 때 THEN 시스템은 `financial_dashboard_prices` 테이블의 asset_type CHECK 제약조건에 'economic_indicator'를 추가해야 합니다
2. WHEN 제약조건을 업데이트할 때 THEN 기존 데이터는 영향을 받지 않아야 합니다
3. WHEN 마이그레이션이 완료될 때 THEN asset_type은 'gold', 'stock_index', 'currency_index', 'cryptocurrency', 'commodity', 'currency', 'economic_indicator' 중 하나여야 합니다
4. IF 마이그레이션이 실패할 때 THEN 시스템은 롤백하고 명확한 에러 메시지를 제공해야 합니다

### Requirement 2: M2 최신 데이터 수집 (Edge Function)

**User Story:** 투자자로서, 최신 M2 통화 공급량 데이터를 자동으로 수집하여 시스템에 저장하고 싶습니다.

#### Acceptance Criteria

1. WHEN `update-financial-prices` Edge Function이 실행될 때 THEN 시스템은 FRED API를 호출하여 M2SL 시리즈의 최신 2개 데이터 포인트를 가져와야 합니다
2. WHEN M2 데이터를 가져올 때 THEN 시스템은 `updateM2MoneySupply` 함수를 추가하여 다른 자산 업데이트 함수와 동일한 패턴을 따라야 합니다
3. WHEN M2 데이터를 저장할 때 THEN 시스템은 다음 필드를 포함해야 합니다:
   - asset_type: 'economic_indicator'
   - symbol: 'M2'
   - name: 'M2 Money Supply'
   - currency: 'USD'
   - price: 최신 M2 값 (십억 달러)
   - change: 전월 대비 변화량
   - change_percent: 전월 대비 변화율
   - api_source: 'fred-api'
4. WHEN M2 데이터 수집이 실패할 때 THEN 시스템은 에러를 로깅하고 다른 자산 업데이트는 계속 진행해야 합니다
5. WHEN FRED API 키가 환경 변수에 없을 때 THEN 시스템은 "FRED_API_KEY not found" 에러를 반환해야 합니다
6. IF FRED API가 Rate Limit에 도달할 때 THEN 시스템은 적절한 에러 메시지를 반환하고 재시도하지 않아야 합니다

### Requirement 3: M2 과거 30일 데이터 수집 (Edge Function)

**User Story:** 투자자로서, M2의 최근 30일 추세를 차트로 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN `seed-historical-data` Edge Function이 실행될 때 THEN 시스템은 M2 심볼을 SYMBOLS 배열에 추가해야 합니다
2. WHEN M2 과거 데이터를 수집할 때 THEN 시스템은 FRED API를 사용하여 최근 30일 데이터를 요청해야 합니다
3. WHEN FRED API가 일일 데이터를 제공하지 않을 때 THEN 시스템은 가장 최근의 주간 또는 월간 데이터를 사용하고 각 날짜에 동일한 값을 저장해야 합니다
4. WHEN 과거 데이터를 저장할 때 THEN 시스템은 기존 `upsertHistoricalData` 함수를 사용하여 중복 방지해야 합니다
5. WHEN M2 데이터 수집이 완료될 때 THEN 시스템은 inserted, updated, error 카운트를 반환해야 합니다
6. IF 이미 존재하는 날짜의 데이터가 있을 때 THEN 시스템은 기존 데이터를 업데이트해야 합니다

### Requirement 4: 대시보드 UI 업데이트

**User Story:** 투자자로서, 대시보드에서 M2 지표를 다른 자산과 함께 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN 대시보드가 로드될 때 THEN 시스템은 M2 데이터를 `fetchLatestPrices` 함수로 가져와야 합니다
2. WHEN M2 데이터를 표시할 때 THEN 시스템은 새로운 "📊 경제 지표" 섹션을 생성하여 M2 카드를 표시해야 합니다
3. WHEN M2 카드가 렌더링될 때 THEN 카드는 다음 정보를 포함해야 합니다:
   - 이름: "M2 Money Supply"
   - 심볼: "M2"
   - 현재 값 (십억 달러)
   - 전월 대비 변화량
   - 전월 대비 변화율 (색상: 증가=초록, 감소=빨강)
4. WHEN 사용자가 M2 카드를 볼 때 THEN 카드는 기존 PriceCard 컴포넌트를 재사용해야 합니다
5. WHEN 대시보드 섹션 순서를 정할 때 THEN "경제 지표"는 주식 지수 다음, 환율 이전에 위치해야 합니다
6. IF M2 데이터가 없을 때 THEN 경제 지표 섹션은 표시되지 않아야 합니다

### Requirement 5: M2 차트 추가

**User Story:** 투자자로서, M2의 최근 30일 추세를 라인 차트로 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN 대시보드 차트 섹션이 렌더링될 때 THEN 시스템은 M2 차트를 추가해야 합니다
2. WHEN M2 차트 데이터를 생성할 때 THEN 시스템은 `createChartData` 헬퍼 함수를 사용해야 합니다
3. WHEN M2 차트가 표시될 때 THEN 차트는 다음 속성을 가져야 합니다:
   - 제목: "M2 통화 공급량 (M2) 추이"
   - 선 색상: 'rgb(139, 92, 246)' (보라색)
   - 배경 색상: 'rgba(139, 92, 246, 0.1)'
4. WHEN M2 차트가 렌더링될 때 THEN 기존 LineChart 컴포넌트를 재사용해야 합니다
5. WHEN 차트 순서를 정할 때 THEN M2 차트는 경제 지표 섹션 바로 아래에 위치해야 합니다
6. IF M2 과거 데이터가 없을 때 THEN M2 차트는 표시되지 않아야 합니다

### Requirement 6: 자산 타입 분류 업데이트

**User Story:** 개발자로서, M2를 올바른 자산 타입으로 분류하여 대시보드에서 적절하게 그룹화하고 싶습니다.

#### Acceptance Criteria

1. WHEN `assetTypeMap` 객체를 업데이트할 때 THEN 시스템은 새로운 'economicIndicators' 키를 추가해야 합니다
2. WHEN M2 심볼을 분류할 때 THEN 'M2'는 'economicIndicators' Set에 포함되어야 합니다
3. WHEN `getAssetType` 함수가 'M2' 심볼을 받을 때 THEN 'economicIndicators'를 반환해야 합니다
4. WHEN `groupedPrices` derived 함수가 실행될 때 THEN 'economicIndicators' 그룹을 포함해야 합니다
5. IF 향후 다른 경제 지표가 추가될 때 THEN 동일한 'economicIndicators' 그룹에 추가할 수 있어야 합니다

### Requirement 7: 상관관계 분석 통합

**User Story:** 투자자로서, M2 지표와 다른 자산(주식, 금, 채권 등) 간의 상관관계를 분석하고 싶습니다.

#### Acceptance Criteria

1. WHEN 사용자가 상관관계 분석 페이지(`/analytics`)에 접속할 때 THEN M2 지표가 분석 가능한 자산 목록에 자동으로 포함되어야 합니다
2. WHEN 상관관계 히트맵이 표시될 때 THEN M2와 다른 자산 간의 상관계수가 계산되어 표시되어야 합니다
3. WHEN 사용자가 M2 셀을 클릭할 때 THEN 시스템은 M2와 선택된 자산의 비교 차트를 표시해야 합니다
4. WHEN 비교 차트가 표시될 때 THEN 시스템은 정규화 옵션을 제공하여 시작점을 100으로 맞춰 비교할 수 있어야 합니다
5. IF M2와 특정 자산 간 상관계수가 0.7 이상일 때 THEN 시스템은 "강한 양의 상관관계" 인사이트를 생성해야 합니다
6. IF M2와 특정 자산 간 상관계수가 -0.7 이하일 때 THEN 시스템은 "강한 음의 상관관계" 인사이트를 생성해야 합니다

### Requirement 8: 성능 최적화

**User Story:** 사용자로서, M2 데이터가 빠르게 로드되어 원활한 사용 경험을 원합니다.

#### Acceptance Criteria

1. WHEN 대시보드가 로드될 때 THEN M2 데이터는 다른 자산 데이터와 함께 병렬로 로드되어야 합니다
2. WHEN M2 데이터를 조회할 때 THEN 시스템은 최근 30일 데이터만 조회해야 합니다
3. WHEN M2 차트가 렌더링될 때 THEN 시스템은 불필요한 재렌더링을 방지해야 합니다 (Svelte 5 Runes 사용)
4. WHEN 날짜를 포맷팅할 때 THEN 기존 `dateFormatCache` Map을 활용하여 중복 계산을 방지해야 합니다
5. IF M2 데이터가 캐시되어 있을 때 THEN 불필요한 API 호출을 하지 않아야 합니다

### Requirement 9: 모바일 반응형 디자인

**User Story:** 모바일 사용자로서, 스마트폰에서도 M2 지표를 편리하게 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN 사용자가 모바일 기기로 접속할 때 THEN M2 카드는 화면 너비에 맞게 조정되어야 합니다
2. WHEN 화면 크기가 768px 미만일 때 THEN M2 카드는 1열 레이아웃으로 표시되어야 합니다
3. WHEN M2 차트가 모바일에서 표시될 때 THEN 차트는 터치 제스처를 지원해야 합니다
4. WHEN 텍스트가 표시될 때 THEN 모든 텍스트는 모바일 화면에서 읽기 쉬운 크기여야 합니다
5. IF 사용자가 가로 모드로 전환할 때 THEN 레이아웃은 자동으로 조정되어야 합니다

### Requirement 10: 접근성 및 SEO

**User Story:** 모든 사용자로서, 장애 여부와 관계없이 M2 지표에 접근하고 검색 엔진에서 쉽게 찾을 수 있기를 원합니다.

#### Acceptance Criteria

1. WHEN M2 섹션이 렌더링될 때 THEN 적절한 ARIA 레이블을 제공해야 합니다 (aria-labelledby)
2. WHEN 스크린 리더가 사용될 때 THEN "경제 지표" 섹션 제목이 읽혀야 합니다
3. WHEN M2 차트가 표시될 때 THEN 대체 텍스트 또는 데이터 설명을 제공해야 합니다
4. WHEN 페이지 메타 태그를 업데이트할 때 THEN M2 지표 관련 키워드를 추가해야 합니다
5. IF 구조화된 데이터를 업데이트할 때 THEN featureList에 "M2 통화 공급량 추이"를 추가해야 합니다
