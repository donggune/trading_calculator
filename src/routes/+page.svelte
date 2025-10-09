<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import LineChart from '$lib/components/LineChart.svelte';
	import PriceCard from '$lib/components/PriceCard.svelte';
	import type { FinancialPrice } from '$lib/types';

	// 구조화된 데이터 (Schema.org)
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'BullGaze',
		alternateName: 'BullGaze 실시간 시장 대시보드',
		description:
			'실시간 금(XAU), 주식지수(S&P500, NASDAQ), 환율(USD/KRW), 원자재 가격 데이터와 차트 분석 도구를 제공하는 투자 분석 플랫폼',
		url: 'https://bullgaze.com',
		applicationCategory: 'FinanceApplication',
		operatingSystem: 'Web Browser',
		browserRequirements: 'Requires JavaScript. Requires HTML5.',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'KRW',
			availability: 'https://schema.org/InStock'
		},
		featureList: [
			'실시간 금(XAU) 가격 조회',
			'S&P 500 지수 추이',
			'NASDAQ-100 지수 추이',
			'달러 인덱스(DXY)',
			'환율 정보 (USD/KRW, USD/JPY, USD/EUR)',
			'원유(WTI) 가격',
			'미국 10년 국채 수익률',
			'M2 통화 공급량 추이',
			'차트 분석 도구',
			'30일 히스토리 데이터'
		],
		screenshot: 'https://bullgaze.com/screenshot-dashboard.jpg',
		potentialAction: {
			'@type': 'ViewAction',
			target: 'https://bullgaze.com'
		},
		audience: {
			'@type': 'Audience',
			audienceType: '투자자, 트레이더, 금융 분석가'
		},
		inLanguage: 'ko-KR',
		creator: {
			'@type': 'Organization',
			name: 'BullGaze',
			url: 'https://bullgaze.com'
		},
		datePublished: '2024-01-01',
		dateModified: new Date().toISOString().split('T')[0]
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

			// 클라이언트에서 각 심볼별 최신 2개 데이터 추출 (변화량 계산용)
			const symbolDataMap = new Map<string, FinancialPrice[]>();
			allData?.forEach((item) => {
				const key = item.symbol;
				if (!symbolDataMap.has(key)) {
					symbolDataMap.set(key, []);
				}
				const arr = symbolDataMap.get(key)!;
				if (arr.length < 2) {
					arr.push(item);
				}
			});

			// 최신 데이터와 변화량 계산
			const latestArray: FinancialPrice[] = [];
			symbolDataMap.forEach((dataArray, symbol) => {
				const latest = dataArray[0];
				const previous = dataArray[1];
				
				// 변화량 계산 (DB에 값이 없거나 0인 경우)
				if (previous && (latest.change === 0 || latest.change === null)) {
					const currentPrice = Number(latest.price);
					const previousPrice = Number(previous.price);
					const change = currentPrice - previousPrice;
					const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
					
					latest.change = change;
					latest.change_percent = changePercent;
				}
				
				latestArray.push(latest);
			});

			latestPrices = latestArray;
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

			// 최근 30일 데이터만 필터링하여 가져오기 (M2 제외)
			const { data, error: fetchError } = await supabase
				.from('financial_dashboard_prices')
				.select('*')
				.neq('symbol', 'M2') // M2 제외
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

			// M2 데이터는 전체 기간 가져오기 (월별 데이터이므로)
			const { data: m2Data, error: m2Error } = await supabase
				.from('financial_dashboard_prices')
				.select('*')
				.eq('symbol', 'M2')
				.order('created_at', { ascending: true });

			if (!m2Error && m2Data) {
				grouped['M2'] = m2Data;
			}

			// 한국 M2 데이터도 전체 기간 가져오기 (월별 데이터이므로)
			const { data: m2KrData, error: m2KrError } = await supabase
				.from('financial_dashboard_prices')
				.select('*')
				.eq('symbol', 'M2_KR')
				.order('created_at', { ascending: true });

			if (!m2KrError && m2KrData) {
				grouped['M2_KR'] = m2KrData;
			}

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
		const rawData = historicalData[symbol] || [];

		// 날짜별로 그룹화하여 최신 데이터만 사용 (중복 제거)
		const dataByDate = new Map<string, FinancialPrice>();
		rawData.forEach((item) => {
			const dateKey = new Date(item.created_at).toISOString().split('T')[0];
			const existing = dataByDate.get(dateKey);
			// 같은 날짜에 여러 데이터가 있으면 created_at이 최신인 것만 사용
			if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
				dataByDate.set(dateKey, item);
			}
		});

		// Map을 배열로 변환하고 날짜순 정렬
		const data = Array.from(dataByDate.values()).sort(
			(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		);

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

	// 심볼별 현재 가격 가져오기 헬퍼 함수
	function getCurrentPrice(symbol: string): number | undefined {
		const priceData = latestPrices.find((p) => p.symbol === symbol);
		return priceData ? Number(priceData.price) : undefined;
	}

	// 심볼별 통화 가져오기 헬퍼 함수
	function getCurrency(symbol: string): string {
		const priceData = latestPrices.find((p) => p.symbol === symbol);
		return priceData?.currency || 'USD';
	}

	// 차트 데이터 준비
	const goldFuturesChartData = $derived(() =>
		createChartData('GC', 'Gold Futures (GC)', 'rgb(255, 193, 7)', 'rgba(255, 193, 7, 0.1)')
	);

	const nasdaqCompChartData = $derived(() =>
		createChartData(
			'IXIC',
			'NASDAQ Composite (IXIC)',
			'rgb(59, 130, 246)',
			'rgba(59, 130, 246, 0.1)'
		)
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

	const crudeOilFuturesChartData = $derived(() =>
		createChartData('CL', 'Crude Oil Futures (CL)', 'rgb(168, 85, 247)', 'rgba(168, 85, 247, 0.1)')
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

	const jpyFuturesChartData = $derived(() =>
		createChartData(
			'6J',
			'Japanese Yen Futures (6J)',
			'rgb(14, 165, 233)',
			'rgba(14, 165, 233, 0.1)'
		)
	);

	const eurFuturesChartData = $derived(() =>
		createChartData('6E', 'Euro Futures (6E)', 'rgb(16, 185, 129)', 'rgba(16, 185, 129, 0.1)')
	);

	// M2 차트 데이터
	const m2ChartData = $derived(() =>
		createChartData('M2', 'M2 Money Supply', 'rgb(139, 92, 246)', 'rgba(139, 92, 246, 0.1)')
	);

	// 한국 M2 차트 데이터
	const m2KrChartData = $derived(() =>
		createChartData('M2_KR', 'Korea M2 Money Supply', 'rgb(236, 72, 153)', 'rgba(236, 72, 153, 0.1)')
	);

	// 자산 타입 분류 맵 - 성능 최적화: 심볼 체크를 O(1)로
	const assetTypeMap = {
		stockIndices: new Set(['SPX', 'IXIC', 'N225', 'RUT', 'NQ']),
		commodities: new Set(['GC', 'CL', 'GOLD', 'OIL']),
		bonds: new Set(['TNX', 'TREASURY', 'BOND']),
		currencies: new Set(['DXY', 'USD', 'USDKRW', '6J', '6E', 'KRW', 'JPY', 'EUR']),
		economicIndicators: new Set(['M2', 'M2_KR'])
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
			economicIndicators: [] as FinancialPrice[],
			currencies: [] as FinancialPrice[],
			commodities: [] as FinancialPrice[],
			bonds: [] as FinancialPrice[]
		};

		// 분류 및 정렬을 동시에 수행
		latestPrices.forEach((price) => {
			const type = getAssetType(price.symbol);
			groups[type].push(price);
		});

		// 주식 지수 커스텀 순서 정의: 나스닥100선물 → 나스닥종합 → S&P → Russell → Nikkei
		const stockIndicesOrder = ['NQ', 'IXIC', 'SPX', 'RUT', 'N225'];

		// 환율 커스텀 순서 정의: 달러인덱스 → 달러/원 → 엔화선물 → 유로선물
		const currenciesOrder = ['DXY', 'USDKRW', '6J', '6E'];

		// 원자재 커스텀 순서 정의: 금선물 → 원유선물
		const commoditiesOrder = ['GC', 'CL'];

		// 주식 지수는 커스텀 순서로 정렬
		groups.stockIndices.sort((a, b) => {
			const indexA = stockIndicesOrder.indexOf(a.symbol);
			const indexB = stockIndicesOrder.indexOf(b.symbol);
			// 순서에 없는 심볼은 뒤로 보내고 알파벳순 정렬
			if (indexA === -1 && indexB === -1) return a.symbol.localeCompare(b.symbol);
			if (indexA === -1) return 1;
			if (indexB === -1) return -1;
			return indexA - indexB;
		});

		// 환율 커스텀 순서로 정렬
		groups.currencies.sort((a, b) => {
			const indexA = currenciesOrder.indexOf(a.symbol);
			const indexB = currenciesOrder.indexOf(b.symbol);
			if (indexA === -1 && indexB === -1) return a.symbol.localeCompare(b.symbol);
			if (indexA === -1) return 1;
			if (indexB === -1) return -1;
			return indexA - indexB;
		});

		// 원자재 커스텀 순서로 정렬
		groups.commodities.sort((a, b) => {
			const indexA = commoditiesOrder.indexOf(a.symbol);
			const indexB = commoditiesOrder.indexOf(b.symbol);
			if (indexA === -1 && indexB === -1) return a.symbol.localeCompare(b.symbol);
			if (indexA === -1) return 1;
			if (indexB === -1) return -1;
			return indexA - indexB;
		});

		// 경제 지표는 심볼순으로 정렬
		groups.economicIndicators.sort((a, b) => a.symbol.localeCompare(b.symbol));

		// 채권은 심볼순으로 정렬
		groups.bonds.sort((a, b) => a.symbol.localeCompare(b.symbol));

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
	<!-- 기본 메타 태그 -->
	<title>BullGaze - 실시간 시장 대시보드 | 금, 주식, 환율 분석</title>
	<meta
		name="description"
		content="실시간 금(XAU), 주식지수(S&P500, NASDAQ), 환율(USD/KRW), 원자재 가격을 확인하고 투자 분석을 시작하세요. 전문적인 시장 데이터와 차트 분석 도구를 무료로 제공합니다."
	/>
	<meta
		name="keywords"
		content="실시간 금 시세, 금 가격, 주식 시세, S&P500, NASDAQ, 환율, 달러 환율, M2 통화 공급량, 경제 지표, 투자 분석, 시장 대시보드, 차트 분석, BullGaze"
	/>
	<meta name="author" content="BullGaze" />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://bullgaze.com" />

	<!-- Open Graph 메타 태그 (Facebook, LinkedIn 등) -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BullGaze" />
	<meta property="og:title" content="BullGaze - 실시간 시장 대시보드 | 금, 주식, 환율 분석" />
	<meta
		property="og:description"
		content="실시간 금(XAU), 주식지수(S&P500, NASDAQ), 환율(USD/KRW), 원자재 가격을 확인하고 투자 분석을 시작하세요."
	/>
	<meta property="og:url" content="https://bullgaze.com" />
	<meta property="og:image" content="https://bullgaze.com/og-image.jpg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:locale" content="ko_KR" />

	<!-- Twitter Card 메타 태그 -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="BullGaze - 실시간 시장 대시보드" />
	<meta
		name="twitter:description"
		content="실시간 금, 주식, 환율 가격을 확인하고 투자 분석을 시작하세요. 전문적인 시장 데이터와 차트 분석 도구를 무료로 제공합니다."
	/>
	<meta name="twitter:image" content="https://bullgaze.com/twitter-image.jpg" />

	<!-- 추가 메타 태그 -->
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="theme-color" content="#000000" />
	<meta name="format-detection" content="telephone=no" />

	<!-- 구조화된 데이터 (JSON-LD) -->
	<script type="application/ld+json">
		{JSON.stringify(structuredData)}
	</script>
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<div class="header-content">
			<h1 id="page-title">BullGaze Dashboard</h1>
			<p>실시간 시장 분석 대시보드</p>
		</div>
	</header>

	{#if loading}
		<div class="loading" role="status" aria-live="polite">
			<div class="spinner" aria-hidden="true"></div>
			<p>데이터를 불러오는 중...</p>
		</div>
	{:else if error}
		<div class="error" role="alert" aria-live="assertive">
			<p>❌ {error}</p>
		</div>
	{:else}
		<!-- 가격 카드 섹션 -->
		<section class="price-cards-container" aria-labelledby="market-prices-heading">
			<h2 id="market-prices-heading" class="sr-only">실시간 시장 가격 정보</h2>

			<!-- 주식 지수 -->
			{#if groupedPrices().stockIndices.length > 0}
				<article class="asset-group" aria-labelledby="stock-indices-title">
					<h3 id="stock-indices-title" class="group-title">📈 주식 지수</h3>
					<div class="price-cards">
						{#each groupedPrices().stockIndices as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change ? Number(price.change) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</article>
			{/if}

			<!-- 경제 지표 -->
			{#if groupedPrices().economicIndicators.length > 0}
				<article class="asset-group" aria-labelledby="economic-indicators-title">
					<h3 id="economic-indicators-title" class="group-title">📊 경제 지표</h3>
					<div class="price-cards">
						{#each groupedPrices().economicIndicators as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change ? Number(price.change) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</article>
			{/if}

			<!-- 환율 -->
			{#if groupedPrices().currencies.length > 0}
				<article class="asset-group" aria-labelledby="currencies-title">
					<h3 id="currencies-title" class="group-title">💱 환율</h3>
					<div class="price-cards">
						{#each groupedPrices().currencies as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change ? Number(price.change) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</article>
			{/if}

			<!-- 원자재 -->
			{#if groupedPrices().commodities.length > 0}
				<article class="asset-group" aria-labelledby="commodities-title">
					<h3 id="commodities-title" class="group-title">🥇 원자재</h3>
					<div class="price-cards">
						{#each groupedPrices().commodities as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change ? Number(price.change) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</article>
			{/if}

			<!-- 채권 -->
			{#if groupedPrices().bonds.length > 0}
				<article class="asset-group" aria-labelledby="bonds-title">
					<h3 id="bonds-title" class="group-title">🏛️ 채권</h3>
					<div class="price-cards">
						{#each groupedPrices().bonds as price}
							<PriceCard
								name={price.name}
								symbol={price.symbol}
								price={Number(price.price)}
								currency={price.currency}
								change24h={price.change ? Number(price.change) : undefined}
								changePercent={price.change_percent ? Number(price.change_percent) : undefined}
							/>
						{/each}
					</div>
				</article>
			{/if}
		</section>

		<!-- 차트 섹션 -->
		<section class="charts" aria-labelledby="charts-heading">
			<h2 id="charts-heading" class="sr-only">시장 가격 추이 차트</h2>

			<!-- 주식 지수 차트 -->
			{#if historicalData['NQ']?.length}
				<div class="chart-wrapper" id="chart-NQ">
					<LineChart
						labels={nasdaqFuturesChartData().labels}
						datasets={nasdaqFuturesChartData().datasets}
						title="나스닥-100 선물 (NQ) 추이"
						currentPrice={getCurrentPrice('NQ')}
						currency={getCurrency('NQ')}
					/>
				</div>
			{/if}

			{#if historicalData['IXIC']?.length}
				<div class="chart-wrapper" id="chart-IXIC">
					<LineChart
						labels={nasdaqCompChartData().labels}
						datasets={nasdaqCompChartData().datasets}
						title="나스닥 종합지수 (IXIC) 추이"
						currentPrice={getCurrentPrice('IXIC')}
						currency={getCurrency('IXIC')}
					/>
				</div>
			{/if}

			{#if historicalData['SPX']?.length}
				<div class="chart-wrapper" id="chart-SPX">
					<LineChart
						labels={sp500ChartData().labels}
						datasets={sp500ChartData().datasets}
						title="S&P 500 (SPX) 지수 추이"
						currentPrice={getCurrentPrice('SPX')}
						currency={getCurrency('SPX')}
					/>
				</div>
			{/if}

			{#if historicalData['RUT']?.length}
				<div class="chart-wrapper" id="chart-RUT">
					<LineChart
						labels={russell2000ChartData().labels}
						datasets={russell2000ChartData().datasets}
						title="러셀 2000 (RUT) 지수 추이"
						currentPrice={getCurrentPrice('RUT')}
						currency={getCurrency('RUT')}
					/>
				</div>
			{/if}

			{#if historicalData['N225']?.length}
				<div class="chart-wrapper" id="chart-N225">
					<LineChart
						labels={nikkeiChartData().labels}
						datasets={nikkeiChartData().datasets}
						title="닛케이 225 (N225) 지수 추이"
						currentPrice={getCurrentPrice('N225')}
						currency={getCurrency('N225')}
					/>
				</div>
			{/if}

			<!-- 경제 지표 차트 -->
			{#if historicalData['M2']?.length}
				<div class="chart-wrapper" id="chart-M2">
					<LineChart
						labels={m2ChartData().labels}
						datasets={m2ChartData().datasets}
						title="미국 M2 통화 공급량 추이"
						currentPrice={getCurrentPrice('M2')}
						currency={getCurrency('M2')}
					/>
				</div>
			{/if}

			{#if historicalData['M2_KR']?.length}
				<div class="chart-wrapper" id="chart-M2_KR">
					<LineChart
						labels={m2KrChartData().labels}
						datasets={m2KrChartData().datasets}
						title="한국 M2 통화 공급량 추이"
						currentPrice={getCurrentPrice('M2_KR')}
						currency={getCurrency('M2_KR')}
					/>
				</div>
			{/if}

			<!-- 환율 차트 -->
			{#if historicalData['DXY']?.length}
				<div class="chart-wrapper" id="chart-DXY">
					<LineChart
						labels={dollarIndexChartData().labels}
						datasets={dollarIndexChartData().datasets}
						title="달러 인덱스 (DXY) 추이"
						currentPrice={getCurrentPrice('DXY')}
						currency={getCurrency('DXY')}
					/>
				</div>
			{/if}

			{#if historicalData['USDKRW']?.length}
				<div class="chart-wrapper" id="chart-USDKRW">
					<LineChart
						labels={usdKrwChartData().labels}
						datasets={usdKrwChartData().datasets}
						title="달러-원 (USD/KRW) 환율 추이"
						currentPrice={getCurrentPrice('USDKRW')}
						currency={getCurrency('USDKRW')}
					/>
				</div>
			{/if}

			{#if historicalData['6J']?.length}
				<div class="chart-wrapper" id="chart-6J">
					<LineChart
						labels={jpyFuturesChartData().labels}
						datasets={jpyFuturesChartData().datasets}
						title="엔화 선물 (6J) 추이"
						currentPrice={getCurrentPrice('6J')}
						currency={getCurrency('6J')}
					/>
				</div>
			{/if}

			{#if historicalData['6E']?.length}
				<div class="chart-wrapper" id="chart-6E">
					<LineChart
						labels={eurFuturesChartData().labels}
						datasets={eurFuturesChartData().datasets}
						title="유로 선물 (6E) 추이"
						currentPrice={getCurrentPrice('6E')}
						currency={getCurrency('6E')}
					/>
				</div>
			{/if}

			<!-- 원자재 차트 -->
			{#if historicalData['GC']?.length}
				<div class="chart-wrapper" id="chart-GC">
					<LineChart
						labels={goldFuturesChartData().labels}
						datasets={goldFuturesChartData().datasets}
						title="금 선물 (GC) 가격 추이"
						currentPrice={getCurrentPrice('GC')}
						currency={getCurrency('GC')}
					/>
				</div>
			{/if}

			{#if historicalData['CL']?.length}
				<div class="chart-wrapper" id="chart-CL">
					<LineChart
						labels={crudeOilFuturesChartData().labels}
						datasets={crudeOilFuturesChartData().datasets}
						title="원유 선물 (CL) 가격 추이"
						currentPrice={getCurrentPrice('CL')}
						currency={getCurrency('CL')}
					/>
				</div>
			{/if}

			<!-- 채권 차트 -->
			{#if historicalData['TNX']?.length}
				<div class="chart-wrapper" id="chart-TNX">
					<LineChart
						labels={us10YearTreasuryChartData().labels}
						datasets={us10YearTreasuryChartData().datasets}
						title="미국 10년 국채 (TNX) 수익률 추이"
						currentPrice={getCurrentPrice('TNX')}
						currency={getCurrency('TNX')}
					/>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	/* 스크린 리더 전용 클래스 - SEO 및 접근성 향상 */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.dashboard {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
		/* 페이지 배경 제거: 상위 배경을 그대로 사용 */
		background: transparent;
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
		margin-bottom: 1rem;
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
