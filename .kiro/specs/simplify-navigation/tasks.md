# Implementation Plan

- [x] 1. Header.svelte에 "실시간" 메뉴 추가
  - 데스크톱 네비게이션에 "실시간" 링크 추가 (href="/realtime")
  - 활성 상태 조건 추가 (`$page.url.pathname === '/realtime'`)
  - 기존 메뉴들과 동일한 스타일 적용
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Header.svelte 모바일 메뉴에 "실시간" 추가
  - 모바일 네비게이션 패널에 "실시간" 링크 추가
  - 클릭 시 메뉴 닫기 기능 적용 (`onclick={() => (showMobileMenu = false)}`)
  - 활성 상태 조건 추가
  - 기존 메뉴들과 동일한 스타일 적용
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. +page.svelte에서 네비게이션 버튼 섹션 제거
  - `<nav class="nav-links">` 섹션 전체 제거
  - 관련 CSS 스타일 제거 (.nav-links, .nav-link, .nav-link:hover, .nav-link.active)
  - 헤더 타이틀과 설명은 유지
  - _Requirements: 1.1, 1.2, 1.3_
