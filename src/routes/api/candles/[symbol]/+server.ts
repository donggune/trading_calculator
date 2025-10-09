import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Yahoo Finance API에서 캔들 데이터 가져오기 (서버 사이드)
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const { symbol } = params;
	const interval = url.searchParams.get('interval') || '1h';
	const range = url.searchParams.get('range') || '1d';

	console.log(`📊 API Request: ${symbol} (${interval}, ${range})`);

	try {
		const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
		const yahooParams = new URLSearchParams({ interval, range });

		console.log(`🌐 Fetching from Yahoo Finance: ${yahooUrl}?${yahooParams}`);

		const response = await fetch(`${yahooUrl}?${yahooParams}`, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});

		console.log(`📡 Yahoo Finance response status: ${response.status}`);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log('✅ Yahoo Finance data received');

		if (!data.chart?.result?.[0]) {
			throw new Error('Invalid response from Yahoo Finance');
		}

		const result = data.chart.result[0];
		const timestamps = result.timestamp;
		const quote = result.indicators.quote[0];

		// 캔들 데이터 변환
		const candles = timestamps
			.map((time: number, i: number) => {
				// null 값 필터링
				if (
					quote.open[i] === null ||
					quote.high[i] === null ||
					quote.low[i] === null ||
					quote.close[i] === null
				) {
					return null;
				}

				return {
					time: time, // Unix timestamp
					open: quote.open[i],
					high: quote.high[i],
					low: quote.low[i],
					close: quote.close[i],
					volume: quote.volume?.[i] || 0
				};
			})
			.filter((candle: any) => candle !== null);

		console.log(`✅ Processed ${candles.length} candles`);

		return json({
			success: true,
			symbol,
			interval,
			range,
			candles,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('❌ Error fetching Yahoo candles:', error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch candles',
				symbol,
				interval,
				range
			},
			{ status: 500 }
		);
	}
};
