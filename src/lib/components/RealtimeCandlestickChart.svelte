<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createChart, CandlestickSeries } from 'lightweight-charts';
	import { startRealtimePolling } from '$lib/api/candles';
	import type { CandleData } from '$lib/types';

	interface Props {
		symbol: string;
		title?: string;
		interval?: string;
		realtime?: boolean;
	}

	let { symbol, title, interval = '5m', realtime = false }: Props = $props();

	// Chart instances
	let chartContainer = $state<HTMLDivElement>();
	let chart: any = null;
	let candlestickSeries: any = null;

	// 심볼별 통화 단위 매핑
	const symbolToCurrency = new Map<string, string>([
		// Yahoo Finance 환율 심볼들
		['KRW=X', 'KRW'], // 달러/원
		['EURKRW=X', 'KRW'], // 유로/원
		['GBPKRW=X', 'KRW'], // 파운드/원
		['JPYKRW=X', 'KRW'], // 엔/원
		['CNYKRW=X', 'KRW'], // 위안/원
		['AUDKRW=X', 'KRW'], // 호주달러/원
		['CADKRW=X', 'KRW'], // 캐나다달러/원
		['CHFKRW=X', 'KRW'], // 스위스프랑/원
		// 기존 심볼들 (호환성)
		['USDKRW', 'KRW'],
		['EURKRW', 'KRW'],
		['GBPKRW', 'KRW'],
		['JPYKRW', 'KRW'],
		['CNYKRW', 'KRW'],
		['AUDKRW', 'KRW'],
		['CADKRW', 'KRW'],
		['CHFKRW', 'KRW'],
		// 달러 인덱스
		['DX-Y.NYB', 'USD'], // Yahoo Finance DXY
		['DXY', 'USD'],
		// 선물 심볼들
		['6E=F', 'USD'], // 유로 선물
		['6J=F', 'USD'], // 엔 선물
		['6A=F', 'USD'], // 호주달러 선물
		['6C=F', 'USD'], // 캐나다달러 선물
		['6B=F', 'USD'], // 파운드 선물
		['GC=F', 'USD'], // 금 선물
		['SI=F', 'USD'], // 은 선물
		['CL=F', 'USD'], // 원유 선물
		['NG=F', 'USD'], // 천연가스 선물
		['NQ=F', 'USD'], // 나스닥 선물
		// 기타 자산들
		['BTC', 'USD'],
		['ETH', 'USD'],
		['SPY', 'USD'],
		['QQQ', 'USD'],
		['IWM', 'USD'],
		['EFA', 'USD'],
		['EEM', 'USD'],
		['TLT', 'USD'],
		['IEF', 'USD'],
		['GLD', 'USD'],
		['SLV', 'USD'],
		['USO', 'USD'],
		['UNG', 'USD'],
		['DBA', 'USD'],
		['DBC', 'USD'],
		['DJP', 'USD'],
		['UUP', 'USD'],
		['FXE', 'USD'],
		['FXY', 'USD'],
		['FXA', 'USD'],
		['FXC', 'USD'],
		['FXB', 'USD'],
		['FXS', 'USD'],
		['CYB', 'USD'],
		// 지수들
		['^IXIC', 'USD'], // 나스닥 종합
		['^GSPC', 'USD'], // S&P 500
		['^RUT', 'USD'], // 러셀 2000
		['^N225', 'USD'], // 닛케이 225
		['^TNX', 'USD'] // 미국 10년 국채
	]);

	// UI state
	let loading = $state(true);
	let error = $state<string | null>(null);
	let isLive = $state(false);
	let currentPrice = $state<number | null>(null);

	// 현재 심볼의 통화 단위
	const currency = $derived.by(() => {
		return symbolToCurrency.get(symbol) || 'USD';
	});

	// 현재가 포맷팅
	const formattedCurrentPrice = $derived.by(() => {
		if (currentPrice === null) return '';

		const curr = currency;
		if (curr === 'KRW') {
			return `₩${currentPrice.toLocaleString('ko-KR')}`;
		} else {
			return `$${currentPrice.toFixed(2)}`;
		}
	});
	let lastUpdate = $state<Date | null>(null);
	let selectedInterval = $state(interval);

	// Realtime price polling (separate from chart data)
	let realtimePriceInterval: ReturnType<typeof setInterval> | null = null;

	// Cleanup
	let stopPolling: (() => void) | null = null;
	let isInitialized = $state(false);

	// Interval options
	const intervalOptions = [
		{ value: '1m', label: '1M' },
		{ value: '5m', label: '5M' },
		{ value: '15m', label: '15M' },
		{ value: '1h', label: '1H' },
		{ value: '1d', label: '1D' },
		{ value: '1wk', label: '1W' },
		{ value: '1mo', label: '1MO' },
		{ value: '3mo', label: 'Q' }
	];

	/**
	 * 타임프레임에 따라 적절한 데이터 범위를 반환
	 * Yahoo Finance API 제한과 성능을 고려한 최적화된 값
	 */
	function getRangeForInterval(interval: string): string {
		const rangeMap: Record<string, string> = {
			'1m': '5d', // 1분봉: 5일 (~3,600 포인트)
			'5m': '5d', // 5분봉: 5일 (~720 포인트)
			'15m': '5d', // 15분봉: 5일 (~240 포인트)
			'1h': '3mo', // 1시간봉: 3개월 (~2,160 포인트)
			'1d': '5y', // 일봉: 5년 (~1,260 포인트)
			'1wk': '10y', // 주봉: 10년 (~520 포인트)
			'1mo': '20y', // 월봉: 20년 (~240 포인트)
			'3mo': 'max' // 분기봉: 최대 (심볼에 따라 다름, 보통 ~100-200 포인트)
		};

		return rangeMap[interval] || '1d';
	}

	// Initialize chart when container is ready
	$effect(() => {
		if (chartContainer && !isInitialized && !chart) {
			console.log('🚀 chartContainer is ready, initializing chart...');
			initializeChart();
		}

		// Cleanup function
		return () => {
			console.log('🧹 Effect cleanup triggered');
		};
	});

	// Track previous symbol to detect changes
	let previousSymbol = $state(symbol);

	// Watch for symbol changes and reload data
	$effect(() => {
		// Only reload if symbol actually changed (not initial load)
		if (isInitialized && candlestickSeries && symbol !== previousSymbol) {
			console.log(`🔄 Symbol changed from ${previousSymbol} to ${symbol}, reloading data...`);
			previousSymbol = symbol;
			stopRealtime();
			stopRealtimePricePolling();
			loadData();
		}
	});

	function validateChartContainer(): boolean {
		if (!chartContainer) return false;

		// 차트 컨테이너에 예상치 못한 자식 요소가 있는지 확인
		const children = Array.from(chartContainer.children);
		const hasUnexpectedElements = children.some(
			(child) => !child.classList.contains('tv-lightweight-charts')
		);

		if (hasUnexpectedElements && import.meta.env.DEV) {
			console.warn('⚠️ Unexpected elements in chart container:', children);
			return false;
		}

		return true;
	}

	function initializeChart() {
		// 이미 초기화되었거나 차트가 존재하면 중복 초기화 방지
		if (isInitialized || chart) {
			console.warn('⚠️ Chart already initialized, skipping...');
			return;
		}

		if (!chartContainer) {
			console.error('❌ Chart container not found');
			return;
		}

		try {
			console.log('📈 Initializing chart...');

			// 기존 차트 컨테이너 내용 완전히 비우기 (중요!)
			chartContainer.innerHTML = '';

			console.log('Container width:', chartContainer.clientWidth);
			console.log('Container offsetWidth:', chartContainer.offsetWidth);
			console.log('Container parent width:', chartContainer.parentElement?.clientWidth);

			// 차트 컨테이너의 실제 사용 가능한 너비 계산
			let width = chartContainer.clientWidth;

			// clientWidth가 0이면 부모의 clientWidth 사용
			if (!width && chartContainer.parentElement) {
				const parent = chartContainer.parentElement;
				const parentStyle = window.getComputedStyle(parent);
				const parentPadding =
					parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
				width = parent.clientWidth - parentPadding;
			}

			// 그래도 0이면 기본값 사용
			if (!width) {
				width = 800;
			}

			console.log('Using width:', width);

			// 높이도 동적으로 계산 (최소 300px, 최대 600px)
			const containerHeight = chartContainer.clientHeight || 500;
			const height = Math.max(300, Math.min(containerHeight, 600));

			chart = createChart(chartContainer, {
				width: width,
				height: height,
				layout: {
					background: { color: 'transparent' },
					textColor: '#d1d5db'
				},
				grid: {
					vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
					horzLines: { color: 'rgba(255, 255, 255, 0.1)' }
				},
				timeScale: {
					borderColor: 'rgba(255, 255, 255, 0.2)',
					timeVisible: true,
					secondsVisible: false
				},
				rightPriceScale: {
					borderColor: 'rgba(255, 255, 255, 0.2)'
				}
			});

			console.log('✅ Chart created');

			// Lightweight Charts v5 API - addSeries with CandlestickSeries
			candlestickSeries = chart.addSeries(CandlestickSeries, {
				upColor: '#10b981',
				downColor: '#ef4444',
				borderVisible: false,
				wickUpColor: '#10b981',
				wickDownColor: '#ef4444'
			});

			console.log('✅ Candlestick series added');

			isInitialized = true;

			// Load data after initialization
			loadData();

			// Setup resize observer
			const resizeObserver = new ResizeObserver(() => {
				if (chart && chartContainer) {
					chart.applyOptions({ width: chartContainer.clientWidth });
				}
			});
			resizeObserver.observe(chartContainer);

			// Cleanup on destroy
			return () => {
				resizeObserver.disconnect();
			};
		} catch (e) {
			console.error('❌ Chart initialization failed:', e);
			error = '차트 초기화에 실패했습니다: ' + (e instanceof Error ? e.message : String(e));
			loading = false;
		}
	}

	async function loadData() {
		loading = true;
		error = null;

		console.log(`🔄 Loading data for ${symbol} (${selectedInterval})...`);

		try {
			const { fetchCandlesWithCache } = await import('$lib/api/candles');
			console.log('📦 API module loaded');

			// 중앙화된 함수 사용
			const range = getRangeForInterval(selectedInterval);
			console.log(`📅 Using range: ${range} for interval: ${selectedInterval}`);

			const candles = await fetchCandlesWithCache(symbol, selectedInterval, range);
			console.log(`✅ Received ${candles.length} candles`);

			if (candles.length === 0) {
				throw new Error('데이터가 없습니다. 다른 타임프레임을 시도해보세요.');
			}

			if (!candlestickSeries) {
				throw new Error('차트 시리즈가 초기화되지 않았습니다.');
			}

			console.log('📊 Setting chart data...');
			candlestickSeries.setData(candles as any);

			// Fetch realtime price (always use 1m interval for accurate current price)
			await fetchRealtimePrice();

			// Start realtime price polling (independent of chart interval)
			startRealtimePricePolling();

			// Start realtime chart updates if enabled
			if (realtime && !isLive) {
				startRealtime();
			}
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : '데이터를 불러오는데 실패했습니다.';
			error = errorMessage;
			console.error('❌ 데이터 로드 실패:', e);
		} finally {
			loading = false;
			console.log(`✨ Loading complete (error: ${error ? 'yes' : 'no'})`);
		}
	}

	function startRealtime() {
		if (stopPolling) return;

		isLive = true;
		// 타임프레임에 따라 폴링 간격 조정
		let pollingInterval = 60000; // 기본 1분
		if (selectedInterval === '1m') {
			pollingInterval = 10000; // 1분봉: 10초
		} else if (['1wk', '1mo', '3mo'].includes(selectedInterval)) {
			pollingInterval = 600000; // 장기 차트: 10분
		}

		// 중앙화된 함수 사용
		const range = getRangeForInterval(selectedInterval);
		console.log(
			`🔴 Starting realtime polling with range: ${range} for interval: ${selectedInterval}`
		);

		let lastCandleTime: number | null = null;

		stopPolling = startRealtimePolling(
			symbol,
			selectedInterval,
			range,
			pollingInterval,
			(candles) => {
				if (candlestickSeries && candles.length > 0) {
					const lastCandle = candles[candles.length - 1];

					// 첫 업데이트이거나 새로운 봉이 생성된 경우 전체 데이터 재설정
					if (lastCandleTime === null || lastCandle.time !== lastCandleTime) {
						console.log('🔄 New candle detected, updating full data');
						candlestickSeries.setData(candles as any);
						lastCandleTime = Number(lastCandle.time);
					} else {
						// 같은 봉의 업데이트인 경우 마지막 봉만 업데이트 (성능 최적화)
						console.log('⚡ Updating last candle only');
						candlestickSeries.update(lastCandle as any);
					}

					// 현재가 업데이트
					currentPrice = Number(lastCandle.close);
					lastUpdate = new Date();
				}
			}
		);
	}

	function stopRealtime() {
		isLive = false;
		if (stopPolling) {
			stopPolling();
			stopPolling = null;
		}
	}

	function toggleRealtime() {
		if (isLive) {
			stopRealtime();
		} else {
			startRealtime();
		}
	}

	// Fetch realtime price using 1m interval (most accurate)
	async function fetchRealtimePrice() {
		try {
			const { fetchCandlesWithCache } = await import('$lib/api/candles');
			const candles = await fetchCandlesWithCache(symbol, '1m', '1d');

			if (candles.length > 0) {
				const lastCandle = candles[candles.length - 1];
				currentPrice = Number(lastCandle.close);
				lastUpdate = new Date();
				console.log(`💰 Realtime price updated: ${currentPrice.toFixed(2)}`);
			}
		} catch (e) {
			console.error('❌ Failed to fetch realtime price:', e);
		}
	}

	// Start polling for realtime price (every 10 seconds)
	function startRealtimePricePolling() {
		// Clear existing interval
		if (realtimePriceInterval) {
			clearInterval(realtimePriceInterval);
		}

		// Poll every 10 seconds
		realtimePriceInterval = setInterval(() => {
			fetchRealtimePrice();
		}, 10000);
	}

	// Stop realtime price polling
	function stopRealtimePricePolling() {
		if (realtimePriceInterval) {
			clearInterval(realtimePriceInterval);
			realtimePriceInterval = null;
		}
	}

	function changeInterval(newInterval: string) {
		console.log(`🔄 Changing interval from ${selectedInterval} to ${newInterval}`);
		selectedInterval = newInterval;
		stopRealtime();
		stopRealtimePricePolling();

		// Only load data if chart is initialized
		if (isInitialized && candlestickSeries) {
			loadData();
		} else {
			console.warn('⚠️ Chart not initialized yet, data will load after initialization');
		}
	}

	onDestroy(() => {
		console.log('🧹 Component destroying, cleaning up...');
		stopRealtime();
		stopRealtimePricePolling();
		if (chart) {
			console.log('🗑️ Removing chart instance');
			chart.remove();
			chart = null;
		}
		candlestickSeries = null;
		isInitialized = false;
	});
</script>

<div class="chart-wrapper">
	<div class="chart-header">
		<div class="title-section">
			{#if title}
				<h3 class="chart-title">{title}</h3>
			{/if}
			{#if currentPrice !== null}
				<div class="current-price">
					<span class="price-label">현재가:</span>
					<span class="price-value">{formattedCurrentPrice}</span>
				</div>
			{/if}
		</div>

		<div class="controls-section">
			<div class="interval-selector">
				{#each intervalOptions as option}
					<button
						class="interval-btn"
						class:active={selectedInterval === option.value}
						onclick={() => changeInterval(option.value)}
						disabled={loading}
					>
						{option.label}
					</button>
				{/each}
			</div>

			<button
				class="realtime-toggle"
				class:active={isLive}
				onclick={toggleRealtime}
				disabled={loading}
			>
				{#if isLive}
					<span class="live-indicator">🔴</span>
					실시간
				{:else}
					<span class="live-indicator">⚪</span>
					정지
				{/if}
			</button>
		</div>
	</div>

	<div bind:this={chartContainer} class="chart-container" class:hidden={loading || error}></div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>데이터 로딩 중...</p>
			<p class="loading-detail">심볼: {symbol}, 타임프레임: {selectedInterval}</p>
		</div>
	{/if}

	{#if error}
		<div class="error">
			<p class="error-title">❌ {error}</p>
			<div class="error-details">
				<p><strong>심볼:</strong> {symbol}</p>
				<p><strong>타임프레임:</strong> {selectedInterval}</p>
				<p><strong>팁:</strong> 브라우저 콘솔(F12)에서 자세한 로그를 확인하세요</p>
			</div>
			<button onclick={() => loadData()} class="retry-btn">다시 시도</button>
		</div>
	{/if}
</div>

<style>
	.chart-wrapper {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		min-height: 600px;
		width: 100%;
		box-sizing: border-box;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.title-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.chart-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin: 0;
	}

	.current-price {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.price-label {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.price-value {
		font-size: 1.25rem;
		font-weight: 700;
		font-family: monospace;
		color: #10b981;
	}

	.controls-section {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.interval-selector {
		display: flex;
		gap: 0.25rem;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.25rem;
		border-radius: 8px;
	}

	.interval-btn {
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.interval-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.interval-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.interval-btn.active {
		background: rgba(96, 165, 250, 0.3);
		color: white;
		font-weight: 600;
	}

	.realtime-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: white;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.realtime-toggle:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.realtime-toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.realtime-toggle.active {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.live-indicator {
		font-size: 0.75rem;
	}

	.realtime-toggle.active .live-indicator {
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.chart-container {
		width: 100%;
		max-width: 100%;
		min-height: 400px;
		height: auto;
		position: relative;
	}

	.chart-container.hidden {
		display: none;
	}

	.loading,
	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 500px;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #60a5fa;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading p {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
	}

	.loading-detail {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.error-title {
		color: #f87171;
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.error-details {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: left;
	}

	.error-details p {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		margin: 0.5rem 0;
	}

	.error-details strong {
		color: white;
	}

	.retry-btn {
		padding: 0.5rem 1rem;
		background: #60a5fa;
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.retry-btn:hover {
		background: #3b82f6;
	}

	@media (max-width: 768px) {
		.chart-wrapper {
			padding: 0.75rem;
			min-height: 500px;
		}

		.chart-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
			margin-bottom: 1rem;
		}

		.chart-title {
			font-size: 1.125rem;
		}

		.current-price {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.price-value {
			font-size: 1.5rem;
		}

		.controls-section {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.interval-selector {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 0.5rem;
			padding: 0.5rem;
		}

		.interval-btn {
			padding: 0.75rem 0.5rem;
			font-size: 0.875rem;
			font-weight: 600;
		}

		.realtime-toggle {
			padding: 0.875rem 1rem;
			font-size: 1rem;
			justify-content: center;
		}

		.chart-container {
			height: 350px;
			touch-action: pan-x pan-y;
		}
	}

	@media (max-width: 480px) {
		.chart-wrapper {
			padding: 0.5rem;
			min-height: 450px;
		}

		.chart-title {
			font-size: 1rem;
		}

		.price-value {
			font-size: 1.25rem;
		}

		.interval-selector {
			grid-template-columns: repeat(4, 1fr);
			gap: 0.375rem;
			padding: 0.375rem;
		}

		.interval-btn {
			padding: 0.625rem 0.375rem;
			font-size: 0.75rem;
		}

		.realtime-toggle {
			padding: 0.75rem 1rem;
			font-size: 0.875rem;
		}

		.chart-container {
			height: 300px;
			touch-action: pan-x pan-y;
		}
	}
</style>
