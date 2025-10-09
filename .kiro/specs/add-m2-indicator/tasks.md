# Implementation Plan

## Overview

M2 통화 공급량 지표를 BullGaze 플랫폼에 추가하기 위한 구현 작업 목록입니다. 각 작업은 테스트 주도 개발(TDD) 방식으로 진행하며, 점진적으로 기능을 구축합니다.

## Tasks

- [x] 1. 데이터베이스 스키마 업데이트
  - 데이터베이스 마이그레이션 파일을 생성하여 `financial_dashboard_prices` 테이블의 asset_type CHECK 제약조건에 'economic_indicator'를 추가합니다.
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.1 마이그레이션 파일 생성
  - `supabase/migrations/` 디렉토리에 새로운 마이그레이션 파일을 생성합니다.
  - 파일명 형식: `YYYYMMDDHHMMSS_add_economic_indicator_asset_type.sql`
  - _Requirements: 1.1_

- [x] 1.2 CHECK 제약조건 업데이트 SQL 작성
  - 기존 제약조건을 DROP하고 'economic_indicator'를 포함한 새 제약조건을 ADD하는 SQL을 작성합니다.
  - _Requirements: 1.2, 1.3_

- [x] 1.3 마이그레이션 테스트 및 배포
  - 로컬에서 `supabase db push`로 마이그레이션을 테스트합니다.
  - Supabase Dashboard에서 프로덕션 마이그레이션을 실행합니다.
  - _Requirements: 1.1, 1.4_

- [x] 2. update-financial-prices Edge Function 업데이트
  - 기존 Edge Function에 M2 데이터 수집 함수를 추가하여 FRED API로부터 최신 M2 데이터를 가져와 저장합니다.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.1 기존 Edge Function 백업
  - `mcp_supabase_get_edge_function`을 사용하여 현재 update-financial-prices 함수 코드를 가져옵니다.
  - `supabase/functions/update-financial-prices/index.ts.backup` 파일로 저장합니다.
  - 백업 파일 상단에 백업 날짜와 버전 정보를 주석으로 추가합니다.
  - _Requirements: 2.1_

- [x] 2.2 FRED API 설정 추가
  - Edge Function 상단에 FRED API URL과 API 키 환경 변수를 추가합니다.
  - _Requirements: 2.1, 2.5_

- [x] 2.2 updateM2MoneySupply 함수 구현
  - FRED API를 호출하여 M2SL 시리즈의 최신 2개 데이터 포인트를 가져옵니다.
  - 변화량과 변화율을 계산합니다.
  - 데이터베이스에 저장합니다.
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 2.3 에러 처리 추가
  - API 키 누락, HTTP 에러, 데이터 부족, 잘못된 데이터 형식 등의 에러를 처리합니다.
  - _Requirements: 2.4, 2.5, 2.6_

- [x] 2.4 메인 핸들러에 M2 업데이트 추가
  - 메인 핸들러의 results 객체에 m2MoneySupply를 추가합니다.
  - try-catch로 에러를 처리하여 다른 자산 업데이트에 영향을 주지 않도록 합니다.
  - _Requirements: 2.4_

- [ ]* 2.5 Edge Function 로컬 테스트
  - `supabase functions serve`로 로컬에서 함수를 실행합니다.
  - cURL로 함수를 호출하여 응답을 확인합니다.
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.6 Edge Function 배포
  - `supabase functions deploy update-financial-prices`로 함수를 배포합니다.
  - Supabase Dashboard에서 환경 변수 FRED_API_KEY가 설정되어 있는지 확인합니다.
  - _Requirements: 2.1, 2.5_

- [x] 3. seed-historical-data Edge Function 업데이트
  - 기존 Edge Function에 M2 심볼을 추가하고 FRED API로부터 최근 30일 데이터를 수집합니다.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3.1 기존 Edge Function 백업
  - `mcp_supabase_get_edge_function`을 사용하여 현재 seed-historical-data 함수 코드를 가져옵니다.
  - `supabase/functions/seed-historical-data/index.ts.backup` 파일로 저장합니다.
  - 백업 파일 상단에 백업 날짜와 버전 정보를 주석으로 추가합니다.
  - _Requirements: 3.1_

- [x] 3.2 SYMBOLS 배열에 M2 추가
  - M2 심볼 객체를 SYMBOLS 배열에 추가합니다 (apiType: 'fred' 포함).
  - _Requirements: 3.1_

- [x] 3.3 fetchFREDHistoricalData 함수 구현
  - FRED API를 호출하여 지정된 기간의 M2 데이터를 가져옵니다.
  - Yahoo Finance 형식으로 데이터를 변환합니다.
  - _Requirements: 3.2, 3.3_

- [x] 3.4 seedHistoricalDataForSymbol 함수 수정
  - apiType 파라미터를 추가하여 FRED와 Yahoo Finance를 구분합니다.
  - apiType에 따라 적절한 데이터 가져오기 함수를 호출합니다.
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 3.5 메인 핸들러 수정
  - M2 심볼 처리 시 30일 데이터만 수집하도록 days 파라미터를 조정합니다.
  - _Requirements: 3.2_

- [ ]* 3.6 Edge Function 로컬 테스트
  - `supabase functions serve`로 로컬에서 함수를 실행합니다.
  - cURL로 함수를 호출하여 M2 데이터가 수집되는지 확인합니다.
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 3.7 Edge Function 배포
  - `supabase functions deploy seed-historical-data`로 함수를 배포합니다.
  - 배포 후 함수를 수동으로 실행하여 M2 과거 데이터를 수집합니다.
  - _Requirements: 3.1, 3.2, 3.5_


- [x] 4. 대시보드 UI 업데이트 - 자산 타입 분류
  - assetTypeMap과 getAssetType 함수를 업데이트하여 M2를 경제 지표로 분류합니다.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4.1 assetTypeMap에 economicIndicators 추가
  - `src/routes/+page.svelte`의 assetTypeMap 객체에 economicIndicators Set을 추가합니다.
  - M2 심볼을 economicIndicators Set에 포함합니다.
  - _Requirements: 6.1, 6.2_

- [x] 4.2 getAssetType 함수 업데이트
  - M2 심볼을 'economicIndicators'로 반환하도록 로직을 추가합니다.
  - _Requirements: 6.3_

- [x] 4.3 groupedPrices derived 함수 업데이트
  - groups 객체에 economicIndicators 배열을 추가합니다.
  - economicIndicators 그룹을 심볼순으로 정렬합니다.
  - _Requirements: 6.4, 6.5_

- [x] 5. 대시보드 UI 업데이트 - M2 카드 표시
  - 대시보드에 "📊 경제 지표" 섹션을 추가하고 M2 카드를 렌더링합니다.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5.1 경제 지표 섹션 추가
  - 주식 지수 섹션 다음에 경제 지표 섹션을 추가합니다.
  - aria-labelledby 속성을 사용하여 접근성을 향상합니다.
  - _Requirements: 4.2, 4.5_

- [x] 5.2 M2 카드 렌더링
  - groupedPrices().economicIndicators를 순회하며 PriceCard 컴포넌트를 렌더링합니다.
  - 가격, 변화량, 변화율을 props로 전달합니다.
  - _Requirements: 4.3, 4.4_

- [x] 5.3 조건부 렌더링 추가
  - economicIndicators 배열이 비어있으면 섹션을 표시하지 않습니다.
  - _Requirements: 4.6_

- [x] 6. 대시보드 UI 업데이트 - M2 차트 표시
  - 대시보드 차트 섹션에 M2 차트를 추가합니다.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6.1 m2ChartData derived 함수 생성
  - createChartData 헬퍼 함수를 사용하여 M2 차트 데이터를 생성합니다.
  - 보라색 테마를 적용합니다 (rgb(139, 92, 246)).
  - _Requirements: 5.2, 5.3_

- [x] 6.2 M2 차트 렌더링
  - 경제 지표 섹션 바로 아래에 M2 차트를 추가합니다.
  - LineChart 컴포넌트를 사용하여 차트를 렌더링합니다.
  - _Requirements: 5.1, 5.4_

- [x] 6.3 조건부 렌더링 추가
  - historicalData['M2']가 존재하고 길이가 0보다 클 때만 차트를 표시합니다.
  - _Requirements: 5.6_

- [x] 7. SEO 및 접근성 업데이트
  - 메타 태그와 구조화된 데이터에 M2 관련 정보를 추가합니다.
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 7.1 메타 태그 업데이트
  - description과 keywords 메타 태그에 "M2 통화 공급량" 키워드를 추가합니다.
  - _Requirements: 10.4_

- [x] 7.2 구조화된 데이터 업데이트
  - structuredData 객체의 featureList에 "M2 통화 공급량 추이"를 추가합니다.
  - _Requirements: 10.5_

- [x] 7.3 ARIA 레이블 확인
  - 경제 지표 섹션에 적절한 aria-labelledby 속성이 있는지 확인합니다.
  - _Requirements: 10.1, 10.2_

- [x] 8. 상관관계 분석 페이지 통합
  - M2 지표를 상관관계 분석 페이지에 통합하여 다른 자산과의 상관관계를 분석할 수 있도록 합니다.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 8.1 상관관계 분석 페이지 확인
  - `src/routes/analytics/+page.svelte` 파일을 확인하여 현재 구조를 파악합니다.
  - M2 데이터가 자동으로 포함되는지 확인합니다.
  - _Requirements: 7.1_

- [x] 8.2 M2 데이터 포함 확인
  - fetchLatestPrices와 fetchHistoricalData 함수가 M2 데이터를 가져오는지 확인합니다.
  - 상관관계 계산 로직이 M2를 포함하는지 확인합니다.
  - _Requirements: 7.2_

- [x] 8.3 히트맵에 M2 표시 확인
  - 상관관계 히트맵에 M2가 표시되는지 확인합니다.
  - M2 셀 클릭 시 비교 차트가 표시되는지 확인합니다.
  - _Requirements: 7.3_

- [x] 8.4 인사이트 생성 확인
  - M2와 다른 자산 간 상관계수가 0.7 이상일 때 "강한 양의 상관관계" 인사이트가 생성되는지 확인합니다.
  - M2와 다른 자산 간 상관계수가 -0.7 이하일 때 "강한 음의 상관관계" 인사이트가 생성되는지 확인합니다.
  - _Requirements: 7.5, 7.6_

- [x] 9. 통합 테스트 및 검증
  - 전체 시스템이 올바르게 작동하는지 확인합니다.
  - _Requirements: 모든 요구사항_

- [x] 9.1 데이터베이스 검증
  - SQL 쿼리로 M2 데이터가 올바르게 저장되었는지 확인합니다.
  - asset_type이 'economic_indicator'인지 확인합니다.
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 9.2 Edge Functions 검증
  - update-financial-prices를 수동으로 실행하여 M2 데이터가 수집되는지 확인합니다.
  - seed-historical-data를 수동으로 실행하여 M2 과거 데이터가 수집되는지 확인합니다.
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.5_

- [x] 9.3 대시보드 검증
  - 로컬 개발 서버에서 대시보드를 열어 M2 카드와 차트가 표시되는지 확인합니다.
  - 브라우저 콘솔에서 에러가 없는지 확인합니다.
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_

- [x] 9.4 모바일 반응형 검증
  - 브라우저 개발자 도구에서 모바일 뷰로 전환하여 레이아웃을 확인합니다.
  - 768px 미만에서 1열 레이아웃이 적용되는지 확인합니다.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9.5 상관관계 분석 검증
  - 상관관계 분석 페이지에서 M2가 표시되는지 확인합니다.
  - M2와 다른 자산 간 상관관계가 계산되는지 확인합니다.
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 9.6 E2E 테스트 작성
  - Playwright를 사용하여 M2 지표 표시 E2E 테스트를 작성합니다.
  - M2 카드와 차트가 올바르게 렌더링되는지 테스트합니다.
  - _Requirements: 모든 요구사항_

- [x] 10. 프로덕션 배포
  - 모든 변경사항을 프로덕션 환경에 배포합니다.
  - _Requirements: 모든 요구사항_

- [x] 10.1 데이터베이스 마이그레이션 배포
  - Supabase Dashboard에서 마이그레이션을 실행합니다.
  - 마이그레이션 성공 여부를 확인합니다.
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 10.2 Edge Functions 배포
  - update-financial-prices와 seed-historical-data를 배포합니다.
  - 환경 변수 FRED_API_KEY가 설정되어 있는지 확인합니다.
  - _Requirements: 2.1, 2.5, 3.1_

- [x] 10.3 Frontend 빌드 확인
  - 로컬에서 `npm run build`를 실행하여 빌드 에러가 없는지 확인합니다.
  - 빌드된 파일이 정상적으로 생성되는지 확인합니다.
  - _Requirements: 4.1, 5.1, 6.1, 7.1_

- [x] 10.4 프로덕션 검증
  - 프로덕션 대시보드에서 M2 카드와 차트가 표시되는지 확인합니다.
  - 브라우저 콘솔에서 에러가 없는지 확인합니다.
  - 모바일 기기에서 반응형 레이아웃을 확인합니다.
  - _Requirements: 모든 요구사항_

- [x] 10.5 모니터링 설정
  - Supabase Dashboard에서 Edge Function 로그를 확인합니다.
  - M2 데이터 최신성을 확인하는 SQL 쿼리를 실행합니다.
  - _Requirements: 모든 요구사항_

- [x] 11. 문서 업데이트
  - 프로젝트 문서를 업데이트하여 M2 지표 추가 내용을 반영합니다.
  - _Requirements: 모든 요구사항_

- [x] 11.1 PROJECT_OVERVIEW.md 업데이트
  - 대시보드 섹션에 경제 지표 (M2) 내용을 추가합니다.
  - 데이터 소스에 FRED API를 추가합니다.
  - _Requirements: 모든 요구사항_

- [x] 11.2 README.md 업데이트 (필요시)
  - M2 지표 관련 설명을 추가합니다.
  - FRED API 키 설정 방법을 추가합니다.
  - _Requirements: 모든 요구사항_
