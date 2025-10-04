<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import LineChart from '$lib/components/LineChart.svelte';
	import PriceCard from '$lib/components/PriceCard.svelte';
	import type { FinancialPrice } from '$lib/types';
	import { page } from '$app/stores';

	// SEO 메타 태그
	$effect(() => {
		page.title = 'BullGaze - 실시간 시장 대시보드';
		page.description =
			'실시간 금, 은, 암호화폐 가격을 확인하고 투자 분석을 시작하세요. 전문적인 시장 데이터와 차트 분석 도구를 제공합니다.';
	});

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
	let error = $state<string | null>(null);
	let latestPrices = $state<FinancialPrice[]>([]);
	let historicalData = $state<{ [key: string]: FinancialPrice[] }>({});

	// 최신 가격 데이터 가져오기
	async function fetchLatestPrices() {
		try {
			const { data, error: fetchError } = await supabase
				.from('financial_dashboard_prices')
				.select('*')
				.order('updated_at', { ascending: false })
				.limit(100);

			if (fetchError) throw fetchError;

			// 각 심볼의 최신 데이터만 가져오기
			const latest = new Map<string, FinancialPrice>();
			data?.forEach((item) => {
				const key = `${item.symbol}-${item.asset_type}`;
				if (!latest.has(key)) {
					latest.set(key, item);
				}
			});

			latestPrices = Array.from(latest.values());
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

	onMount(async () => {
		loading = true;
		await Promise.all([fetchLatestPrices(), fetchHistoricalData()]);
		loading = false;
	});
</script>

<!-- 구조화된 데이터 -->
<svelte:head>
	<script type="application/ld+json">
		{JSON.stringify(structuredData)}
	</script>
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<div class="header-content">
			<h1>📊 BullGaze Dashboard</h1>
			<p>실시간 시장 분석 대시보드</p>
			<div class="header-stats">
				<div class="stat-item">
					<span class="stat-label">실시간</span>
					<span class="stat-value">업데이트 중</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">데이터</span>
					<span class="stat-value">{latestPrices.length}개</span>
				</div>
			</div>
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
					changePercent={Number(price.change_percent || 0)}
					currency={price.currency}
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

	.header-stats {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-top: 1.5rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem 1.5rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
	}

	.stat-label {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.125rem;
		font-weight: 600;
		color: #60a5fa;
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
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.charts {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.chart-wrapper {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		transition: all 0.3s ease;
	}

	.chart-wrapper:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
		border-color: rgba(255, 255, 255, 0.2);
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem;
		}

		.dashboard-header h1 {
			font-size: 2.5rem;
		}

		.header-stats {
			flex-direction: column;
			gap: 1rem;
			align-items: center;
		}

		.stat-item {
			width: 200px;
		}

		.price-cards {
			grid-template-columns: 1fr;
		}

		.chart-wrapper {
			padding: 1.5rem;
		}
	}

	@media (max-width: 480px) {
		.dashboard-header h1 {
			font-size: 2rem;
		}

		.dashboard-header p {
			font-size: 1rem;
		}
	}
</style>
