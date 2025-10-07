# 매매일지 기능 - 데이터베이스 연동 가이드

## 📊 개요

매매일지 기능은 사용자가 투자 거래를 기록하고 성과를 분석할 수 있는 기능입니다.

## 🗄️ 데이터베이스 구조

### 테이블: `financial_trading_entries`

```sql
CREATE TABLE financial_trading_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date DATE,
  symbol VARCHAR(20),
  action VARCHAR(10) CHECK (action IN ('buy', 'sell')),
  quantity NUMERIC(20, 8),
  price NUMERIC(20, 8),
  amount NUMERIC(20, 8),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## 🚀 설정 방법

### 1. Supabase 마이그레이션 실행

Supabase Dashboard에서 SQL Editor를 열고 다음 파일의 내용을 실행하세요:

```
supabase/migrations/create_trading_entries.sql
```

또는 Supabase CLI를 사용하는 경우:

```bash
supabase db push
```

### 2. Row Level Security (RLS)

테이블은 자동으로 RLS가 활성화되며, 사용자는 자신의 거래 기록만 조회/추가/수정/삭제할 수 있습니다.

## 📝 API 함수

### 위치: `src/lib/api/trading.ts`

#### `fetchTradingEntries()`

- 사용자의 모든 거래 기록 조회
- 날짜 기준 내림차순 정렬

#### `createTradingEntry(entry)`

- 새로운 거래 기록 추가
- 자동으로 user_id 설정

#### `deleteTradingEntry(id)`

- 거래 기록 삭제
- 자신의 기록만 삭제 가능

#### `updateTradingEntry(id, updates)`

- 거래 기록 수정
- 자신의 기록만 수정 가능

## 💡 사용 예시

```typescript
import { fetchTradingEntries, createTradingEntry, deleteTradingEntry } from '$lib/api/trading';

// 거래 기록 조회
const { data, error } = await fetchTradingEntries();

// 거래 추가
const newEntry = {
	date: '2024-01-15',
	symbol: 'NVDL',
	action: 'buy',
	quantity: 50,
	price: 100.0,
	amount: 5000.0,
	notes: 'AI 관련 ETF 매수',
	tags: ['AI', 'ETF']
};
const result = await createTradingEntry(newEntry);

// 거래 삭제
await deleteTradingEntry('entry-id');
```

## 🔐 보안

- **인증 필수**: 모든 작업은 로그인한 사용자만 가능
- **RLS 정책**: 각 사용자는 자신의 데이터만 접근 가능
- **Cascade 삭제**: 사용자 계정 삭제 시 관련 거래 기록 자동 삭제

## 📈 통계 기능

매매일지 페이지에서 자동으로 계산되는 통계:

- 총 거래 수
- 승률
- 총 수익/손실
- 순수익
- 평균 수익/손실
- 수익 팩터 (Profit Factor)

## 🎨 UI 컴포넌트

### 주요 기능

1. **거래 기록 테이블** (데스크톱)
2. **거래 기록 카드** (모바일)
3. **거래 추가 폼**
4. **통계 대시보드**
5. **로딩/에러 처리**

### 반응형 디자인

- 모바일: 카드 형태로 표시
- 데스크톱: 테이블 형태로 표시
- 태블릿: 적응형 레이아웃

## 🛠️ 문제 해결

### 데이터가 로드되지 않는 경우

1. Supabase 마이그레이션이 실행되었는지 확인
2. 사용자가 로그인되어 있는지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### RLS 정책 오류

```sql
-- Supabase SQL Editor에서 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'financial_trading_entries';
```

## 📚 관련 파일

- `src/routes/journal/+page.svelte` - 매매일지 페이지
- `src/lib/api/trading.ts` - API 함수
- `src/lib/types.ts` - TypeScript 타입 정의
- `supabase/migrations/create_trading_entries.sql` - 데이터베이스 마이그레이션
