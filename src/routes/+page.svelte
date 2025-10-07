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

	// 최신 가격 데이터 가져오기
	async function fetchLatestPrices() {
		try {
			// 모든 데이터를 가져온 후 클라이언트에서 중복 제거
			const { data: allData, error: fetchError } = await supabase
				.from('financial_dashboard_prices')
				.select('symbol, asset_type, name')
				.order('symbol');

			if (fetchError) throw fetchError;

			// 클라이언트에서 고유한 심볼들 추출
			const uniqueSymbols = new Map<string, { symbol: string; asset_type: string; name: string }>();
			allData?.forEach((item) => {
				const key = `${item.symbol}-${item.asset_type}`;
				if (!uniqueSymbols.has(key)) {
					uniqueSymbols.set(key, item);
				}
			});

			const latestPricesArray: FinancialPrice[] = [];

			// 각 심볼에 대해 최신 데이터를 개별적으로 가져오기
			for (const symbolInfo of uniqueSymbols.values()) {
				const { data: latestData, error: latestError } = await supabase
					.from('financial_dashboard_prices')
					.select('*')
					.eq('symbol', symbolInfo.symbol)
					.eq('asset_type', symbolInfo.asset_type)
					.order('updated_at', { ascending: false })
					.limit(1)
					.single();

				if (!latestError && latestData) {
					latestPricesArray.push(latestData);
				}
			}

			latestPrices = latestPricesArray;
			lastUpdated = new Date();

			// 디버깅: 콘솔에 데이터 정보 출력
			console.log('Total symbols found:', uniqueSymbols.size);
			console.log('Latest prices count:', latestPrices.length);
			console.log(
				'All symbols in data:',
				latestPrices.map((item) => item.symbol)
			);
			console.log(
				'All asset types:',
				latestPrices
					.map((item) => item.asset_type)
					.filter((type, index, arr) => arr.indexOf(type) === index)
			);
		} catch (e) {
			error = e instanceof Error ? e.message : '데이터를 불러오는데 실패했습니다.';
		}
	}

	// 히스토리 데이터 가져오기 (최근 30일)
	async function fetchHistoricalData() {
		try {
			const { data, error: fetchError } = await supabase
				.from('financial_dashboard_prices')
				.select('*')
				.order('updated_at', { ascending: true });

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

	// 차트 데이터 준비
	const goldChartData = $derived(() => {
		const data = historicalData['XAU'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'Gold (XAU)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(255, 193, 7)',
					backgroundColor: 'rgba(255, 193, 7, 0.1)',
					fill: true
				}
			]
		};
	});

	const nasdaqChartData = $derived(() => {
		const data = historicalData['NDX'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'NASDAQ-100 (NDX)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(59, 130, 246)',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					fill: true
				}
			]
		};
	});

	const dollarIndexChartData = $derived(() => {
		const data = historicalData['DXY'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'U.S. Dollar Index (DXY)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(16, 185, 129)',
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
					fill: true
				}
			]
		};
	});

	const sp500ChartData = $derived(() => {
		const data = historicalData['SPX'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'S&P 500 (SPX)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(239, 68, 68)',
					backgroundColor: 'rgba(239, 68, 68, 0.1)',
					fill: true
				}
			]
		};
	});

	const crudeOilChartData = $derived(() => {
		const data = historicalData['WTI'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'Crude Oil WTI (WTI)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(168, 85, 247)',
					backgroundColor: 'rgba(168, 85, 247, 0.1)',
					fill: true
				}
			]
		};
	});

	const nikkeiChartData = $derived(() => {
		const data = historicalData['N225'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'Nikkei 225 (N225)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(245, 158, 11)',
					backgroundColor: 'rgba(245, 158, 11, 0.1)',
					fill: true
				}
			]
		};
	});

	const nasdaqFuturesChartData = $derived(() => {
		const data = historicalData['NQ'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'NASDAQ-100 Futures (NQ)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(99, 102, 241)',
					backgroundColor: 'rgba(99, 102, 241, 0.1)',
					fill: true
				}
			]
		};
	});

	const russell2000ChartData = $derived(() => {
		const data = historicalData['RUT'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'Russell 2000 (RUT)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(34, 197, 94)',
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					fill: true
				}
			]
		};
	});

	const us10YearTreasuryChartData = $derived(() => {
		const data = historicalData['TNX'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'US 10-Year Treasury (TNX)',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(251, 191, 36)',
					backgroundColor: 'rgba(251, 191, 36, 0.1)',
					fill: true
				}
			]
		};
	});

	const usdKrwChartData = $derived(() => {
		const data = historicalData['USDKRW'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'USD/KRW',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(220, 38, 127)',
					backgroundColor: 'rgba(220, 38, 127, 0.1)',
					fill: true
				}
			]
		};
	});

	const usdJpyChartData = $derived(() => {
		const data = historicalData['USDJPY'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'USD/JPY',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(14, 165, 233)',
					backgroundColor: 'rgba(14, 165, 233, 0.1)',
					fill: true
				}
			]
		};
	});

	const usdEurChartData = $derived(() => {
		const data = historicalData['USDEUR'] || [];
		return {
			labels: data.map((d) => new Date(d.updated_at).toLocaleDateString('ko-KR')),
			datasets: [
				{
					label: 'USD/EUR',
					data: data.map((d) => Number(d.price)),
					borderColor: 'rgb(16, 185, 129)',
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
					fill: true
				}
			]
		};
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
		<section class="price-cards">
			{#each latestPrices as price}
				<PriceCard
					name={price.name}
					symbol={price.symbol}
					price={Number(price.price)}
					currency={price.currency}
					change24h={price.change_24h ? Number(price.change_24h) : undefined}
					changePercent={price.change_percent ? Number(price.change_percent) : undefined}
				/>
			{/each}
		</section>

		<!-- 차트 섹션 -->
		<section class="charts">
			{#if historicalData['XAU']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={goldChartData().labels}
						datasets={goldChartData().datasets}
						title="금 (XAU) 가격 추이"
					/>
				</div>
			{/if}

			{#if historicalData['SPX']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={sp500ChartData().labels}
						datasets={sp500ChartData().datasets}
						title="S&P 500 (SPX) 지수 추이"
					/>
				</div>
			{/if}

			{#if historicalData['NDX']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={nasdaqChartData().labels}
						datasets={nasdaqChartData().datasets}
						title="나스닥-100 (NDX) 지수 추이"
					/>
				</div>
			{/if}

			{#if historicalData['DXY']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={dollarIndexChartData().labels}
						datasets={dollarIndexChartData().datasets}
						title="달러 인덱스 (DXY) 추이"
					/>
				</div>
			{/if}

			{#if historicalData['WTI']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={crudeOilChartData().labels}
						datasets={crudeOilChartData().datasets}
						title="원유 WTI (WTI) 가격 추이"
					/>
				</div>
			{/if}

			{#if historicalData['N225']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={nikkeiChartData().labels}
						datasets={nikkeiChartData().datasets}
						title="닛케이 225 (N225) 지수 추이"
					/>
				</div>
			{/if}

			{#if historicalData['NQ']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={nasdaqFuturesChartData().labels}
						datasets={nasdaqFuturesChartData().datasets}
						title="나스닥-100 선물 (NQ) 추이"
					/>
				</div>
			{/if}

			{#if historicalData['RUT']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={russell2000ChartData().labels}
						datasets={russell2000ChartData().datasets}
						title="러셀 2000 (RUT) 지수 추이"
					/>
				</div>
			{/if}

			{#if historicalData['TNX']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={us10YearTreasuryChartData().labels}
						datasets={us10YearTreasuryChartData().datasets}
						title="미국 10년 국채 (TNX) 수익률 추이"
					/>
				</div>
			{/if}

			{#if historicalData['USDKRW']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={usdKrwChartData().labels}
						datasets={usdKrwChartData().datasets}
						title="달러-원 (USD/KRW) 환율 추이"
					/>
				</div>
			{/if}

			{#if historicalData['USDJPY']?.length}
				<div class="chart-wrapper">
					<LineChart
						labels={usdJpyChartData().labels}
						datasets={usdJpyChartData().datasets}
						title="달러-엔 (USD/JPY) 환율 추이"
					/>
				</div>
			{/if}

			{#if historicalData['USDEUR']?.length}
				<div class="chart-wrapper">
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

	.header-actions {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		margin: 2rem 0;
		flex-wrap: wrap;
	}

	.refresh-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #60a5fa, #3b82f6);
		color: white;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
	}

	.refresh-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(96, 165, 250, 0.4);
	}

	.refresh-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.spinner-small {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.last-updated {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
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

	.price-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
		padding: 0 1rem;
	}

	.charts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
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

		.header-actions {
			flex-direction: column;
			gap: 1rem;
		}

		.price-cards {
			grid-template-columns: 1fr;
			padding: 0;
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
