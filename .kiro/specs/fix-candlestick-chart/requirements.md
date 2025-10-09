# Requirements Document

## Introduction

실시간 캔들차트 컴포넌트가 제대로 작동하지 않는 문제를 해결합니다. 현재 차트 초기화 타이밍 문제로 인해 "chart.addCandlestickSeries is not a function" 에러가 발생하고 있습니다.

## Requirements

### Requirement 1: 차트 컴포넌트 정상 작동

**User Story:** 사용자로서, 실시간 캔들차트 페이지에 접속하면 나스닥-100 선물의 캔들차트가 정상적으로 표시되기를 원합니다.

#### Acceptance Criteria

1. WHEN 사용자가 `/realtime` 페이지에 접속 THEN 로딩 인디케이터가 표시되어야 합니다
2. WHEN 데이터 로딩이 완료 THEN 캔들차트가 화면에 표시되어야 합니다
3. WHEN 차트가 표시 THEN 최소 1개 이상의 캔들이 보여야 합니다
4. WHEN 차트 초기화 실패 THEN 명확한 에러 메시지가 표시되어야 합니다

### Requirement 2: Lightweight Charts 라이브러리 올바른 사용

**User Story:** 개발자로서, Lightweight Charts 라이브러리를 올바르게 사용하여 차트를 초기화하고 데이터를 표시하고 싶습니다.

#### Acceptance Criteria

1. WHEN 컴포넌트가 마운트 THEN `createChart()` 함수가 정상적으로 호출되어야 합니다
2. WHEN 차트가 생성 THEN `addCandlestickSeries()` 메서드가 사용 가능해야 합니다
3. WHEN 캔들스틱 시리즈 생성 THEN `setData()` 메서드로 데이터를 설정할 수 있어야 합니다
4. WHEN 데이터 업데이트 THEN `update()` 메서드로 실시간 업데이트가 가능해야 합니다

### Requirement 3: DOM 바인딩 타이밍 문제 해결

**User Story:** 개발자로서, Svelte 5의 라이프사이클에 맞춰 DOM 요소가 준비된 후에 차트를 초기화하고 싶습니다.

#### Acceptance Criteria

1. WHEN 컴포넌트 마운트 THEN `chartContainer` DOM 요소가 바인딩되어야 합니다
2. WHEN DOM 바인딩 완료 THEN 차트 초기화가 시작되어야 합니다
3. WHEN 차트 초기화 중 에러 발생 THEN 재시도 로직이 실행되어야 합니다
4. WHEN 재시도 실패 THEN 사용자에게 명확한 에러 메시지가 표시되어야 합니다

### Requirement 4: 타임프레임 전환 기능

**User Story:** 사용자로서, 1분봉, 5분봉, 15분봉, 1시간봉, 일봉 사이를 자유롭게 전환하고 싶습니다.

#### Acceptance Criteria

1. WHEN 사용자가 타임프레임 버튼 클릭 THEN 해당 타임프레임 데이터가 로드되어야 합니다
2. WHEN 타임프레임 변경 THEN 기존 차트가 새 데이터로 업데이트되어야 합니다
3. WHEN 타임프레임 변경 중 THEN 로딩 인디케이터가 표시되어야 합니다
4. WHEN 타임프레임 변경 실패 THEN 이전 타임프레임으로 롤백되어야 합니다

### Requirement 5: 실시간 업데이트 기능

**User Story:** 사용자로서, 실시간 버튼을 클릭하면 자동으로 최신 데이터가 업데이트되기를 원합니다.

#### Acceptance Criteria

1. WHEN 사용자가 실시간 버튼 클릭 THEN 자동 폴링이 시작되어야 합니다
2. WHEN 폴링 활성화 THEN 🔴 라이브 인디케이터가 표시되어야 합니다
3. WHEN 새 데이터 수신 THEN 차트가 자동으로 업데이트되어야 합니다
4. WHEN 사용자가 정지 버튼 클릭 THEN 폴링이 중지되어야 합니다

### Requirement 6: 에러 처리 및 사용자 피드백

**User Story:** 사용자로서, 문제가 발생했을 때 무엇이 잘못되었는지 알고 싶습니다.

#### Acceptance Criteria

1. WHEN API 호출 실패 THEN 네트워크 에러 메시지가 표시되어야 합니다
2. WHEN 차트 초기화 실패 THEN 차트 초기화 에러 메시지가 표시되어야 합니다
3. WHEN 데이터가 없음 THEN "데이터 없음" 메시지가 표시되어야 합니다
4. WHEN 에러 발생 THEN "다시 시도" 버튼이 제공되어야 합니다
