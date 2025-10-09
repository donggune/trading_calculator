# Implementation Plan

- [x] 1. RealtimeCandlestickChart.svelte에 getRangeForInterval 유틸리티 함수 추가
  - 타임프레임을 입력받아 적절한 range를 반환하는 함수 작성
  - 각 타임프레임(1m, 5m, 15m, 1h, 1d, 1wk, 1mo, 3mo)에 대한 최적화된 range 매핑
  - 알 수 없는 interval에 대한 기본값 처리
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 5.3_

- [x] 2. loadData 함수에서 getRangeForInterval 사용하도록 수정
  - 기존 하드코딩된 range 로직을 getRangeForInterval 호출로 대체
  - 콘솔 로그에 사용된 range 값 출력
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.2_

- [x] 3. candles.ts의 startRealtimePolling 함수 시그니처 수정
  - range 파라미터를 함수 시그니처에 추가
  - fetchCandlesForceRefresh 호출 시 동적 range 사용
  - 기존 하드코딩된 '1d' 제거
  - _Requirements: 1.3, 2.3, 3.3, 4.2, 5.2_

- [x] 4. startRealtime 함수에서 동적 range를 startRealtimePolling에 전달
  - getRangeForInterval을 호출하여 현재 타임프레임에 맞는 range 계산
  - 계산된 range를 startRealtimePolling 함수에 전달
  - 콘솔 로그에 실시간 폴링에 사용되는 range 출력
  - _Requirements: 1.3, 2.3, 3.3, 4.2, 4.3_

- [x] 5. 브라우저에서 각 타임프레임 테스트
  - 각 타임프레임(1M, 5M, 15M, 1H, 1D, 1W, 1MO, Q)을 순차적으로 선택하여 서로 다른 데이터가 표시되는지 확인
  - 브라우저 콘솔에서 올바른 range가 사용되는지 확인
  - 네트워크 탭에서 API 요청의 range 파라미터 확인
  - _Requirements: 4.1, 4.2, 4.3_
