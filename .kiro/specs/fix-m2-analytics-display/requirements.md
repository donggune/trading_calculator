# Requirements Document

## Introduction

분석 페이지(/analytics)는 단기 상관관계 분석에 집중하기 위해 일일 데이터만 표시합니다. M2와 같은 월간 지표는 분석 페이지에서 제외하고, 대시보드 페이지에서만 표시합니다.

**문제 원인:** 현재 분석 페이지는 모든 자산을 표시하려고 하지만, M2는 월간 데이터이므로 일일 데이터(주식, 환율 등)와 시간 범위가 달라 의미 있는 상관관계 분석이 불가능합니다.

**해결 방안:** 분석 페이지에서 월간 지표(M2 등)를 필터링하여 제외합니다. 이렇게 하면 일일 데이터끼리만 비교하여 정확한 단기 상관관계를 분석할 수 있습니다.

## Requirements

### Requirement 1: 분석 페이지에서 월간 지표 필터링

**User Story:** 투자자로서, 분석 페이지에서 일일 데이터만 비교하여 정확한 단기 상관관계를 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN 분석 페이지가 데이터를 로드할 때 THEN 시스템은 asset_type이 'economic_indicator'인 자산을 제외해야 합니다
2. WHEN Supabase 쿼리를 실행할 때 THEN WHERE 절에 `.neq('asset_type', 'economic_indicator')` 조건을 추가해야 합니다
3. WHEN 데이터가 로드된 후 THEN availableAssets 배열에 M2가 포함되지 않아야 합니다
4. WHEN 상관관계 행렬을 생성할 때 THEN M2가 자동으로 제외되어야 합니다
5. WHEN 히트맵이 렌더링될 때 THEN M2 행과 열이 표시되지 않아야 합니다
6. IF 향후 다른 월간 지표가 추가될 때 THEN 동일하게 필터링되어야 합니다

### Requirement 2: 대시보드 페이지에서 M2 유지

**User Story:** 투자자로서, 대시보드 페이지에서는 M2 지표를 계속 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN 대시보드 페이지가 로드될 때 THEN M2 카드가 경제 지표 섹션에 표시되어야 합니다
2. WHEN M2 차트가 렌더링될 때 THEN 최근 데이터가 표시되어야 합니다
3. WHEN 사용자가 분석 페이지로 이동할 때 THEN M2가 표시되지 않아야 합니다
4. IF 사용자가 대시보드로 돌아올 때 THEN M2가 다시 표시되어야 합니다
