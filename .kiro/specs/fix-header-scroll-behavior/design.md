# Design Document

## Overview

헤더의 포지션을 `fixed`에서 `sticky`로 변경하여 자연스러운 스크롤 경험을 제공하고, 동시에 글래스모피즘 디자인을 적용하여 모던하고 세련된 UI를 구현합니다. 이를 통해 사용자는 일반적인 웹사이트와 동일한 스크롤 경험을 하면서도 시각적으로 더 매력적인 인터페이스를 경험할 수 있습니다.

## Architecture

### Component Structure

```
Header.svelte
├── <header> (sticky positioning)
│   ├── Glass effect styles
│   ├── Navigation content
│   └── User menu
└── Mobile menu panel (adjusted positioning)
```

### Key Changes

1. **Position Change**: `fixed` → `sticky`
2. **Glass Effect**: 반투명 배경 + backdrop-filter blur
3. **Layout Adjustment**: 헤더 높이 보정용 div 제거
4. **Mobile Menu**: 포지션 조정 (top-16 유지하되 sticky 기준)

## Components and Interfaces

### Header Component

**Current State:**
- `position: fixed`
- `background: black` (완전 불투명)
- 헤더 높이 보정용 `<div class="h-16"></div>` 존재

**New State:**
- `position: sticky`
- 글래스모피즘 배경 효과
- 헤더 높이 보정 div 제거

### Glass Effect Styles

```css
header {
  position: sticky;
  top: 0;
  background: rgba(0, 0, 0, 0.7); /* 반투명 검정 */
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}
```

### Mobile Menu Positioning

**Current:**
```css
.mobile-menu {
  position: fixed;
  top: 16; /* 64px - 헤더 높이 */
}
```

**New:**
```css
.mobile-menu {
  position: fixed; /* 유지 */
  top: 4rem; /* 헤더 높이만큼 */
}
```

## Data Models

변경 사항 없음 - 순수 UI/스타일 변경

## Error Handling

### Browser Compatibility

- `backdrop-filter`는 일부 구형 브라우저에서 지원되지 않을 수 있음
- Fallback: 반투명 배경만 적용 (blur 없이)
- `-webkit-backdrop-filter` 추가로 Safari 지원

### Layout Issues

- Sticky 포지션이 제대로 작동하지 않는 경우: 부모 요소의 `overflow` 속성 확인
- 현재 구조에서는 문제 없음 (부모에 overflow hidden 없음)

## Testing Strategy

### Visual Testing

1. **스크롤 동작 테스트**
   - 페이지를 아래로 스크롤하여 헤더가 사라지는지 확인
   - 페이지를 위로 스크롤하여 헤더가 다시 나타나는지 확인
   - 페이지 최상단에서 헤더가 정상 표시되는지 확인

2. **글래스 효과 테스트**
   - 헤더 배경이 반투명한지 확인
   - 블러 효과가 적용되는지 확인
   - 그림자 효과가 자연스러운지 확인

3. **반응형 테스트**
   - 데스크톱 (1920px, 1440px, 1024px)
   - 태블릿 (768px)
   - 모바일 (375px, 414px)

### Cross-browser Testing

- Chrome (최신)
- Firefox (최신)
- Safari (최신)
- Edge (최신)

### Mobile Testing

- iOS Safari
- Android Chrome
- 모바일 메뉴 열기/닫기 동작 확인

## Implementation Notes

### CSS Properties to Change

1. **Header element**
   - `position: fixed` → `position: sticky`
   - `background: black` → `background: rgba(0, 0, 0, 0.7)`
   - Add `backdrop-filter` and `-webkit-backdrop-filter`
   - Update `box-shadow` for floating effect

2. **Remove spacer div**
   - Delete `<div class="h-16"></div>` after header

3. **Mobile menu**
   - Keep `position: fixed` (모바일 메뉴는 fixed 유지)
   - Verify `top: 4rem` still works correctly

### Performance Considerations

- `backdrop-filter`는 GPU 가속을 사용하므로 성능에 큰 영향 없음
- 하지만 저사양 기기에서는 약간의 성능 저하 가능
- 필요시 `will-change: backdrop-filter` 추가 고려

### Accessibility

- 헤더의 시각적 변경이 스크린 리더에는 영향 없음
- 키보드 네비게이션 동작 확인 필요
- 포커스 스타일이 글래스 배경에서도 잘 보이는지 확인
