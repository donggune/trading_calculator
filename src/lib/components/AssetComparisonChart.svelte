<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';
	import type { AssetComparison } from '$lib/types';

	interface Props {
		assets: AssetComparison[];
		normalized?: boolean;
		title?: string;
	}

	let { assets, normalized = false, title = '자산 비교 차트' }: Props = $props();

	let canvasRef = $state<HTMLCanvasElement | null>(null);
	let chartInstance: Chart | null = null;

	// 고정 팔레트 (요청: 파랑, 핑크, 초록, 주황만 사용)
	const fixedPalette = [
		'rgb(59, 130, 246)', // 파랑
		'rgb(236, 72, 153)', // 핑크
		'rgb(16, 185, 129)', // 초록
		'rgb(245, 158, 11)' // 주황
	];

	// 세션 동안 유지되는 색상 매핑(심볼 -> 색상)
	const symbolToColor = new Map<string, string>();

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

	// 다음으로 할당할 팔레트 인덱스 계산 (가장 낮은 미사용 인덱스)
	function getNextPaletteIndex(): number {
		const used = new Set<number>();
		for (const color of symbolToColor.values()) {
			const idx = fixedPalette.indexOf(color);
			if (idx >= 0) used.add(idx);
		}
		for (let i = 0; i < fixedPalette.length; i++) {
			if (!used.has(i)) return i;
		}
		return 0;
	}

	function resetColorState() {
		symbolToColor.clear();
	}

	function assignColorIfNeeded(symbol: string) {
		if (symbolToColor.has(symbol)) return;
		const color = fixedPalette[getNextPaletteIndex() % fixedPalette.length];
		symbolToColor.set(symbol, color);
	}

	// 심볼에 맞는 통화 단위 가져오기
	function getCurrencyForSymbol(symbol: string): string {
		return symbolToCurrency.get(symbol) || 'USD';
	}

	// 통화 단위에 맞는 포맷팅
	function formatCurrency(value: number, currency: string): string {
		if (currency === 'KRW') {
			return `₩${value.toLocaleString('ko-KR')}`;
		} else {
			return `$${value.toFixed(2)}`;
		}
	}

	// 현재 화면에 보이는 자산들에 대한 일관된 색상 매핑 생성
	function buildColorMap(symbols: string[]): Map<string, string> {
		const current = new Set(symbols);
		// 1) 보이지 않는 심볼 제거하여 색상 반환
		for (const key of Array.from(symbolToColor.keys())) {
			if (!current.has(key)) symbolToColor.delete(key);
		}
		// 2) 새 심볼에만 순서대로 색상 부여
		for (const s of symbols) assignColorIfNeeded(s);
		// 3) 매핑 반환 (현재 표시 순서 유지)
		const map = new Map<string, string>();
		for (const s of symbols) map.set(s, symbolToColor.get(s)!);
		return map;
	}

	function createChart() {
		if (!canvasRef || assets.length === 0) return;

		// 기존 차트 파괴 (안전하게 캔버스에 붙은 차트도 제거)
		try {
			const existing = (Chart as any).getChart ? (Chart as any).getChart(canvasRef) : null;
			if (existing) existing.destroy();
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		} catch {
			// ignore
		}

		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;

		// 데이터셋 생성 (Chart.js와의 충돌 방지를 위해 깊은 복사 사용)
		const colorMap = buildColorMap(assets.map((a) => a.symbol));
		const datasets = assets.map((asset) => {
			const source = normalized ? asset.normalizedData || asset.data : asset.data;
			const data = source ? [...source] : [];
			const color = colorMap.get(asset.symbol) || fixedPalette[0];

			return {
				label: asset.name, // 심볼 중복 표기 제거
				data: data,
				borderColor: color,
				backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.15)'),
				fill: false,
				tension: 0.1,
				pointRadius: 2,
				pointHoverRadius: 5
			};
		});

		chartInstance = new Chart(ctx, {
			type: 'line',
			data: {
				labels: assets[0]?.dates ? [...assets[0].dates] : [],
				datasets: JSON.parse(JSON.stringify(datasets))
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: {
						display: true,
						position: 'top',
						labels: {
							color: 'rgba(255, 255, 255, 0.8)',
							font: {
								size: 12
							},
							padding: 15,
							usePointStyle: true
						}
					},
					tooltip: {
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						titleColor: 'white',
						bodyColor: 'white',
						borderColor: 'rgba(255, 255, 255, 0.2)',
						borderWidth: 1,
						padding: 12,
						displayColors: true,
						callbacks: {
							label: (context) => {
								const label = context.dataset.label || '';
								const value = context.parsed.y;
								if (normalized) {
									return `${label}: ${value.toFixed(2)}`;
								} else {
									// 데이터셋에서 심볼 찾기
									const dataset = context.dataset;
									const symbol = assets.find((a) => a.name === dataset.label)?.symbol || '';
									const currency = getCurrencyForSymbol(symbol);
									return `${label}: ${formatCurrency(value, currency)}`;
								}
							}
						}
					}
				},
				scales: {
					x: {
						ticks: {
							color: 'rgba(255, 255, 255, 0.6)',
							maxRotation: 45,
							minRotation: 45
						},
						grid: {
							color: 'rgba(255, 255, 255, 0.05)'
						}
					},
					y: {
						ticks: {
							color: 'rgba(255, 255, 255, 0.6)',
							callback: (value) => {
								if (normalized) {
									return value;
								} else {
									// 첫 번째 자산의 통화 단위 사용 (대부분의 경우 같은 통화)
									const firstAsset = assets[0];
									if (firstAsset) {
										const currency = getCurrencyForSymbol(firstAsset.symbol);
										if (currency === 'KRW') {
											return `₩${value.toLocaleString('ko-KR')}`;
										} else {
											return `$${value}`;
										}
									}
									return `$${value}`;
								}
							}
						},
						grid: {
							color: 'rgba(255, 255, 255, 0.05)'
						}
					}
				}
			}
		});
	}

	onMount(() => {
		// 초기 렌더 시 색상 상태 초기화 (다른 페이지 전환 후 잔존 상태 방지)
		resetColorState();
		createChart();

		return () => {
			if (chartInstance) {
				chartInstance.destroy();
			}
		};
	});

	// 데이터 변경 시 차트 업데이트 (내용 변화까지 감지)
	$effect(() => {
		const signature = JSON.stringify({
			assets: assets.map((a) => ({ symbol: a.symbol, n: a.data.length, d: a.dates.length })),
			normalized
		});
		void signature; // 의존성 추적용
		if (assets.length > 0 && canvasRef) {
			createChart();
		}
	});
</script>

<div class="comparison-container">
	<div class="comparison-header">
		<h3>{title}</h3>
		{#if normalized}
			<p class="description">각 자산을 시작 시점 대비 변화율로 정규화했습니다 (시작점 = 100)</p>
		{:else}
			<p class="description">각 자산의 실제 가격을 표시합니다</p>
		{/if}
	</div>

	<div class="chart-wrapper">
		{#if assets.length === 0}
			<div class="empty-state">
				<p>비교할 자산을 선택해주세요</p>
			</div>
		{:else}
			<canvas bind:this={canvasRef}></canvas>
		{/if}
	</div>
</div>

<style>
	.comparison-container {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.comparison-header {
		margin-bottom: 1.5rem;
	}

	.comparison-header h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin-bottom: 0.5rem;
	}

	.description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.chart-wrapper {
		position: relative;
		height: 400px;
		width: 100%;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.empty-state p {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}

	@media (max-width: 768px) {
		.comparison-container {
			padding: 1rem;
		}

		.chart-wrapper {
			height: 300px;
		}
	}
</style>
