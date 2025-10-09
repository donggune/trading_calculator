import type { CandleData } from '$lib/types';

/**
 * 서버 API를 통해 캔들 데이터 가져오기 (CORS 우회)
 */
export async function fetchYahooCandles(
	symbol: string,
	interval: string = '1h',
	range: string = '1d'
): Promise<CandleData[]> {
	try {
		const params = new URLSearchParams({ interval, range });
		const response = await fetch(`/api/candles/${symbol}?${params}`);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (!data.success) {
			throw new Error(data.error || 'Failed to fetch candles');
		}

		return data.candles;
	} catch (error) {
		console.error('Error fetching Yahoo candles:', error);
		throw error;
	}
}

/**
 * 클라이언트 측 캐싱을 위한 캔들 데이터 가져오기
 */
const cache = new Map<string, { data: CandleData[]; timestamp: number }>();

/**
 * 타임프레임에 따라 적절한 캐시 지속 시간을 반환
 */
function getCacheDuration(interval: string): number {
	const cacheDurations: Record<string, number> = {
		'1m': 10000,    // 1분봉: 10초
		'5m': 30000,    // 5분봉: 30초
		'15m': 60000,   // 15분봉: 1분
		'1h': 300000,   // 1시간봉: 5분
		'1d': 600000,   // 일봉: 10분
		'1wk': 1800000, // 주봉: 30분 (자주 변경되지 않음)
		'1mo': 3600000, // 월봉: 1시간 (자주 변경되지 않음)
		'3mo': 3600000  // 분기봉: 1시간 (자주 변경되지 않음)
	};
	
	return cacheDurations[interval] || 10000;
}

export async function fetchCandlesWithCache(
	symbol: string,
	interval: string = '1h',
	range: string = '1d',
	forceRefresh: boolean = false
): Promise<CandleData[]> {
	const cacheKey = `${symbol}-${interval}-${range}`;
	const cached = cache.get(cacheKey);
	const cacheDuration = getCacheDuration(interval);

	// 강제 새로고침이 아니고 캐시가 유효하면 반환
	if (!forceRefresh && cached && Date.now() - cached.timestamp < cacheDuration) {
		console.log(`✅ Cache hit for ${cacheKey} (valid for ${Math.round((cacheDuration - (Date.now() - cached.timestamp)) / 1000)}s)`);
		return cached.data;
	}

	// API 호출
	console.log(`🔄 Fetching fresh data for ${cacheKey}`);
	const data = await fetchYahooCandles(symbol, interval, range);

	// 캐시 저장
	cache.set(cacheKey, { data, timestamp: Date.now() });

	return data;
}

/**
 * 캐시를 무시하고 강제로 새로운 데이터 가져오기
 */
export async function fetchCandlesForceRefresh(
	symbol: string,
	interval: string = '1h',
	range: string = '1d'
): Promise<CandleData[]> {
	return fetchCandlesWithCache(symbol, interval, range, true);
}

/**
 * 실시간 폴링 시작
 */
export function startRealtimePolling(
	symbol: string,
	interval: string,
	range: string,
	pollingInterval: number,
	callback: (candles: CandleData[]) => void
): () => void {
	// 즉시 실행 (강제 새로고침)
	fetchCandlesForceRefresh(symbol, interval, range).then(callback).catch(console.error);

	// 주기적 실행 (강제 새로고침)
	const intervalId = setInterval(async () => {
		try {
			const candles = await fetchCandlesForceRefresh(symbol, interval, range);
			callback(candles);
		} catch (error) {
			console.error('Polling error:', error);
		}
	}, pollingInterval);

	// 정리 함수 반환
	return () => clearInterval(intervalId);
}
