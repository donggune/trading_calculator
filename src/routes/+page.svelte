<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import LineChart from '$lib/components/LineChart.svelte';
	import PriceCard from '$lib/components/PriceCard.svelte';
	import type { FinancialPrice } from '$lib/types';

	// 구조화된 데이터
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'Dashboard',
		name: 'BullGaze 실시간 시장 대시보드',
		description: '실시간 금, 은, 암호화폐 가격 데이터와 차트 분석 도구',
		url: 'https://bullgaze.com',
		applicationCategory: 'FinanceApplication',
		featureList: ['실시간 금 가격', '실시간 은 가격', '암호화폐 가격', '차트 분석', '시장 데이터']
	};

	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state<string | null>(null);
	let latestPrices = $state<FinancialPrice[]>([]);
	let historicalData = $state<{ [key: string]: FinancialPrice[] }>({});
	let lastUpdated = $state<Date | null>(null);

	// 최신 가격 데이터 가져오기 - 성능 최적화: 단일 쿼리로 모든 데이터 가져오기
	async function fetchLatestPrices() {
		try {
			// 모든 데이터를 한 번에 가져오고 created_at 기준으로 정렬
			const { data: allData, error: fetchError } = await supabase
				.from('financial_dashboard_prices')
				.select('*')
				.order('created_at', { ascending: false });

			if (fetchError) throw fetchError;

			// 클라이언트에서 각 심볼별 최신 데이터만 추출
			const latestMap = new Map<string, FinancialPrice>();
			allData?.forEach((item) => {
				const key = `${item.symbol}-${item.asset_type}`;
				// 이미 정렬되어 있으므로 처음 만나는 것이 최신 데이터
				if (!latestMap.has(key)) {
					latestMap.set(key, item);
				}
			});

			// Map을 배열로 변환
			latestPrices = Array.from(latestMap.values());
			lastUpdated = new Date();
		} catch (e) {
			error = e instanceof Error ? e.message : '데이터를 불러오는데 실패했습니다.';
		}
	}

	// 히스토리 데이터 가져오기 - 성능 최적화: 최근 30일 데이터만 가져오기
	async function fetchHistoricalData() {
		try {
			// 30일 전 날짜 계산
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			const dateFilter = thirtyDaysAgo.toISOString();

			// 최근 30일 데이터만 필터링하여 가져오기
			const { data, error: fetchError } = await supabase
				.from('financial_dashboard_prices')
				.select('*')
				.gte('created_at', dateFilter) // created_at >= 30일 전
				.order('created_at', { ascending: true });

			if (fetchError) throw fetchError;

			// 심볼별로 그룹화
			const grouped: { [key: string]: FinancialPrice[] } = {};
			data?.forEach((item) => {
				const key = item.symbol;
				if (!grouped[key]) {
					grouped[key] = [];
				}
				grouped[key].push(item);
			});

			historicalData = grouped;
		} catch (e) {
			error = e instanceof Error ? e.message : '히스토리 데이터를 불러오는데 실패했습니다.';
		}
	}

	// 날짜 포맷팅 캐시 - 성능 최적화: 동일한 날짜 재계산 방지
	const dateFormatCache = new Map<string, string>();

	function formatDate(dateString: string): string {
		if (!dateFormatCache.has(dateString)) {
			const date = new Date(dateString);
			// 날짜만 표시 (시간 제외)
			dateFormatCache.set(dateString, date.toLocaleDateString('ko-KR'));
		}
		return dateFormatCache.get(dateString)!;
	}

	// 차트 데이터 생성 헬퍼 함수 - 성능 최적화: 중복 코드 제거
	function createChartData(
		symbol: string,
		label: string,
		borderColor: string,
		backgroundColor: string
	) {
		const data = historicalData[symbol] || [];

		return {
			labels: data.map((d) => formatDate(d.created_at)),
			datasets: [
				{
					label,
					data: data.map((d) => Number(d.price)),
					borderColor,
					backgroundColor,
					fill: true
				}
			]
		};
	}

	// 차트 데이터 준비
	const goldChartData = $derived(() =>
		createChartData('XAU', 'Gold (XAU)', 'rgb(255, 193, 7)', 'rgba(255, 193, 7, 0.1)')
	);

	const nasdaqChartData = $derived(() =>
		createChartData('NDX', 'NASDAQ-100 (NDX)', 'rgb(59, 130, 246)', 'rgba(59, 130, 246, 0.1)')
	);

	const dollarIndexChartData = $derived(() =>
		createChartData(
			'DXY',
			'U.S. Dollar Index (DXY)',
			'rgb(16, 185, 129)',
			'rgba(16, 185, 129, 0.1)'
		)
	);

	const sp500ChartData = $derived(() =>
		createChartData('SPX', 'S&P 500 (SPX)', 'rgb(239, 68, 68)', 'rgba(239, 68, 68, 0.1)')
	);

	const crudeOilChartData = $derived(() =>
		createChartData('WTI', 'Crude Oil WTI (WTI)', 'rgb(168, 85, 247)', 'rgba(168, 85, 247, 0.1)')
	);

	const nikkeiChartData = $derived(() =>
		createChartData('N225', 'Nikkei 225 (N225)', 'rgb(245, 158, 11)', 'rgba(245, 158, 11, 0.1)')
	);

	const nasdaqFuturesChartData = $derived(() =>
		createChartData('NQ', 'NASDAQ-100 Futures (NQ)', 'rgb(99, 102, 241)', 'rgba(99, 102, 241, 0.1)')
	);

	const russell2000ChartData = $derived(() =>
		createChartData('RUT', 'Russell 2000 (RUT)', 'rgb(34, 197, 94)', 'rgba(34, 197, 94, 0.1)')
	);

	const us10YearTreasuryChartData = $derived(() =>
		createChartData(
			'TNX',
			'US 10-Year Treasury (TNX)',
			'rgb(251, 191, 36)',
			'rgba(251, 191, 36, 0.1)'
		)
	);

	const usdKrwChartData = $derived(() =>
		createChartData('USDKRW', 'USD/KRW', 'rgb(220, 38, 127)', 'rgba(220, 38, 127, 0.1)')
	);

	const usdJpyChartData = $derived(() =>
		createChartData('USDJPY', 'USD/JPY', 'rgb(14, 165, 233)', 'rgba(14, 165, 233, 0.1)')
	);

	const usdEurChartData = $derived(() =>
		createChartData('USDEUR', 'USD/EUR', 'rgb(16, 185, 129)', 'rgba(16, 185, 129, 0.1)')
	);

	// 자산 타입 분류 맵 - 성능 최적화: 심볼 체크를 O(1)로
	const assetTypeMap = {
		stockIndices: new Set(['SPX', 'NDX', 'N225', 'RUT', 'NQ']),
		commodities: new Set(['XAU', 'WTI', 'GOLD', 'OIL']),
		bonds: new Set(['TNX', 'TREASURY', 'BOND']),
		currencies: new Set(['DXY', 'USD', 'USDKRW', 'USDJPY', 'USDEUR', 'KRW', 'JPY', 'EUR'])
	};

	function getAssetType(symbol: string): keyof typeof assetTypeMap | 'stockIndices' {
		const upperSymbol = symbol.toUpperCase();

		// 정확한 매칭 먼저 시도
		for (const [type, symbols] of Object.entries(assetTypeMap)) {
			if (symbols.has(upperSymbol)) {
				return type as keyof typeof assetTypeMap;
			}
		}

		// 부분 매칭 (하위 호환성)
		if (
			assetTypeMap.commodities.has(upperSymbol) ||
			upperSymbol.includes('GOLD') ||
			upperSymbol.includes('OIL')
		) {
			return 'commodities';
		}
		if (
			assetTypeMap.bonds.has(upperSymbol) ||
			upperSymbol.includes('TREASURY') ||
			upperSymbol.includes('BOND')
		) {
			return 'bonds';
		}
		if (
			assetTypeMap.currencies.has(upperSymbol) ||
			upperSymbol.includes('USD') ||
			upperSymbol.includes('KRW') ||
			upperSymbol.includes('JPY') ||
			upperSymbol.includes('EUR')
		) {
			return 'currencies';
		}

		// 기본값: 주식 지수
		return 'stockIndices';
	}

	// 자산 타입별로 그룹화된 가격 데이터
	const groupedPrices = $derived(() => {
		const groups = {
			stockIndices: [] as FinancialPrice[],
			currencies: [] as FinancialPrice[],
			commodities: [] as FinancialPrice[],
			bonds: [] as FinancialPrice[]
		};

		// 분류 및 정렬을 동시에 수행
		latestPrices.forEach((price) => {
			const type = getAssetType(price.symbol);
			groups[type].push(price);
		});

		// 각 그룹 내에서 심볼순으로 정렬
		for (const group of Object.values(groups)) {
			group.sort((a, b) => a.symbol.localeCompare(b.symbol));
		}

		return groups;
	});

	// 데이터 새로고침 함수
	async function refreshData() {
		refreshing = true;
		error = null;
		await Promise.all([fetchLatestPrices(), fetchHistoricalData()]);
		refreshing = false;
	}

	onMount(async () => {
		loading = true;
		await Promise.all([fetchLatestPrices(), fetchHistoricalData()]);
		loading = false;
	});
</script>

<!-- SEO 메타 태그 및 구조화된 데이터 -->
<svelte:head>
	<title>BullGaze - 실시간 시장 대시보드</title>
	<meta
		name="description"
		content="실시간 금, 은, 암호화폐 가격을 확인하고 투자 분석을 시작하세요. 전문적인 시장 데이터와 차트 분석 도구를 제공합니다."
	/>
	<script type="application/ld+json">
		{JSON.stringify(structuredData)}
	</script>
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<div class="header-content">
			<h1>📊 BullGaze Dashboard</h1>
			<p>실시간 시장 분석 대시보드</p>
		</div>
	</header>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>데이터를 불러오는 중...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>❌ {error}</p>
		</div>
	{:else}
		<!-- 가격 카드 섹션 -->
		<section class="price-cards-container">
			<!-- 주식 지수 -->
			{#if groupedPrices().stockIndices.length > 0}
				<div class="asset-group">
					<h2 class="group-title">📈 주식 지수</h2>
					<div class="price-cards">
						{#each groupedPrices().stockIndices as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change_24h ? Number(price.change_24h) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- 환율 -->
			{#if groupedPrices().currencies.length > 0}
				<div class="asset-group">
					<h2 class="group-title">💱 환율</h2>
					<div class="price-cards">
						{#each groupedPrices().currencies as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change_24h ? Number(price.change_24h) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- 원자재 -->
			{#if groupedPrices().commodities.length > 0}
				<div class="asset-group">
					<h2 class="group-title">🥇 원자재</h2>
					<div class="price-cards">
						{#each groupedPrices().commodities as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change_24h ? Number(price.change_24h) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- 채권 -->
			{#if groupedPrices().bonds.length > 0}
				<div class="asset-group">
					<h2 class="group-title">🏛️ 채권</h2>
					<div class="price-cards">
						{#each groupedPrices().bonds as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change_24h ? Number(price.change_24h) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<!-- 차트 섹션 -->
		<section class="charts">
			{#if historicalData['XAU']?.length}
				<div class="chart-wrapper" id="chart-XAU">
					<LineChart
						labels={goldChartData().labels}
						datasets={goldChartData().datasets}
						title="금 (XAU) 가격 추이"
					/>
				</div>
			{/if}

			{#if historicalData['SPX']?.length}
				<div class="chart-wrapper" id="chart-SPX">
					<LineChart
						labels={sp500ChartData().labels}
						datasets={sp500ChartData().datasets}
						title="S&P 500 (SPX) 지수 추이"
					/>
				</div>
			{/if}

			{#if historicalData['NDX']?.length}
				<div class="chart-wrapper" id="chart-NDX">
					<LineChart
						labels={nasdaqChartData().labels}
						datasets={nasdaqChartData().datasets}
						title="나스닥-100 (NDX) 지수 추이"
					/>
				</div>
			{/if}

			{#if historicalData['DXY']?.length}
				<div class="chart-wrapper" id="chart-DXY">
					<LineChart
						labels={dollarIndexChartData().labels}
						datasets={dollarIndexChartData().datasets}
						title="달러 인덱스 (DXY) 추이"
					/>
				</div>
			{/if}

			{#if historicalData['WTI']?.length}
				<div class="chart-wrapper" id="chart-WTI">
					<LineChart
						labels={crudeOilChartData().labels}
						datasets={crudeOilChartData().datasets}
						title="원유 WTI (WTI) 가격 추이"
					/>
				</div>
			{/if}

			{#if historicalData['N225']?.length}
				<div class="chart-wrapper" id="chart-N225">
					<LineChart
						labels={nikkeiChartData().labels}
						datasets={nikkeiChartData().datasets}
						title="닛케이 225 (N225) 지수 추이"
					/>
				</div>
			{/if}

			{#if historicalData['NQ']?.length}
				<div class="chart-wrapper" id="chart-NQ">
					<LineChart
						labels={nasdaqFuturesChartData().labels}
						datasets={nasdaqFuturesChartData().datasets}
						title="나스닥-100 선물 (NQ) 추이"
					/>
				</div>
			{/if}

			{#if historicalData['RUT']?.length}
				<div class="chart-wrapper" id="chart-RUT">
					<LineChart
						labels={russell2000ChartData().labels}
						datasets={russell2000ChartData().datasets}
						title="러셀 2000 (RUT) 지수 추이"
					/>
				</div>
			{/if}

			{#if historicalData['TNX']?.length}
				<div class="chart-wrapper" id="chart-TNX">
					<LineChart
						labels={us10YearTreasuryChartData().labels}
						datasets={us10YearTreasuryChartData().datasets}
						title="미국 10년 국채 (TNX) 수익률 추이"
					/>
				</div>
			{/if}

			{#if historicalData['USDKRW']?.length}
				<div class="chart-wrapper" id="chart-USDKRW">
					<LineChart
						labels={usdKrwChartData().labels}
						datasets={usdKrwChartData().datasets}
						title="달러-원 (USD/KRW) 환율 추이"
					/>
				</div>
			{/if}

			{#if historicalData['USDJPY']?.length}
				<div class="chart-wrapper" id="chart-USDJPY">
					<LineChart
						labels={usdJpyChartData().labels}
						datasets={usdJpyChartData().datasets}
						title="달러-엔 (USD/JPY) 환율 추이"
					/>
				</div>
			{/if}

			{#if historicalData['USDEUR']?.length}
				<div class="chart-wrapper" id="chart-USDEUR">
					<LineChart
						labels={usdEurChartData().labels}
						datasets={usdEurChartData().datasets}
						title="달러-유로 (USD/EUR) 환율 추이"
					/>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.dashboard {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
		background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
	}

	.dashboard-header {
		text-align: center;
		margin-bottom: 3rem;
		position: relative;
	}

	.header-content {
		position: relative;
		z-index: 2;
	}

	.dashboard-header h1 {
		font-size: 3rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin-bottom: 0.5rem;
		text-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
	}

	.dashboard-header p {
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 2rem;
	}

	.loading,
	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
	}

	.spinner {
		width: 60px;
		height: 60px;
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-top-color: #60a5fa;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
		box-shadow: 0 0 20px rgba(96, 165, 250, 0.3);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error p {
		color: #f87171;
		font-size: 1.125rem;
		font-weight: 500;
		text-align: center;
	}

	.price-cards-container {
		margin-bottom: 3rem;
		padding: 0 1rem;
	}

	.asset-group {
		margin-bottom: 2.5rem;
	}

	.group-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin-bottom: 1rem;
		padding-left: 0.5rem;
		border-left: 4px solid #60a5fa;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.price-cards {
		display: grid;
		/* 데스크톱: 4열 고정, 동일 너비 */
		grid-template-columns: repeat(4, 1fr);
		gap: 1.5rem;
		margin-bottom: 1rem;
		max-width: 100%;
	}

	/* 반응형: 화면 너비에 따라 3→2→1열 */
	@media (max-width: 1200px) {
		.price-cards {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 992px) {
		.price-cards {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.charts {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		padding: 0 1rem;
	}

	.chart-wrapper {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		transition: all 0.3s ease;
		overflow: hidden;
		width: 100%;
		max-width: 100%;
	}

	.chart-wrapper:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
		border-color: rgba(255, 255, 255, 0.2);
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 0.5rem;
		}

		.dashboard-header h1 {
			font-size: 2.5rem;
		}

		.price-cards-container {
			padding: 0;
		}

		.price-cards {
			grid-template-columns: 1fr;
		}

		.group-title {
			font-size: 1.25rem;
		}

		.charts {
			grid-template-columns: 1fr;
			padding: 0;
			gap: 1rem;
		}

		.chart-wrapper {
			padding: 1rem;
			margin: 0;
			width: 100%;
			max-width: 100%;
			box-sizing: border-box;
		}
	}

	@media (max-width: 480px) {
		.dashboard {
			padding: 0.25rem;
		}

		.dashboard-header h1 {
			font-size: 2rem;
		}

		.dashboard-header p {
			font-size: 1rem;
		}

		.charts {
			gap: 0.75rem;
		}

		.chart-wrapper {
			padding: 0.75rem;
			border-radius: 12px;
		}
	}
</style>
