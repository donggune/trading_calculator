# Implementation Plan

- [x] 1. RealtimeCandlestickChart 컴포넌트 리팩토링
  - Svelte 5 `$effect`를 사용하여 차트 초기화 타이밍 문제 해결
  - `chartContainer` 바인딩 후 자동으로 차트 초기화
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

- [x] 1.1 State 변수 정리 및 타입 정의
  - `chartContainer`, `chart`, `candlestickSeries` 상태 변수 정의
  - UI 상태 변수 정의 (`loading`, `error`, `isLive` 등)
  - _Requirements: 2.1, 3.1_

- [x] 1.2 $effect를 사용한 차트 초기화 로직 구현
  - `chartContainer`가 바인딩되면 자동으로 `initializeChart()` 실행
  - 중복 초기화 방지 로직 추가
  - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [x] 1.3 initializeChart() 함수 구현
  - Lightweight Charts `createChart()` 호출
  - `addCandlestickSeries()` 호출
  - 에러 처리 및 로깅
  - _Requirements: 2.1, 2.2, 2.3, 6.2_

- [x] 1.4 loadData() 함수 개선
  - API 호출 및 데이터 로드
  - 차트에 데이터 설정 (`setData()`)
  - 현재가 및 업데이트 시간 설정
  - 에러 처리 및 사용자 피드백
  - _Requirements: 1.2, 1.3, 2.3, 6.1, 6.3_

- [x] 2. 타임프레임 전환 기능 구현
  - 타임프레임 변경 시 데이터 재로드
  - 로딩 상태 표시
  - 에러 처리
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2.1 changeInterval() 함수 구현
  - 선택된 인터벌 업데이트
  - 실시간 폴링 중지
  - 데이터 재로드
  - _Requirements: 4.1, 4.2_

- [x] 2.2 타임프레임 버튼 UI 개선
  - 활성 상태 표시
  - 로딩 중 비활성화
  - _Requirements: 4.1, 4.3_

- [x] 3. 실시간 업데이트 기능 구현
  - 폴링 시작/중지 로직
  - 데이터 업데이트 (`update()` 메서드)
  - 라이브 인디케이터 표시
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3.1 startRealtime() 함수 구현
  - 폴링 간격 설정 (타임프레임별)
  - `startRealtimePolling()` 호출
  - 라이브 상태 업데이트
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3.2 stopRealtime() 함수 구현
  - 폴링 중지
  - 라이브 상태 업데이트
  - _Requirements: 5.4_

- [x] 3.3 toggleRealtime() 함수 구현
  - 실시간 상태 토글
  - UI 업데이트
  - _Requirements: 5.1, 5.4_

- [x] 4. 에러 처리 및 사용자 피드백 개선
  - 명확한 에러 메시지 표시
  - 재시도 버튼 제공
  - 로딩 상태 개선
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.1 에러 메시지 컴포넌트 개선
  - 에러 타입별 메시지 표시
  - 디버깅 정보 제공
  - 재시도 버튼 추가
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.2 로딩 상태 UI 개선
  - 로딩 인디케이터 표시
  - 현재 로딩 중인 작업 표시
  - _Requirements: 1.1, 4.3_

- [x] 5. Cleanup 및 메모리 관리
  - `onDestroy`에서 리소스 정리
  - 폴링 중지
  - 차트 인스턴스 제거
  - _Requirements: 3.3_

- [x] 5.1 onDestroy() 구현
  - 폴링 중지
  - 차트 제거
  - 참조 해제
  - _Requirements: 3.3_

- [x] 6. 테스트 및 검증
  - 브라우저에서 수동 테스트
  - 다양한 시나리오 확인
  - 에러 케이스 테스트
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_

- [x] 6.1 기본 기능 테스트
  - 페이지 로드 시 차트 표시 확인
  - 데이터 로드 확인
  - 현재가 표시 확인
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 6.2 타임프레임 전환 테스트
  - 각 타임프레임 전환 확인
  - 데이터 업데이트 확인
  - _Requirements: 4.1, 4.2_

- [x] 6.3 실시간 업데이트 테스트
  - 실시간 토글 확인
  - 자동 업데이트 확인
  - 폴링 중지 확인
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6.4 에러 케이스 테스트
  - 네트워크 에러 시나리오
  - 잘못된 심볼 시나리오
  - 데이터 없음 시나리오
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
