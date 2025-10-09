# Implementation Plan

## Overview

분석 페이지에서 월간 지표(M2 등)를 필터링하여 일일 데이터만 표시하도록 수정합니다. 한 줄의 코드 추가로 문제를 해결합니다.

## Tasks

- [x] 1. 분석 페이지 Supabase 쿼리에 필터 추가
  - `src/routes/analytics/+page.svelte` 파일의 loadData() 함수를 수정합니다.
  - Supabase 쿼리에 `.neq('asset_type', 'economic_indicator')` 조건을 추가합니다.
  - _Requirements: 1.1, 1.2_

- [x] 2. 로컬 테스트 및 검증
  - 로컬 개발 서버를 실행하여 분석 페이지를 확인합니다.
  - 자산 선택 목록에 M2가 표시되지 않는지 확인합니다.
  - 히트맵에 M2 행/열이 표시되지 않는지 확인합니다.
  - 대시보드 페이지에서 M2가 여전히 표시되는지 확인합니다.
  - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2_

- [x] 3. 프로덕션 배포 및 검증
  - 변경사항을 커밋하고 푸시하여 Vercel에 배포합니다.
  - 프로덕션 분석 페이지에서 M2가 제외되었는지 확인합니다.
  - 프로덕션 대시보드에서 M2가 표시되는지 확인합니다.
  - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4_
