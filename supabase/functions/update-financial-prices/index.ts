import { createClient } from 'jsr:@supabase/supabase-js@2';

const YAHOO_FINANCE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_API_KEY = Deno.env.get('FRED_API_KEY');
const BOK_API_URL = 'https://ecos.bok.or.kr/api/StatisticSearch';
const BOK_API_KEY = Deno.env.get('BOK_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function roundToTwo(value) {
  if (value === undefined || value === null) return 0;
  return Math.round(value * 100) / 100;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Yahoo Finance 공통 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchYahooFinance(symbol) {
  const response = await fetch(`${YAHOO_FINANCE_URL}/${symbol}`);
  if (!response.ok) {
    throw new Error(`Yahoo Finance API responded with status ${response.status}`);
  }
  const result = await response.json();
  if (!result.chart?.result?.[0]?.meta) {
    throw new Error('No data returned from Yahoo Finance API');
  }
  return result.chart.result[0].meta;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 미국 M2 통화 공급량 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateM2MoneySupply(supabase) {
  try {
    console.log('📊 Fetching M2 Money Supply from FRED API...');

    if (!FRED_API_KEY) {
      throw new Error('FRED_API_KEY not found in environment variables');
    }

    // FRED API 요청 (최근 2개 관측값)
    const url = `${FRED_API_URL}?series_id=M2SL&api_key=${FRED_API_KEY}&file_type=json&limit=2&sort_order=desc`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FRED API responded with status ${response.status}`);
    }

    const result = await response.json();

    if (!result.observations || result.observations.length < 2) {
      throw new Error('Insufficient M2 data from FRED API');
    }

    // 최신 2개 데이터 (내림차순이므로 [0]이 최신)
    const latest = result.observations[0];
    const previous = result.observations[1];

    const latestValue = parseFloat(latest.value);
    const previousValue = parseFloat(previous.value);

    if (isNaN(latestValue) || isNaN(previousValue)) {
      throw new Error('Invalid M2 value from FRED API');
    }

    // 변화량 및 변화율 계산
    const change = roundToTwo(latestValue - previousValue);
    const changePercent = roundToTwo((change / previousValue) * 100);

    console.log(`✅ M2 fetched: ${latestValue} (${changePercent}%)`);

    // 데이터베이스에 저장
    const { error } = await supabase
      .from('financial_dashboard_prices')
      .insert({
        asset_type: 'economic_indicator',
        symbol: 'M2',
        name: 'M2 Money Supply',
        currency: 'USD',
        price: roundToTwo(latestValue),
        change: change,
        change_percent: changePercent,
        prev_close: roundToTwo(previousValue),
        extra_data: {
          observation_date: latest.date,
          unit: 'Billions of Dollars'
        },
        api_source: 'fred-api',
        api_timestamp: new Date().toISOString(),
        is_mock: false
      });

    if (error) throw error;

    console.log('✅ M2 Money Supply saved to database');

    return {
      price: roundToTwo(latestValue),
      change: change,
      changePercent: changePercent,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update M2 Money Supply:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 한국 M2 통화 공급량 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateKoreaM2MoneySupply(supabase) {
  try {
    console.log('📊 Fetching Korea M2 Money Supply from BOK API...');

    if (!BOK_API_KEY) {
      throw new Error('BOK_API_KEY not found in environment variables');
    }

    // 최근 6개월 데이터 요청 (여유있게)
    const now = new Date();
    const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const startDateObj = new Date(now);
    startDateObj.setMonth(startDateObj.getMonth() - 6);
    const startDate = `${startDateObj.getFullYear()}${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;

    // BOK API 요청 (통계표: 101Y001, 항목: BBGS00 - M2 말잔 계절조정)
    const url = `${BOK_API_URL}/${BOK_API_KEY}/json/kr/1/10/101Y001/M/${startDate}/${endDate}/BBGS00`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`BOK API responded with status ${response.status}`);
    }

    const result = await response.json();

    if (!result.StatisticSearch?.row || result.StatisticSearch.row.length < 2) {
      throw new Error('Insufficient Korea M2 data from BOK API');
    }

    // 최근 2개 데이터 (시간순 정렬)
    const rows = result.StatisticSearch.row.sort((a, b) => b.TIME.localeCompare(a.TIME));
    const latest = rows[0];
    const previous = rows[1];

    const latestValue = parseFloat(latest.DATA_VALUE);
    const previousValue = parseFloat(previous.DATA_VALUE);

    if (isNaN(latestValue) || isNaN(previousValue)) {
      throw new Error('Invalid Korea M2 value from BOK API');
    }

    // 변화량 및 변화율 계산
    const change = roundToTwo(latestValue - previousValue);
    const changePercent = roundToTwo((change / previousValue) * 100);

    console.log(`✅ Korea M2 fetched: ${latestValue} (${changePercent}%)`);

    // 데이터베이스에 저장
    const { error } = await supabase
      .from('financial_dashboard_prices')
      .insert({
        asset_type: 'economic_indicator',
        symbol: 'M2_KR',
        name: 'Korea M2 Money Supply',
        currency: 'KRW',
        price: roundToTwo(latestValue),
        change: change,
        change_percent: changePercent,
        prev_close: roundToTwo(previousValue),
        extra_data: {
          observation_date: latest.TIME,
          unit: '십억원 (Billion KRW)'
        },
        api_source: 'bok-api',
        api_timestamp: new Date().toISOString(),
        is_mock: false
      });

    if (error) throw error;

    console.log('✅ Korea M2 Money Supply saved to database');

    return {
      price: roundToTwo(latestValue),
      change: change,
      changePercent: changePercent,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update Korea M2 Money Supply:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 금 선물 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateGoldFutures(supabase) {
  try {
    console.log('📊 Fetching Gold Futures from Yahoo Finance...');
    const goldData = await fetchYahooFinance('GC=F');
    console.log('✅ Gold Futures fetched:', goldData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'commodity',
      symbol: 'GC',
      name: 'Gold Futures (GC)',
      currency: 'USD',
      price: roundToTwo(goldData.regularMarketPrice),
      change: roundToTwo(goldData.regularMarketChange),
      change_percent: roundToTwo(goldData.regularMarketChangePercent),
      open: roundToTwo(goldData.regularMarketOpen),
      high: roundToTwo(goldData.regularMarketDayHigh),
      low: roundToTwo(goldData.regularMarketDayLow),
      prev_close: roundToTwo(goldData.regularMarketPreviousClose),
      volume: roundToTwo(goldData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ Gold Futures saved to database');
    return {
      price: roundToTwo(goldData.regularMarketPrice),
      change: roundToTwo(goldData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update Gold Futures:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 나스닥 종합지수 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateNasdaqComposite(supabase) {
  try {
    console.log('📊 Fetching NASDAQ Composite from Yahoo Finance...');
    const nasdaqData = await fetchYahooFinance('^IXIC');
    console.log('✅ NASDAQ Composite fetched:', nasdaqData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'stock_index',
      symbol: 'IXIC',
      name: 'NASDAQ Composite (IXIC)',
      currency: 'USD',
      price: roundToTwo(nasdaqData.regularMarketPrice),
      change: roundToTwo(nasdaqData.regularMarketChange),
      change_percent: roundToTwo(nasdaqData.regularMarketChangePercent),
      open: roundToTwo(nasdaqData.regularMarketOpen),
      high: roundToTwo(nasdaqData.regularMarketDayHigh),
      low: roundToTwo(nasdaqData.regularMarketDayLow),
      prev_close: roundToTwo(nasdaqData.regularMarketPreviousClose),
      volume: roundToTwo(nasdaqData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ NASDAQ Composite saved to database');
    return {
      price: roundToTwo(nasdaqData.regularMarketPrice),
      change: roundToTwo(nasdaqData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update NASDAQ Composite:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 달러 지수 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateDollarIndex(supabase) {
  try {
    console.log('📊 Fetching Dollar Index from Yahoo Finance...');
    const dollarData = await fetchYahooFinance('DX-Y.NYB');
    console.log('✅ Dollar Index fetched:', dollarData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'currency_index',
      symbol: 'DXY',
      name: 'U.S. Dollar Index (DXY)',
      currency: 'USD',
      price: roundToTwo(dollarData.regularMarketPrice),
      change: roundToTwo(dollarData.regularMarketChange),
      change_percent: roundToTwo(dollarData.regularMarketChangePercent),
      open: roundToTwo(dollarData.regularMarketOpen),
      high: roundToTwo(dollarData.regularMarketDayHigh),
      low: roundToTwo(dollarData.regularMarketDayLow),
      prev_close: roundToTwo(dollarData.regularMarketPreviousClose),
      volume: roundToTwo(dollarData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ Dollar Index saved to database');
    return {
      price: roundToTwo(dollarData.regularMarketPrice),
      change: roundToTwo(dollarData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update Dollar Index:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// S&P 500 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateSP500(supabase) {
  try {
    console.log('📊 Fetching S&P 500 from Yahoo Finance...');
    const sp500Data = await fetchYahooFinance('^GSPC');
    console.log('✅ S&P 500 fetched:', sp500Data.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'stock_index',
      symbol: 'SPX',
      name: 'S&P 500 (SPX)',
      currency: 'USD',
      price: roundToTwo(sp500Data.regularMarketPrice),
      change: roundToTwo(sp500Data.regularMarketChange),
      change_percent: roundToTwo(sp500Data.regularMarketChangePercent),
      open: roundToTwo(sp500Data.regularMarketOpen),
      high: roundToTwo(sp500Data.regularMarketDayHigh),
      low: roundToTwo(sp500Data.regularMarketDayLow),
      prev_close: roundToTwo(sp500Data.regularMarketPreviousClose),
      volume: roundToTwo(sp500Data.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ S&P 500 saved to database');
    return {
      price: roundToTwo(sp500Data.regularMarketPrice),
      change: roundToTwo(sp500Data.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update S&P 500:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 나스닥-100 선물 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateNasdaqFutures(supabase) {
  try {
    console.log('📊 Fetching NASDAQ-100 Futures from Yahoo Finance...');
    const nasdaqFuturesData = await fetchYahooFinance('NQ=F');
    console.log('✅ NASDAQ-100 Futures fetched:', nasdaqFuturesData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'stock_index',
      symbol: 'NQ',
      name: 'NASDAQ-100 Futures (NQ)',
      currency: 'USD',
      price: roundToTwo(nasdaqFuturesData.regularMarketPrice),
      change: roundToTwo(nasdaqFuturesData.regularMarketChange),
      change_percent: roundToTwo(nasdaqFuturesData.regularMarketChangePercent),
      open: roundToTwo(nasdaqFuturesData.regularMarketOpen),
      high: roundToTwo(nasdaqFuturesData.regularMarketDayHigh),
      low: roundToTwo(nasdaqFuturesData.regularMarketDayLow),
      prev_close: roundToTwo(nasdaqFuturesData.regularMarketPreviousClose),
      volume: roundToTwo(nasdaqFuturesData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ NASDAQ-100 Futures saved to database');
    return {
      price: roundToTwo(nasdaqFuturesData.regularMarketPrice),
      change: roundToTwo(nasdaqFuturesData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update NASDAQ-100 Futures:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 러셀 2000 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateRussell2000(supabase) {
  try {
    console.log('📊 Fetching Russell 2000 from Yahoo Finance...');
    const russellData = await fetchYahooFinance('^RUT');
    console.log('✅ Russell 2000 fetched:', russellData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'stock_index',
      symbol: 'RUT',
      name: 'Russell 2000 (RUT)',
      currency: 'USD',
      price: roundToTwo(russellData.regularMarketPrice),
      change: roundToTwo(russellData.regularMarketChange),
      change_percent: roundToTwo(russellData.regularMarketChangePercent),
      open: roundToTwo(russellData.regularMarketOpen),
      high: roundToTwo(russellData.regularMarketDayHigh),
      low: roundToTwo(russellData.regularMarketDayLow),
      prev_close: roundToTwo(russellData.regularMarketPreviousClose),
      volume: roundToTwo(russellData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ Russell 2000 saved to database');
    return {
      price: roundToTwo(russellData.regularMarketPrice),
      change: roundToTwo(russellData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update Russell 2000:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 원유 선물 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateCrudeOilFutures(supabase) {
  try {
    console.log('📊 Fetching Crude Oil Futures from Yahoo Finance...');
    const oilData = await fetchYahooFinance('CL=F');
    console.log('✅ Crude Oil Futures fetched:', oilData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'commodity',
      symbol: 'CL',
      name: 'Crude Oil Futures (CL)',
      currency: 'USD',
      price: roundToTwo(oilData.regularMarketPrice),
      change: roundToTwo(oilData.regularMarketChange),
      change_percent: roundToTwo(oilData.regularMarketChangePercent),
      open: roundToTwo(oilData.regularMarketOpen),
      high: roundToTwo(oilData.regularMarketDayHigh),
      low: roundToTwo(oilData.regularMarketDayLow),
      prev_close: roundToTwo(oilData.regularMarketPreviousClose),
      volume: roundToTwo(oilData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ Crude Oil Futures saved to database');
    return {
      price: roundToTwo(oilData.regularMarketPrice),
      change: roundToTwo(oilData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update Crude Oil Futures:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 미국 10년 국채 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateUS10YearTreasury(supabase) {
  try {
    console.log('📊 Fetching US 10-Year Treasury from Yahoo Finance...');
    const treasuryData = await fetchYahooFinance('^TNX');
    console.log('✅ US 10-Year Treasury fetched:', treasuryData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'currency_index',
      symbol: 'TNX',
      name: 'US 10-Year Treasury (TNX)',
      currency: 'USD',
      price: roundToTwo(treasuryData.regularMarketPrice),
      change: roundToTwo(treasuryData.regularMarketChange),
      change_percent: roundToTwo(treasuryData.regularMarketChangePercent),
      open: roundToTwo(treasuryData.regularMarketOpen),
      high: roundToTwo(treasuryData.regularMarketDayHigh),
      low: roundToTwo(treasuryData.regularMarketDayLow),
      prev_close: roundToTwo(treasuryData.regularMarketPreviousClose),
      volume: roundToTwo(treasuryData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ US 10-Year Treasury saved to database');
    return {
      price: roundToTwo(treasuryData.regularMarketPrice),
      change: roundToTwo(treasuryData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update US 10-Year Treasury:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 닛케이 225 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateNikkei225(supabase) {
  try {
    console.log('📊 Fetching Nikkei 225 from Yahoo Finance...');
    const nikkeiData = await fetchYahooFinance('^N225');
    console.log('✅ Nikkei 225 fetched:', nikkeiData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'stock_index',
      symbol: 'N225',
      name: 'Nikkei 225 (N225)',
      currency: 'JPY',
      price: roundToTwo(nikkeiData.regularMarketPrice),
      change: roundToTwo(nikkeiData.regularMarketChange),
      change_percent: roundToTwo(nikkeiData.regularMarketChangePercent),
      open: roundToTwo(nikkeiData.regularMarketOpen),
      high: roundToTwo(nikkeiData.regularMarketDayHigh),
      low: roundToTwo(nikkeiData.regularMarketDayLow),
      prev_close: roundToTwo(nikkeiData.regularMarketPreviousClose),
      volume: roundToTwo(nikkeiData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ Nikkei 225 saved to database');
    return {
      price: roundToTwo(nikkeiData.regularMarketPrice),
      change: roundToTwo(nikkeiData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update Nikkei 225:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 달러-원 환율 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateUSDKRW(supabase) {
  try {
    console.log('📊 Fetching USD/KRW from Yahoo Finance...');
    const usdKrwData = await fetchYahooFinance('KRW=X');
    console.log('✅ USD/KRW fetched:', usdKrwData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'currency',
      symbol: 'USDKRW',
      name: 'USD/KRW',
      currency: 'KRW',
      price: roundToTwo(usdKrwData.regularMarketPrice),
      change: roundToTwo(usdKrwData.regularMarketChange),
      change_percent: roundToTwo(usdKrwData.regularMarketChangePercent),
      open: roundToTwo(usdKrwData.regularMarketOpen),
      high: roundToTwo(usdKrwData.regularMarketDayHigh),
      low: roundToTwo(usdKrwData.regularMarketDayLow),
      prev_close: roundToTwo(usdKrwData.regularMarketPreviousClose),
      volume: roundToTwo(usdKrwData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ USD/KRW saved to database');
    return {
      price: roundToTwo(usdKrwData.regularMarketPrice),
      change: roundToTwo(usdKrwData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update USD/KRW:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 엔화 선물 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateJPYFutures(supabase) {
  try {
    console.log('📊 Fetching JPY Futures from Yahoo Finance...');
    const jpyData = await fetchYahooFinance('6J=F');
    console.log('✅ JPY Futures fetched:', jpyData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'currency',
      symbol: '6J',
      name: 'Japanese Yen Futures (6J)',
      currency: 'USD',
      price: roundToTwo(jpyData.regularMarketPrice),
      change: roundToTwo(jpyData.regularMarketChange),
      change_percent: roundToTwo(jpyData.regularMarketChangePercent),
      open: roundToTwo(jpyData.regularMarketOpen),
      high: roundToTwo(jpyData.regularMarketDayHigh),
      low: roundToTwo(jpyData.regularMarketDayLow),
      prev_close: roundToTwo(jpyData.regularMarketPreviousClose),
      volume: roundToTwo(jpyData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ JPY Futures saved to database');
    return {
      price: roundToTwo(jpyData.regularMarketPrice),
      change: roundToTwo(jpyData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update JPY Futures:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유로 선물 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function updateEURFutures(supabase) {
  try {
    console.log('📊 Fetching EUR Futures from Yahoo Finance...');
    const eurData = await fetchYahooFinance('6E=F');
    console.log('✅ EUR Futures fetched:', eurData.regularMarketPrice);
    const { error } = await supabase.from('financial_dashboard_prices').insert({
      asset_type: 'currency',
      symbol: '6E',
      name: 'Euro Futures (6E)',
      currency: 'USD',
      price: roundToTwo(eurData.regularMarketPrice),
      change: roundToTwo(eurData.regularMarketChange),
      change_percent: roundToTwo(eurData.regularMarketChangePercent),
      open: roundToTwo(eurData.regularMarketOpen),
      high: roundToTwo(eurData.regularMarketDayHigh),
      low: roundToTwo(eurData.regularMarketDayLow),
      prev_close: roundToTwo(eurData.regularMarketPreviousClose),
      volume: roundToTwo(eurData.regularMarketVolume),
      extra_data: {},
      api_source: 'yahoo-finance',
      api_timestamp: new Date().toISOString(),
      is_mock: false
    });
    if (error) throw error;
    console.log('✅ EUR Futures saved to database');
    return {
      price: roundToTwo(eurData.regularMarketPrice),
      change: roundToTwo(eurData.regularMarketChange),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to update EUR Futures:', error);
    throw error;
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
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('🔄 Starting financial prices update...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const results = {};

    // M2 통화 공급량 (미국)
    try {
      results.m2MoneySupply = await updateM2MoneySupply(supabase);
    } catch (error) {
      results.m2MoneySupply = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }

    // M2 통화 공급량 (한국)
    try {
      results.koreaM2MoneySupply = await updateKoreaM2MoneySupply(supabase);
    } catch (error) {
      results.koreaM2MoneySupply = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }

    // 원자재 선물
    try {
      results.goldFutures = await updateGoldFutures(supabase);
    } catch (error) {
      results.goldFutures = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    try {
      results.crudeOilFutures = await updateCrudeOilFutures(supabase);
    } catch (error) {
      results.crudeOilFutures = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    // 달러 지수
    try {
      results.dollar = await updateDollarIndex(supabase);
    } catch (error) {
      results.dollar = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    // 주식 지수들
    try {
      results.nasdaqComposite = await updateNasdaqComposite(supabase);
    } catch (error) {
      results.nasdaqComposite = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    try {
      results.nasdaqFutures = await updateNasdaqFutures(supabase);
    } catch (error) {
      results.nasdaqFutures = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    try {
      results.sp500 = await updateSP500(supabase);
    } catch (error) {
      results.sp500 = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    try {
      results.russell2000 = await updateRussell2000(supabase);
    } catch (error) {
      results.russell2000 = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    try {
      results.nikkei225 = await updateNikkei225(supabase);
    } catch (error) {
      results.nikkei225 = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    // 채권
    try {
      results.us10YearTreasury = await updateUS10YearTreasury(supabase);
    } catch (error) {
      results.us10YearTreasury = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    // 환율
    try {
      results.usdKrw = await updateUSDKRW(supabase);
    } catch (error) {
      results.usdKrw = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    try {
      results.jpyFutures = await updateJPYFutures(supabase);
    } catch (error) {
      results.jpyFutures = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    try {
      results.eurFutures = await updateEURFutures(supabase);
    } catch (error) {
      results.eurFutures = {
        error: error instanceof Error ? error.message : 'Failed'
      };
    }
    console.log('✨ Financial prices update completed');
    return new Response(JSON.stringify({
      success: true,
      message: 'Financial prices updated',
      data: results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Error updating financial prices:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
