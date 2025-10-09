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

<div class="realtime-page">
	<header class="page-header">
		<div class="header-content">
			<h1>실시간 캔들차트</h1>
			<p>{selectedSymbol.name} 실시간 가격 추이</p>
		</div>
	</header>

	<main class="main-content">
		<!-- 심볼 선택 -->
		<aside class="symbol-selector">
			<h3>지수 선택</h3>
			<div class="symbol-list">
				{#each symbols as symbolItem}
					<button
						class="symbol-btn"
						class:active={selectedSymbol.symbol === symbolItem.symbol}
						onclick={() => (selectedSymbol = symbolItem)}
					>
						<span class="symbol-short">{symbolItem.shortName}</span>
						<span class="symbol-name">{symbolItem.name}</span>
					</button>
				{/each}
			</div>
		</aside>

		<!-- 캔들차트 -->
		<section class="chart-section">
			<RealtimeCandlestickChart
				symbol={selectedSymbol.symbol}
				title={selectedSymbol.name}
				interval="5m"
				realtime={false}
			/>
		</section>
	</main>
</div>

<style>
	.realtime-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		padding-bottom: 8rem;
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
		margin-bottom: 2rem;
	}



	.main-content {
		display: grid;
		grid-template-columns: 250px 1fr;
		gap: 2rem;
		align-items: start;
	}

	.symbol-selector {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: sticky;
		top: 100px;
	}

	.symbol-selector h3 {
		font-size: 1.125rem;
		font-weight: 700;
		color: white;
		margin-bottom: 1rem;
	}

	.symbol-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.symbol-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		width: 100%;
	}

	.symbol-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateX(4px);
	}

	.symbol-btn.active {
		background: rgba(96, 165, 250, 0.2);
		border-color: rgba(96, 165, 250, 0.5);
		color: white;
	}

	.symbol-short {
		font-size: 1rem;
		font-weight: 700;
		font-family: monospace;
		color: #60a5fa;
	}

	.symbol-btn.active .symbol-short {
		color: white;
	}

	.symbol-name {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.symbol-btn.active .symbol-name {
		color: rgba(255, 255, 255, 0.9);
	}

	.chart-section {
		min-width: 0;
		width: 100%;
	}

	@media (max-width: 1024px) {
		.main-content {
			grid-template-columns: 1fr;
		}

		.symbol-selector {
			position: static;
		}

		.symbol-list {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 0.75rem;
		}

		.symbol-btn {
			padding: 0.75rem;
		}

		.symbol-short {
			font-size: 0.875rem;
		}

		.symbol-name {
			font-size: 0.7rem;
		}
	}

	@media (max-width: 768px) {
		.realtime-page {
			padding: 1rem;
			padding-bottom: 8rem;
		}

		.page-header {
			margin-bottom: 2rem;
		}

		.header-content h1 {
			font-size: 1.75rem;
		}

		.header-content p {
			font-size: 0.875rem;
			margin-bottom: 1rem;
		}

		.main-content {
			gap: 1.5rem;
		}

		.symbol-selector {
			padding: 1rem;
		}

		.symbol-selector h3 {
			font-size: 1rem;
			margin-bottom: 0.75rem;
		}

		.symbol-list {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.symbol-btn {
			padding: 0.875rem 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.realtime-page {
			padding: 0.75rem;
			padding-bottom: 8rem;
		}

		.page-header {
			margin-bottom: 1.5rem;
		}

		.header-content h1 {
			font-size: 1.5rem;
		}

		.header-content p {
			font-size: 0.8rem;
		}

		.symbol-selector {
			padding: 0.75rem;
		}

		.symbol-selector h3 {
			font-size: 0.875rem;
		}

		.symbol-list {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.symbol-btn {
			padding: 0.75rem 0.5rem;
		}

		.symbol-short {
			font-size: 0.8rem;
		}

		.symbol-name {
			font-size: 0.65rem;
		}
	}
</style>
