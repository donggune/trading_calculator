<script lang="ts">
	import RealtimeCandlestickChart from '$lib/components/RealtimeCandlestickChart.svelte';

	// 지원하는 심볼 목록 (대시보드와 동일)
	const symbols = [
		// 주식 지수
		{ symbol: 'NQ=F', name: '나스닥-100 선물 (NQ)', shortName: 'NQ', category: '주식' },
		{ symbol: '^IXIC', name: '나스닥 종합 (IXIC)', shortName: 'IXIC', category: '주식' },
		{ symbol: '^GSPC', name: 'S&P 500 (SPX)', shortName: 'SPX', category: '주식' },
		{ symbol: '^RUT', name: '러셀 2000 (RUT)', shortName: 'RUT', category: '주식' },
		{ symbol: '^N225', name: '닛케이 225 (N225)', shortName: 'N225', category: '주식' },
		// 환율
		{ symbol: 'DX-Y.NYB', name: '달러 인덱스 (DXY)', shortName: 'DXY', category: '환율' },
		{ symbol: 'KRW=X', name: '달러/원 (USDKRW)', shortName: 'USDKRW', category: '환율' },
		{ symbol: '6J=F', name: '엔화 선물 (6J)', shortName: '6J', category: '환율' },
		{ symbol: '6E=F', name: '유로 선물 (6E)', shortName: '6E', category: '환율' },
		// 원자재
		{ symbol: 'GC=F', name: '금 선물 (GC)', shortName: 'GC', category: '원자재' },
		{ symbol: 'CL=F', name: '원유 선물 (CL)', shortName: 'CL', category: '원자재' },
		// 채권
		{ symbol: '^TNX', name: '미국 10년 국채 (TNX)', shortName: 'TNX', category: '채권' }
	];

	let selectedSymbol = $state(symbols[0]);

	// SEO 구조화된 데이터
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'BullGaze 실시간 캔들차트',
		description: '나스닥-100 선물(NQ) 실시간 캔들차트 - 1분, 5분, 15분, 1시간, 일봉 지원',
		url: 'https://bullgaze.com/realtime',
		applicationCategory: 'FinanceApplication',
		featureList: ['실시간 캔들차트', '다중 타임프레임', '자동 업데이트']
	};
</script>

<svelte:head>
	<title>실시간 캔들차트 - BullGaze</title>
	<meta
		name="description"
		content="나스닥-100 선물(NQ) 실시간 캔들차트를 확인하세요. 1분, 5분, 15분, 1시간, 일봉 타임프레임을 지원합니다."
	/>
	<meta
		name="keywords"
		content="실시간 캔들차트, 나스닥 선물, NQ, 캔들스틱, 기술적 분석, BullGaze"
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
				{selectedSymbol.name} 실시간 가격 추이
			</p>

			<!-- 장식적 요소 -->
			<div class="mt-4 flex justify-center space-x-2">
				<div class="h-1 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"></div>
				<div class="h-1 w-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
				<div class="h-1 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
			</div>
		</div>

		<main class="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr] lg:gap-8">
			<!-- 심볼 선택 -->
			<aside
				class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl lg:sticky lg:top-24 lg:p-6"
			>
				<h3 class="mb-4 text-lg font-bold text-white">지수 선택</h3>
				<div class="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-2">
					{#each symbols as symbolItem}
						<button
							class="flex flex-col items-start gap-1 rounded-xl border p-2 text-left transition-all lg:p-3 {selectedSymbol.symbol ===
							symbolItem.symbol
								? 'border-blue-500/50 bg-blue-500/20'
								: 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}"
							onclick={() => (selectedSymbol = symbolItem)}
						>
							<span
								class="text-xs font-bold lg:text-sm {selectedSymbol.symbol === symbolItem.symbol
									? 'text-white'
									: 'text-blue-400'}">{symbolItem.shortName}</span
							>
							<span
								class="text-xs {selectedSymbol.symbol === symbolItem.symbol
									? 'text-gray-200'
									: 'text-gray-400'}">{symbolItem.name}</span
							>
						</button>
					{/each}
				</div>
			</aside>

			<!-- 캔들차트 -->
			<section class="min-w-0">
				<RealtimeCandlestickChart
					symbol={selectedSymbol.symbol}
					title={selectedSymbol.name}
					interval="5m"
					realtime={false}
				/>
			</section>
		</main>
	</div>
</div>

<style>
	/* 추가 스타일이 필요한 경우 여기에 작성 */
</style>
