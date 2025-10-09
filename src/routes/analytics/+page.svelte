<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import CorrelationHeatmap from '$lib/components/CorrelationHeatmap.svelte';
	import AssetComparisonChart from '$lib/components/AssetComparisonChart.svelte';
	import InsightCard from '$lib/components/InsightCard.svelte';
	import { createCorrelationMatrix, extractInsights, normalizeData } from '$lib/utils/correlation';
	import type {
		FinancialPrice,
		CorrelationMatrix,
		MarketInsight,
		AssetComparison
	} from '$lib/types';

	// SEO 구조화된 데이터
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'BullGaze 시장 상관관계 분석',
		description: '금융 자산 간의 상관관계를 분석하고 시장 인사이트를 제공하는 도구',
		url: 'https://bullgaze.com/analytics',
		applicationCategory: 'FinanceApplication',
		featureList: ['상관관계 히트맵', '자산 비교 차트', '시장 인사이트']
	};

	// 상태 관리
	let loading = $state(true);
	let error = $state<string | null>(null);
	let historicalData = $state<{ [key: string]: FinancialPrice[] }>({});
	let correlationMatrix = $state<CorrelationMatrix | null>(null);
	let insights = $state<MarketInsight[]>([]);

	// 비교할 자산 선택 (초기: 환율 4개)
	let selectedAssets = $state<string[]>(['DXY', 'USDKRW', '6J', '6E']);
	let availableAssets = $state<{ symbol: string; name: string }[]>([]);
	let comparisonAssets = $state<AssetComparison[]>([]);
	let useNormalized = $state(true);

	// 데이터 로드
	async function loadData() {
		loading = true;
		error = null;

		try {
			// 최근 30일 데이터 가져오기
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			const dateFilter = thirtyDaysAgo.toISOString();

			const { data, error: fetchError } = await supabase
				.from('financial_dashboard_prices')
				.select('*')
				.gte('created_at', dateFilter)
				.order('created_at', { ascending: true });

			if (fetchError) throw fetchError;

			// 심볼별로 그룹화
			const grouped: { [key: string]: FinancialPrice[] } = {};
			const assetMap = new Map<string, string>();

			data?.forEach((item) => {
				const symbol = item.symbol;
				if (!grouped[symbol]) {
					grouped[symbol] = [];
				}
				grouped[symbol].push(item);
				assetMap.set(symbol, item.name);
			});

			historicalData = grouped;

			// 사용 가능한 자산 목록 생성
			availableAssets = Array.from(assetMap.entries()).map(([symbol, name]) => ({
				symbol,
				name
			}));

			// 초기 선택 자산 유효성 확인 및 반영
			selectedAssets = selectedAssets.filter((s) => assetMap.has(s)).slice(0, 4);
			updateComparisonData();

			// 상관관계 행렬 생성
			correlationMatrix = createCorrelationMatrix(grouped);

			// 인사이트 추출
			if (correlationMatrix) {
				insights = extractInsights(correlationMatrix);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : '데이터를 불러오는데 실패했습니다.';
			console.error('데이터 로드 오류:', e);
		} finally {
			loading = false;
		}
	}

	// 히트맵 셀 클릭 핸들러
	function handleHeatmapClick(asset1: string, asset2: string) {
		// 두 자산을 최근 선택으로 반영하고, 최대 4개를 유지 (FIFO)
		addAssetsWithLimit([asset1, asset2]);
		updateComparisonData();
	}

	// 최대 4개 유지하며 자산 추가 (중복 제거 + FIFO)
	function addAssetsWithLimit(symbols: string[]) {
		const set = new Set<string>(selectedAssets);
		// 먼저 기존에서 클릭한 심볼을 제거해 순서를 최신으로
		for (const s of symbols) {
			set.delete(s);
		}
		const reordered = [...set];
		const result: string[] = [...reordered, ...symbols];
		// 최대 4개 초과 시 앞에서 제거
		while (result.length > 4) result.shift();
		selectedAssets = result;
	}

	// 자산 선택 토글
	function toggleAssetSelection(symbol: string) {
		if (selectedAssets.includes(symbol)) {
			selectedAssets = selectedAssets.filter((s) => s !== symbol);
		} else {
			// 최대 4개 유지 (FIFO)
			addAssetsWithLimit([symbol]);
		}
		updateComparisonData();
	}

	// 비교 데이터 업데이트
	function updateComparisonData() {
		comparisonAssets = selectedAssets
			.filter((symbol) => historicalData[symbol])
			.map((symbol) => {
				const data = historicalData[symbol];
				const prices = data.map((d) => Number(d.price));
				const dates = data.map((d) => formatDate(d.created_at));

				return {
					symbol,
					name: availableAssets.find((a) => a.symbol === symbol)?.name || symbol,
					data: prices,
					dates,
					normalizedData: normalizeData(prices)
				};
			});
	}

	// 날짜 포맷팅
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
	}

	onMount(() => {
		loadData();
	});
</script>

<!-- SEO 메타 태그 -->
<svelte:head>
	<title>시장 상관관계 분석 - BullGaze</title>
	<meta
		name="description"
		content="금융 자산 간의 상관관계를 분석하고, 자산 비교 차트와 시장 인사이트를 확인하세요. BullGaze에서 제공하는 전문적인 시장 분석 도구입니다."
	/>
	<meta
		name="keywords"
		content="상관관계 분석, 자산 비교, 시장 인사이트, 금융 분석, 투자 전략, BullGaze"
	/>
	<script type="application/ld+json">
		{JSON.stringify(structuredData)}
	</script>
</svelte:head>

<div class="analytics-page">
	<header class="page-header">
		<div class="header-content">
			<h1>시장 상관관계 분석</h1>
			<p>자산 간의 관계성을 파악하고 투자 인사이트를 발견하세요</p>
		</div>
	</header>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>데이터를 분석하는 중...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>❌ {error}</p>
			<button onclick={loadData} class="retry-button">다시 시도</button>
		</div>
	{:else}
		<!-- 자산 선택 및 비교 (히트맵보다 먼저 노출) -->
		<section class="section">
			<div class="comparison-section">
				<div class="asset-selector">
					<div class="selector-header">
						<h3>자산 선택 (최대 4개)</h3>
						<p class="description">비교할 자산을 선택하세요. 히트맵을 클릭해도 추가됩니다.</p>
					</div>

					<div class="asset-chips">
						{#each availableAssets as asset}
							<button
								class="asset-chip"
								class:selected={selectedAssets.includes(asset.symbol)}
								onclick={() => toggleAssetSelection(asset.symbol)}
							>
								<span class="chip-symbol">{asset.symbol}</span>
								<span class="chip-name">{asset.name}</span>
								{#if selectedAssets.includes(asset.symbol)}
									<span class="chip-check">✓</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				{#if selectedAssets.length > 0}
					<div class="comparison-options">
						<label class="toggle-label">
							<input type="checkbox" bind:checked={useNormalized} />
							<span>정규화 보기 (시작점 = 100)</span>
						</label>
					</div>

					<AssetComparisonChart
						assets={comparisonAssets}
						normalized={useNormalized}
						title="선택된 자산 비교"
					/>
				{/if}
			</div>
		</section>

		<!-- 인사이트 카드 -->
		<section class="section">
			<InsightCard {insights} />
		</section>

		<!-- 상관관계 히트맵 -->
		{#if correlationMatrix}
			<section class="section">
				<CorrelationHeatmap data={correlationMatrix} onCellClick={handleHeatmapClick} />
			</section>
		{/if}
	{/if}
</div>

<style>
	.analytics-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
		background: transparent;
	}

	.page-header {
		text-align: center;
		margin-bottom: 3rem;
	}



	.header-content h1 {
		font-size: 3rem;
		font-weight: 800;
		background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #ec4899 100%);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin-bottom: 0.5rem;
	}

	.header-content p {
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.section {
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
	}

	.spinner {
		width: 60px;
		height: 60px;
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-top-color: #60a5fa;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error p {
		color: #f87171;
		font-size: 1.125rem;
		margin-bottom: 1rem;
	}

	.retry-button {
		padding: 0.75rem 1.5rem;
		background: #60a5fa;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.retry-button:hover {
		background: #3b82f6;
	}

	.comparison-section {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.selector-header {
		margin-bottom: 1.5rem;
	}

	.selector-header h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin-bottom: 0.5rem;
	}

	.description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.asset-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.asset-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.2s;
		color: white;
	}

	.asset-chip:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.asset-chip.selected {
		background: rgba(96, 165, 250, 0.2);
		border-color: rgba(96, 165, 250, 0.5);
	}

	.chip-symbol {
		font-weight: 700;
		font-size: 0.875rem;
	}

	.chip-name {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.chip-check {
		font-size: 1rem;
		color: #60a5fa;
	}

	.comparison-options {
		margin-bottom: 1.5rem;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		font-size: 0.875rem;
	}

	.toggle-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	@media (max-width: 768px) {
		.analytics-page {
			padding: 1rem;
		}

		.header-content h1 {
			font-size: 2rem;
		}

		.header-content p {
			font-size: 1rem;
		}

		.comparison-section {
			padding: 1rem;
		}

		.asset-chips {
			gap: 0.5rem;
		}
	}
</style>
