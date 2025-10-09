# Design Document

## Overview

분석 페이지에서 월간 지표(M2 등)를 필터링하여 일일 데이터만 표시하도록 수정합니다. 이를 통해 정확한 단기 상관관계 분석이 가능하도록 합니다.

**핵심 설계 원칙:**
- 최소한의 코드 변경으로 문제 해결
- 기존 로직 재사용 (필터링만 추가)
- 확장 가능한 설계 (향후 월간 지표 자동 제외)

## Architecture

### 현재 구조

```
분석 페이지 (/analytics)
  ↓
loadData() 함수
  ↓
Supabase 쿼리 (모든 자산)
  ↓
심볼별 그룹화
  ↓
availableAssets 생성 (M2 포함)
  ↓
상관관계 행렬 생성 (M2 포함)
  ↓
히트맵 렌더링 (M2 표시)
```

### 변경 후 구조

```
분석 페이지 (/analytics)
  ↓
loadData() 함수
  ↓
Supabase 쿼리 (일일 데이터만) ← 필터 추가
  ↓
심볼별 그룹화
  ↓
availableAssets 생성 (M2 제외)
  ↓
상관관계 행렬 생성 (M2 제외)
  ↓
히트맵 렌더링 (M2 미표시)
```

## Components and Interfaces

### 1. 분석 페이지 수정

#### 파일: `src/routes/analytics/+page.svelte`

**변경 전:**
```typescript
const { data, error: fetchError } = await supabase
  .from('financial_dashboard_prices')
  .select('*')
  .gte('created_at', dateFilter)
  .order('created_at', { ascending: true });
```

**변경 후:**
```typescript
const { data, error: fetchError } = await supabase
  .from('financial_dashboard_prices')
  .select('*')
  .gte('created_at', dateFilter)
  .neq('asset_type', 'economic_indicator')  // 월간 지표 제외
  .order('created_at', { ascending: true });
```

### 2. 데이터 흐름

#### 필터링 효과

1. **Supabase 쿼리 레벨에서 필터링**
   - `asset_type != 'economic_indicator'` 조건 추가
   - M2 데이터가 쿼리 결과에서 제외됨

2. **자동 전파**
   - `grouped` 객체에 M2 키가 생성되지 않음
   - `availableAssets` 배열에 M2가 포함되지 않음
   - `correlationMatrix`에 M2가 포함되지 않음

3. **UI 자동 업데이트**
   - 자산 선택 칩에 M2가 표시되지 않음
   - 히트맵에 M2 행/열이 표시되지 않음

## Data Models

### FinancialPrice (변경 없음)

```typescript
export interface FinancialPrice {
  id: number;
  asset_type: 'gold' | 'stock_index' | 'currency_index' | 'cryptocurrency' | 'commodity' | 'currency' | 'economic_indicator';
  symbol: string;
  name: string;
  currency: string;
  price: number;
  // ... 기타 필드
}
```

### Asset Type 분류

```typescript
// 분석 페이지에서 제외되는 타입
const EXCLUDED_ASSET_TYPES = ['economic_indicator'];

// 분석 페이지에 포함되는 타입
const INCLUDED_ASSET_TYPES = [
  'gold',
  'stock_index', 
  'currency_index',
  'cryptocurrency',
  'commodity',
  'currency'
];
```

## Error Handling

### 1. 쿼리 에러 처리 (기존 유지)

```typescript
try {
  const { data, error: fetchError } = await supabase
    .from('financial_dashboard_prices')
    .select('*')
    .gte('created_at', dateFilter)
    .neq('asset_type', 'economic_indicator')
    .order('created_at', { ascending: true });

  if (fetchError) throw fetchError;
  
  // 데이터 처리...
} catch (e) {
  error = e instanceof Error ? e.message : '데이터를 불러오는데 실패했습니다.';
  console.error('데이터 로드 오류:', e);
}
```

### 2. 빈 데이터 처리 (기존 유지)

```typescript
// 데이터가 없어도 에러로 처리하지 않음
if (!data || data.length === 0) {
  historicalData = {};
  availableAssets = [];
  correlationMatrix = null;
  insights = [];
}
```

## Testing Strategy

### 1. 수동 테스트

#### 분석 페이지 확인
- [ ] 분석 페이지 접속
- [ ] 자산 선택 목록에 M2가 없는지 확인
- [ ] 히트맵에 M2 행/열이 없는지 확인
- [ ] 브라우저 콘솔에서 에러 확인

#### 대시보드 확인
- [ ] 대시보드 페이지 접속
- [ ] M2 카드가 경제 지표 섹션에 표시되는지 확인
- [ ] M2 차트가 렌더링되는지 확인

### 2. 브라우저 콘솔 확인

```javascript
// 개발자 도구 콘솔에서 확인
console.log('Available Assets:', availableAssets);
console.log('Has M2:', availableAssets.some(a => a.symbol === 'M2'));
// 결과: false

console.log('Historical Data Keys:', Object.keys(historicalData));
console.log('Has M2 Data:', 'M2' in historicalData);
// 결과: false
```

### 3. Supabase 쿼리 확인

```sql
-- 분석 페이지가 실행하는 쿼리 (시뮬레이션)
SELECT * 
FROM financial_dashboard_prices 
WHERE created_at >= '2025-09-09T00:00:00Z'
  AND asset_type != 'economic_indicator'
ORDER BY created_at ASC;

-- M2가 결과에 포함되지 않아야 함
```

## Performance Considerations

### 1. 쿼리 최적화

**변경 전:**
- 모든 자산 데이터 조회 (M2 포함)
- 클라이언트에서 필터링 없음

**변경 후:**
- 일일 데이터만 조회 (M2 제외)
- 데이터베이스 레벨에서 필터링
- 네트워크 전송량 감소

### 2. 인덱스 활용

```sql
-- 기존 인덱스 활용
CREATE INDEX idx_asset_type ON financial_dashboard_prices(asset_type);
CREATE INDEX idx_created_at ON financial_dashboard_prices(created_at);

-- 복합 인덱스 (선택사항)
CREATE INDEX idx_asset_type_created_at 
ON financial_dashboard_prices(asset_type, created_at);
```

## Security Considerations

### 1. SQL Injection 방지

```typescript
// ✅ Supabase 클라이언트 사용 (자동 이스케이핑)
.neq('asset_type', 'economic_indicator')

// ❌ 직접 SQL 작성 금지
```

### 2. 데이터 접근 제어

- RLS (Row Level Security) 정책 유지
- 인증된 사용자만 데이터 조회 가능

## Deployment

### 1. 배포 절차

```bash
# 1. 로컬 테스트
npm run dev
# 분석 페이지에서 M2 제외 확인

# 2. 빌드
npm run build

# 3. Vercel 배포 (자동)
git add .
git commit -m "feat: 분석 페이지에서 월간 지표 제외"
git push origin main
```

### 2. 배포 후 확인

- [ ] 프로덕션 분석 페이지에서 M2 제외 확인
- [ ] 프로덕션 대시보드에서 M2 표시 확인
- [ ] 브라우저 콘솔 에러 확인
- [ ] 모바일 반응형 확인

## Future Enhancements

### Phase 2 (향후 개선)

1. **장기 상관관계 분석 페이지**
   - 별도 페이지 생성 (`/analytics/long-term`)
   - 모든 데이터를 월간으로 리샘플링
   - M2 포함한 장기 상관관계 분석

2. **필터 옵션 추가**
   - 사용자가 분석 기간 선택 (7일, 30일, 90일)
   - 자산 타입 필터 (주식, 환율, 원자재 등)

3. **데이터 빈도 표시**
   - 각 자산의 데이터 빈도 표시 (일일, 주간, 월간)
   - 사용자에게 비교 가능 여부 안내

## Migration Notes

### 변경 사항 요약

- **파일 수정:** 1개 (`src/routes/analytics/+page.svelte`)
- **코드 변경:** 1줄 추가 (`.neq('asset_type', 'economic_indicator')`)
- **데이터베이스 변경:** 없음
- **API 변경:** 없음
- **Breaking Changes:** 없음

### 롤백 계획

문제 발생 시 해당 줄 제거:
```typescript
// 이 줄만 제거하면 원래대로 복구
.neq('asset_type', 'economic_indicator')
```
