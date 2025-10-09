# Design Document

## Overview

이 디자인은 BullGaze 애플리케이션의 네비게이션을 개선하기 위한 것입니다. 홈페이지에 있는 중복된 큰 네비게이션 버튼들을 제거하고, 상단 헤더에 "실시간" 메뉴를 추가하여 사용자가 모든 페이지에 일관되게 접근할 수 있도록 합니다.

## Architecture

### 컴포넌트 구조

```
src/
├── routes/
│   ├── +page.svelte          # 홈페이지 (네비게이션 버튼 제거)
│   └── ...
└── lib/
    └── components/
        └── Header.svelte      # 헤더 컴포넌트 ("실시간" 메뉴 추가)
```

### 변경 사항 요약

1. **Header.svelte**: 기존 메뉴 유지 + "실시간" 메뉴 추가
2. **+page.svelte**: 큰 네비게이션 버튼 섹션 제거

## Components and Interfaces

### 1. Header.svelte 수정

#### 데스크톱 네비게이션
- 기존 메뉴: "홈", "분석", "계산기", "매매일지"
- 추가 메뉴: "실시간" (href="/realtime")
- 활성 상태: `$page.url.pathname === '/realtime'` 조건으로 파란색 표시

#### 모바일 네비게이션
- 햄버거 메뉴 내부에 동일한 5개 메뉴 표시
- "실시간" 메뉴 클릭 시 `/realtime`으로 이동하고 메뉴 닫기

#### 코드 변경 위치

**데스크톱 네비게이션 (약 45-70번째 줄):**
```svelte
<nav class="hidden items-center gap-6 md:flex">
  <a href="/" ...>홈</a>
  <a href="/analytics" ...>분석</a>
  <a href="/calculator" ...>계산기</a>
  <a href="/journal" ...>매매일지</a>
  <!-- 추가 -->
  <a href="/realtime" ...>실시간</a>
</nav>
```

**모바일 네비게이션 (약 180-220번째 줄):**
```svelte
<div class="flex flex-col gap-2">
  <a href="/" ...>홈</a>
  <a href="/analytics" ...>분석</a>
  <a href="/calculator" ...>계산기</a>
  <a href="/journal" ...>매매일지</a>
  <!-- 추가 -->
  <a href="/realtime" ...>실시간</a>
  ...
</div>
```

### 2. +page.svelte 수정

#### 제거할 섹션
홈페이지의 `dashboard-header` 내부에 있는 네비게이션 링크 섹션을 제거합니다.

**제거할 코드 (약 560-580번째 줄):**
```svelte
<!-- 네비게이션 -->
<nav class="nav-links">
  <a href="/" class="nav-link active">💼 대시보드</a>
  <a href="/calculator" class="nav-link">🧮 계산기</a>
  <a href="/analytics" class="nav-link">📈 분석</a>
  <a href="/journal" class="nav-link">📝 매매일지</a>
  <a href="/realtime" class="nav-link">🕯️ 실시간</a>
</nav>
```

**제거할 스타일 (약 750-800번째 줄):**
```css
.nav-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.nav-link {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.nav-link.active {
  background: rgba(96, 165, 250, 0.2);
  border-color: rgba(96, 165, 250, 0.5);
  color: white;
}
```

## Data Models

이 변경사항은 UI만 수정하므로 데이터 모델 변경이 없습니다.

## Error Handling

### 잠재적 문제
1. **링크 경로 오류**: `/realtime` 경로가 존재하는지 확인 필요
2. **활성 상태 표시**: 경로 매칭이 정확한지 확인 필요

### 해결 방법
1. 실시간 페이지가 `src/routes/realtime/+page.svelte`에 존재하는지 확인
2. `$page.url.pathname === '/realtime'` 조건이 올바르게 작동하는지 테스트

## Testing Strategy

### 수동 테스트

#### 데스크톱 테스트
1. 홈페이지 방문 → 큰 네비게이션 버튼들이 보이지 않는지 확인
2. 헤더에 "실시간" 메뉴가 표시되는지 확인
3. "실시간" 메뉴 클릭 → `/realtime` 페이지로 이동하는지 확인
4. `/realtime` 페이지에서 "실시간" 메뉴가 파란색(활성 상태)으로 표시되는지 확인
5. 다른 메뉴들("홈", "분석", "계산기", "매매일지")이 정상 작동하는지 확인

#### 모바일 테스트
1. 모바일 화면에서 햄버거 메뉴 클릭
2. "실시간" 메뉴가 표시되는지 확인
3. "실시간" 메뉴 클릭 → `/realtime` 페이지로 이동하고 메뉴가 닫히는지 확인
4. `/realtime` 페이지에서 햄버거 메뉴 열기 → "실시간" 메뉴가 활성 상태로 표시되는지 확인

#### 스타일 테스트
1. "실시간" 메뉴가 다른 메뉴들과 동일한 스타일로 표시되는지 확인
2. 호버 효과가 정상 작동하는지 확인
3. 반응형 디자인이 정상 작동하는지 확인 (데스크톱 ↔ 모바일)

### 브라우저 호환성
- Chrome, Firefox, Safari, Edge에서 테스트
- 모바일 브라우저(iOS Safari, Chrome Mobile)에서 테스트

## Implementation Notes

### 우선순위
1. **높음**: Header.svelte에 "실시간" 메뉴 추가
2. **높음**: +page.svelte에서 네비게이션 버튼 제거
3. **중간**: 스타일 일관성 확인
4. **낮음**: 브라우저 호환성 테스트

### 주의사항
- 기존 메뉴들의 기능이 영향받지 않도록 주의
- 로그인/로그아웃 기능이 정상 작동하는지 확인
- 모바일 메뉴의 `showMobileMenu` 상태 관리가 정상 작동하는지 확인
