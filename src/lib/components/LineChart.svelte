<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Title,
		Tooltip,
		Legend,
		Filler
	} from 'chart.js';

	// Chart.js 컴포넌트 등록
	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Title,
		Tooltip,
		Legend,
		Filler
	);

	interface Props {
		labels: string[];
		datasets: {
			label: string;
			data: number[];
			borderColor?: string;
			backgroundColor?: string;
			fill?: boolean;
		}[];
		title?: string;
		currentPrice?: number;
		currency?: string;
		symbol?: string;
	}

	let {
		labels,
		datasets,
		title = 'Chart',
		currentPrice,
		currency = 'USD',
		symbol
	}: Props = $props();

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

	// 실제 사용할 통화 단위 결정
	const actualCurrency = $derived.by(() => {
		if (symbol && symbolToCurrency.has(symbol)) {
			return symbolToCurrency.get(symbol)!;
		}
		return currency;
	});

	// 현재가 포맷팅
	const formattedCurrentPrice = $derived.by(() => {
		if (currentPrice === undefined) return '';

		const curr = actualCurrency;
		if (curr === 'KRW') {
			return `₩${currentPrice.toLocaleString('ko-KR')}`;
		} else {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: curr,
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(currentPrice);
		}
	});

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels,
				datasets: datasets.map((ds) => ({
					...ds,
					borderColor: ds.borderColor || 'rgb(96, 165, 250)',
					backgroundColor: ds.backgroundColor || 'rgba(96, 165, 250, 0.1)',
					tension: 0.4,
					borderWidth: 2,
					pointRadius: 0,
					pointHoverRadius: 6,
					pointHoverBackgroundColor: ds.borderColor || 'rgb(96, 165, 250)',
					pointHoverBorderColor: '#ffffff',
					pointHoverBorderWidth: 2,
					fill: true
				}))
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					intersect: false,
					mode: 'index'
				},
				plugins: {
					legend: {
						position: 'top',
						labels: {
							color: 'rgba(255, 255, 255, 0.8)',
							font: {
								size: 12,
								weight: 'normal'
							},
							padding: 20,
							usePointStyle: true,
							pointStyle: 'circle'
						}
					},
					title: {
						display: false
					},
					tooltip: {
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						titleColor: 'white',
						bodyColor: 'white',
						borderColor: 'rgba(255, 255, 255, 0.2)',
						borderWidth: 1,
						cornerRadius: 8,
						displayColors: true,
						padding: 12,
						callbacks: {
							title: function (context) {
								return context[0].label;
							},
							label: function (context) {
								const label = context.dataset.label || '';
								const value = context.parsed.y;
								const curr = actualCurrency;

								let formattedValue;
								if (curr === 'KRW') {
									formattedValue = `₩${value.toLocaleString('ko-KR')}`;
								} else {
									formattedValue = new Intl.NumberFormat('en-US', {
										style: 'currency',
										currency: curr,
										minimumFractionDigits: 2,
										maximumFractionDigits: 2
									}).format(value);
								}
								return `${label}: ${formattedValue}`;
							}
						}
					}
				},
				scales: {
					x: {
						grid: {
							color: 'rgba(255, 255, 255, 0.1)'
						},
						ticks: {
							color: 'rgba(255, 255, 255, 0.6)',
							font: {
								size: 11
							}
						}
					},
					y: {
						beginAtZero: false,
						grid: {
							color: 'rgba(255, 255, 255, 0.1)'
						},
						ticks: {
							color: 'rgba(255, 255, 255, 0.6)',
							font: {
								size: 11
							},
							callback: function (value) {
								if (typeof value === 'number') {
									const curr = actualCurrency;
									if (curr === 'KRW') {
										return `₩${value.toLocaleString('ko-KR')}`;
									} else {
										return new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: curr,
											minimumFractionDigits: 0,
											maximumFractionDigits: 0
										}).format(value);
									}
								}
								return value;
							}
						}
					}
				}
			}
		});
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});

	// 데이터가 변경되면 차트 업데이트
	$effect(() => {
		if (chart) {
			chart.data.labels = labels;
			chart.data.datasets = datasets.map((ds) => ({
				...ds,
				borderColor: ds.borderColor || 'rgb(96, 165, 250)',
				backgroundColor: ds.backgroundColor || 'rgba(96, 165, 250, 0.1)',
				tension: 0.4,
				borderWidth: 2,
				pointRadius: 0,
				pointHoverRadius: 6,
				pointHoverBackgroundColor: ds.borderColor || 'rgb(96, 165, 250)',
				pointHoverBorderColor: '#ffffff',
				pointHoverBorderWidth: 2,
				fill: true
			}));
			chart.update();
		}
	});
</script>

<div class="chart-wrapper">
	{#if title}
		<div class="chart-header">
			<h3 class="chart-title">{title}</h3>
			{#if formattedCurrentPrice}
				<div class="current-price">{formattedCurrentPrice}</div>
			{/if}
		</div>
	{/if}
	<div class="chart-container">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>

<style>
	.chart-wrapper {
		width: 100%;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding: 0 0.5rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.chart-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: white;
		margin: 0;
		line-height: 1.2;
	}

	.current-price {
		font-size: 1.5rem;
		font-weight: 700;
		color: #60a5fa;
		text-shadow: 0 0 10px rgba(96, 165, 250, 0.5);
		white-space: nowrap;
	}

	.chart-container {
		position: relative;
		height: 400px;
		width: 100%;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 12px;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-sizing: border-box;
		overflow: hidden;
	}

	.chart-container::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(circle at 50% 50%, rgba(96, 165, 250, 0.05) 0%, transparent 70%);
		pointer-events: none;
		border-radius: 12px;
	}

	@media (max-width: 768px) {
		.chart-header {
			padding: 0 0.25rem;
		}

		.chart-title {
			font-size: 1.1rem;
		}

		.current-price {
			font-size: 1.3rem;
		}

		.chart-container {
			height: 300px;
			padding: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.chart-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.chart-title {
			font-size: 1rem;
		}

		.current-price {
			font-size: 1.2rem;
		}

		.chart-container {
			height: 250px;
			padding: 0.5rem;
		}
	}
</style>
