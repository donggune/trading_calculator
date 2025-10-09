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
				.neq('asset_type', 'economic_indicator')
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

<div class="min-h-screen pb-24">
	<div
		class="relative mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8 xl:max-w-none xl:px-12"
	>
		<!-- 헤더 -->
		<div class="mb-12 text-center">
			<!-- 상단 마진 (메인 타이틀 영역) -->
			<div class="mb-16"></div>

			<!-- 서브타이틀 -->
			<p class="text-lg text-gray-300 md:text-xl">
				자산 간의 관계성을 파악하고 투자 인사이트를 발견하세요
			</p>

			<!-- 장식적 요소 -->
			<div class="mt-4 flex justify-center space-x-2">
				<div class="h-1 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
				<div class="h-1 w-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
				<div class="h-1 w-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500"></div>
			</div>
		</div>

		{#if loading}
			<div
				class="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
			>
				<div
					class="mb-4 h-15 w-15 animate-spin rounded-full border-4 border-white/10 border-t-blue-400 shadow-lg shadow-blue-400/30"
				></div>
				<p class="text-lg font-medium text-white">데이터를 분석하는 중...</p>
			</div>
		{:else if error}
			<div
				class="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
			>
				<p class="mb-4 text-lg font-medium text-red-400">❌ {error}</p>
				<button
					onclick={loadData}
					class="rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
					>다시 시도</button
				>
			</div>
		{:else}
			<!-- 자산 선택 및 비교 (히트맵보다 먼저 노출) -->
			<section class="mb-8 px-4">
				<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
					<div class="mb-6">
						<h3 class="mb-2 text-xl font-bold text-white">자산 선택 (최대 4개)</h3>
						<p class="text-sm text-gray-400">
							비교할 자산을 선택하세요. 히트맵을 클릭해도 추가됩니다.
						</p>
					</div>

					<div class="mb-6 flex flex-wrap gap-3">
						{#each availableAssets as asset}
							<button
								class="flex items-center gap-2 rounded-full border-2 px-4 py-2 text-white transition-all {selectedAssets.includes(
									asset.symbol
								)
									? 'border-blue-500/50 bg-blue-500/20'
									: 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}"
								onclick={() => toggleAssetSelection(asset.symbol)}
							>
								<span class="text-sm font-bold">{asset.symbol}</span>
								<span class="text-xs text-gray-400">{asset.name}</span>
								{#if selectedAssets.includes(asset.symbol)}
									<span class="text-blue-400">✓</span>
								{/if}
							</button>
						{/each}
					</div>

					{#if selectedAssets.length > 0}
						<div class="mb-6">
							<label class="flex items-center gap-2 text-sm text-gray-300">
								<input type="checkbox" bind:checked={useNormalized} class="h-4 w-4" />
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
			<section class="mb-8 px-4">
				<InsightCard {insights} />
			</section>

			<!-- 상관관계 히트맵 -->
			{#if correlationMatrix}
				<section class="mb-8 px-4">
					<CorrelationHeatmap data={correlationMatrix} onCellClick={handleHeatmapClick} />
				</section>
			{/if}
		{/if}
	</div>
</div>

<style>
	/* 추가 스타일이 필요한 경우 여기에 작성 */
</style>
