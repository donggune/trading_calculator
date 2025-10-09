import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const FRED_API_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_API_KEY = Deno.env.get('FRED_API_KEY');
const BOK_API_BASE_URL = 'https://ecos.bok.or.kr/api/StatisticSearch';
const BOK_API_KEY = Deno.env.get('BOK_API_KEY');

function roundToTwo(value: number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  return Math.round(value * 100) / 100;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 심볼 설정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SymbolConfig {
  symbol: string;
  dbSymbol: string;
  name: string;
  assetType: string;
  currency: string;
  apiType?: 'yahoo' | 'fred' | 'bok';
  fredSeriesId?: string;
  bokStatCode?: string;
  bokItemCode?: string;
}

const SYMBOLS: SymbolConfig[] = [
  // 미국 M2
  {
    symbol: 'M2SL',
    dbSymbol: 'M2',
    name: 'M2 Money Supply',
    assetType: 'economic_indicator',
    currency: 'USD',
    apiType: 'fred',
    fredSeriesId: 'M2SL'
  },
  // 한국 M2
  {
    symbol: 'M2_KR',
    dbSymbol: 'M2_KR',
    name: 'Korea M2 Money Supply',
    assetType: 'economic_indicator',
    currency: 'KRW',
    apiType: 'bok',
    bokStatCode: '101Y001',
    bokItemCode: 'BBGS00'
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Yahoo Finance 과거 데이터 가져오기
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface HistoricalData {
  timestamps: number[];
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  volume: (number | null)[];
}

async function fetchYahooHistoricalData(symbol: string, days = 90): Promise<HistoricalData> {
  console.log(`📊 Fetching ${days} days of historical data for ${symbol}...`);
  
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - (days * 24 * 60 * 60);
  
  const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Yahoo Finance API responded with status ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.chart?.result?.[0]) {
    throw new Error(`No data returned for ${symbol}`);
  }
  
  const quote = result.chart.result[0];
  const timestamps = quote.timestamp || [];
  const indicators = quote.indicators.quote[0];
  
  return {
    timestamps,
    open: indicators.open || [],
    high: indicators.high || [],
    low: indicators.low || [],
    close: indicators.close || [],
    volume: indicators.volume || []
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BOK API 과거 데이터 가져오기 (한국은행)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchBOKHistoricalData(statCode: string, itemCode: string, months = 30): Promise<HistoricalData> {
  console.log(`📊 Fetching ${months} months of BOK data for ${statCode}/${itemCode}...`);
  
  if (!BOK_API_KEY) {
    throw new Error('BOK_API_KEY environment variable is not set');
  }
  
  // 시작일과 종료일 계산 (YYYYMM 형식)
  const now = new Date();
  const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const startDateObj = new Date(now);
  startDateObj.setMonth(startDateObj.getMonth() - months);
  const startDate = `${startDateObj.getFullYear()}${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;
  
  // BOK API 요청 (월별 데이터, 최대 100개)
  const url = `${BOK_API_BASE_URL}/${BOK_API_KEY}/json/kr/1/100/${statCode}/M/${startDate}/${endDate}/${itemCode}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`BOK API responded with status ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.StatisticSearch?.row || result.StatisticSearch.row.length === 0) {
    throw new Error(`No data returned from BOK for ${statCode}/${itemCode}`);
  }
  
  // BOK 데이터를 Yahoo Finance 형식으로 변환
  const timestamps: number[] = [];
  const close: number[] = [];
  const open: number[] = [];
  const high: number[] = [];
  const low: number[] = [];
  const volume: number[] = [];
  
  // 시간순 정렬
  const rows = result.StatisticSearch.row.sort((a: any, b: any) => a.TIME.localeCompare(b.TIME));
  
  for (const row of rows) {
    const value = parseFloat(row.DATA_VALUE);
    
    if (isNaN(value)) {
      continue; // 결측값 건너뛰기
    }
    
    // YYYYMM 형식을 Date로 변환 (해당 월의 1일로 설정)
    const year = parseInt(row.TIME.substring(0, 4));
    const month = parseInt(row.TIME.substring(4, 6)) - 1; // JavaScript month는 0-based
    const date = new Date(year, month, 1);
    const timestamp = Math.floor(date.getTime() / 1000);
    
    timestamps.push(timestamp);
    close.push(value);
    open.push(value);
    high.push(value);
    low.push(value);
    volume.push(0); // M2는 거래량이 없음
  }
  
  return {
    timestamps,
    open,
    high,
    low,
    close,
    volume
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FRED API 과거 데이터 가져오기
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchFREDHistoricalData(seriesId: string, days = 900): Promise<HistoricalData> {
  console.log(`📊 Fetching ${days} days of FRED data for ${seriesId}...`);
  
  if (!FRED_API_KEY) {
    throw new Error('FRED_API_KEY environment variable is not set');
  }
  
  const observationDate = new Date();
  observationDate.setDate(observationDate.getDate() - days);
  const observationStart = observationDate.toISOString().split('T')[0];
  
  const url = `${FRED_API_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${observationStart}&sort_order=asc`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`FRED API responded with status ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.observations || result.observations.length === 0) {
    throw new Error(`No data returned from FRED for series ${seriesId}`);
  }
  
  // FRED 데이터를 Yahoo Finance 형식으로 변환
  const timestamps: number[] = [];
  const close: number[] = [];
  const open: number[] = [];
  const high: number[] = [];
  const low: number[] = [];
  const volume: number[] = [];
  
  for (const obs of result.observations) {
    if (obs.value === '.' || obs.value === null) {
      continue; // 결측값 건너뛰기
    }
    
    const value = parseFloat(obs.value);
    const timestamp = Math.floor(new Date(obs.date).getTime() / 1000);
    
    timestamps.push(timestamp);
    close.push(value);
    open.push(value);
    high.push(value);
    low.push(value);
    volume.push(0); // M2는 거래량이 없음
  }
  
  return {
    timestamps,
    open,
    high,
    low,
    close,
    volume
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 데이터베이스에 과거 데이터 저장 (Upsert)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function upsertHistoricalData(
  supabase: any,
  symbol: string,
  name: string,
  assetType: string,
  currency: string,
  timestamp: number,
  open: number | null,
  high: number | null,
  low: number | null,
  close: number | null,
  volume: number | null,
  apiSource: string
): Promise<'inserted' | 'updated' | false> {
  const date = new Date(timestamp * 1000);
  const dateOnly = date.toISOString().split('T')[0];
  
  // 해당 날짜에 데이터가 있는지 확인
  const { data: existing, error: selectError } = await supabase
    .from('financial_dashboard_prices')
    .select('id')
    .eq('symbol', symbol)
    .gte('created_at', `${dateOnly}T00:00:00`)
    .lt('created_at', `${dateOnly}T23:59:59`)
    .single();
  
  if (selectError && selectError.code !== 'PGRST116') {
    console.error(`❌ Error checking existing data for ${symbol} at ${dateOnly}:`, selectError.message);
    return false;
  }
  
  const dataToSave = {
    asset_type: assetType,
    symbol: symbol,
    name: name,
    currency: currency,
    price: roundToTwo(close),
    change: 0,
    change_percent: 0,
    open: roundToTwo(open),
    high: roundToTwo(high),
    low: roundToTwo(low),
    prev_close: roundToTwo(open),
    volume: roundToTwo(volume),
    extra_data: {},
    api_source: apiSource,
    api_timestamp: date.toISOString(),
    is_mock: false,
    updated_at: new Date().toISOString()
  };
  
  if (existing) {
    const { error: updateError } = await supabase
      .from('financial_dashboard_prices')
      .update(dataToSave)
      .eq('id', existing.id);
    
    if (updateError) {
      console.error(`❌ Error updating data for ${symbol} at ${dateOnly}:`, updateError.message);
      return false;
    }
    return 'updated';
  } else {
    const { error: insertError } = await supabase
      .from('financial_dashboard_prices')
      .insert({
        ...dataToSave,
        created_at: date.toISOString()
      });
    
    if (insertError) {
      console.error(`❌ Error inserting data for ${symbol} at ${dateOnly}:`, insertError.message);
      return false;
    }
    return 'inserted';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 심볼별 과거 데이터 수집 및 저장
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SeedResult {
  symbol: string;
  name: string;
  insertCount: number;
  updateCount: number;
  errorCount: number;
  error?: string;
}

async function seedHistoricalDataForSymbol(
  supabase: any,
  config: SymbolConfig,
  days = 90
): Promise<SeedResult> {
  try {
    console.log(`\n🔄 Starting data collection for ${config.name}...`);
    
    let historicalData: HistoricalData;
    let apiSource: string;
    
    // API 타입에 따라 적절한 함수 호출
    if (config.apiType === 'fred' && config.fredSeriesId) {
      historicalData = await fetchFREDHistoricalData(config.fredSeriesId, days);
      apiSource = 'fred-api';
    } else if (config.apiType === 'bok' && config.bokStatCode && config.bokItemCode) {
      // BOK는 월별 데이터이므로 days를 months로 변환 (30개월)
      const months = 30;
      historicalData = await fetchBOKHistoricalData(config.bokStatCode, config.bokItemCode, months);
      apiSource = 'bok-api';
    } else {
      historicalData = await fetchYahooHistoricalData(config.symbol, days);
      apiSource = 'yahoo-finance';
    }
    
    const { timestamps, open, high, low, close, volume } = historicalData;
    
    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < timestamps.length; i++) {
      if (close[i] === null || close[i] === undefined) {
        continue;
      }
      
      const result = await upsertHistoricalData(
        supabase,
        config.dbSymbol,
        config.name,
        config.assetType,
        config.currency,
        timestamps[i],
        open[i],
        high[i],
        low[i],
        close[i],
        volume[i],
        apiSource
      );
      
      if (result === 'inserted') {
        insertCount++;
      } else if (result === 'updated') {
        updateCount++;
      } else {
        errorCount++;
      }
      
      // API 요청 제한을 피하기 위한 지연
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ ${config.name}: ${insertCount} inserted, ${updateCount} updated, ${errorCount} errors`);
    
    return {
      symbol: config.dbSymbol,
      name: config.name,
      insertCount,
      updateCount,
      errorCount
    };
  } catch (error) {
    console.error(`❌ Failed to seed data for ${config.name}:`, error);
    return {
      symbol: config.dbSymbol,
      name: config.name,
      insertCount: 0,
      updateCount: 0,
      errorCount: 1,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 핸들러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    console.log('🚀 Starting historical data seeding...');
    console.log(`📅 Collecting historical data for ${SYMBOLS.length} assets`);
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
    
    const results: SeedResult[] = [];
    
    for (const config of SYMBOLS) {
      // M2는 900일 (약 30개월, 월별 데이터이므로 충분한 기간 필요), 나머지는 90일
      const daysToFetch = 900;
      
      const result = await seedHistoricalDataForSymbol(
        supabase,
        config,
        daysToFetch
      );
      results.push(result);
      
      // 심볼 간 대기 (레이트 리밋 방지)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const totalInserted = results.reduce((sum, r) => sum + r.insertCount, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updateCount, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
    
    console.log('✨ Historical data seeding completed!');
    console.log(`📊 Summary: ${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Historical data seeding completed',
        data: {
          totalAssets: SYMBOLS.length,
          totalInserted,
          totalUpdated,
          totalErrors,
          results
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('❌ Error seeding historical data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
