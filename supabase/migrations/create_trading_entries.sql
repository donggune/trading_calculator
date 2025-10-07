-- 매매일지 테이블 생성
CREATE TABLE IF NOT EXISTS financial_trading_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20, 8) NOT NULL CHECK (price > 0),
  amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_financial_trading_entries_user_id ON financial_trading_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_trading_entries_date ON financial_trading_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_trading_entries_symbol ON financial_trading_entries(symbol);

-- RLS (Row Level Security) 활성화
ALTER TABLE financial_trading_entries ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 거래 기록만 조회 가능
CREATE POLICY "Users can view their own trading entries"
  ON financial_trading_entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- 정책: 사용자는 자신의 거래 기록만 추가 가능
CREATE POLICY "Users can insert their own trading entries"
  ON financial_trading_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 정책: 사용자는 자신의 거래 기록만 수정 가능
CREATE POLICY "Users can update their own trading entries"
  ON financial_trading_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 정책: 사용자는 자신의 거래 기록만 삭제 가능
CREATE POLICY "Users can delete their own trading entries"
  ON financial_trading_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 생성
CREATE TRIGGER update_financial_trading_entries_updated_at
  BEFORE UPDATE ON financial_trading_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

