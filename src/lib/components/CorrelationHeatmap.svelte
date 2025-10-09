<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';
	import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
	import { correlationToColor } from '$lib/utils/correlation';
	import type { CorrelationMatrix } from '$lib/types';

	Chart.register(MatrixController, MatrixElement);

	interface Props {
		data: CorrelationMatrix;
		onCellClick?: (asset1: string, asset2: string) => void;
	}

	let { data, onCellClick }: Props = $props();

	let canvasRef: HTMLCanvasElement;
	let chartInstance: Chart<'matrix'> | null = null;

	// 차트 데이터 생성
	const chartData = $derived(() => {
		const { symbols, matrix } = data;
		const dataPoints: {
			x: string;
			y: string;
			v: number;
		}[] = [];

		for (let i = 0; i < symbols.length; i++) {
			for (let j = 0; j < symbols.length; j++) {
				dataPoints.push({
					x: symbols[j],
					y: symbols[i],
					v: matrix[i][j]
				});
			}
		}

		return dataPoints;
	});

	function createChart() {
		if (!canvasRef) return;

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

		chartInstance = new Chart(ctx, {
			type: 'matrix',
			data: {
				datasets: [
					{
						label: '상관계수',
						data: JSON.parse(JSON.stringify(chartData())) as any,
						backgroundColor(context) {
							const value = context.dataset.data[context.dataIndex];
							return correlationToColor((value as any).v);
						},
						borderColor: 'rgba(255, 255, 255, 0.1)',
						borderWidth: 1,
						width: ({ chart }) => (chart.chartArea || {}).width / data.symbols.length - 1,
						height: ({ chart }) => (chart.chartArea || {}).height / data.symbols.length - 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							title() {
								return '';
							},
							label(context) {
								const v = context.dataset.data[context.dataIndex] as any;
								return [
									`${v.y} vs ${v.x}`,
									`상관계수: ${v.v.toFixed(3)}`,
									v.v > 0.7 ? '🔥 강한 양의 상관' : v.v < -0.7 ? '❄️ 강한 음의 상관' : ''
								];
							}
						}
					}
				},
				scales: {
					x: {
						type: 'category',
						labels: data.symbols,
						offset: true,
						ticks: {
							color: 'rgba(255, 255, 255, 0.8)',
							font: {
								size: 11
							}
						},
						grid: {
							display: false
						}
					},
					y: {
						type: 'category',
						labels: data.symbols,
						offset: true,
						ticks: {
							color: 'rgba(255, 255, 255, 0.8)',
							font: {
								size: 11
							}
						},
						grid: {
							display: false
						}
					}
				},
				onClick: (event, elements) => {
					if (elements.length > 0 && onCellClick) {
						const index = elements[0].index;
						const dataPoint = chartData()[index];
						if (dataPoint.x !== dataPoint.y) {
							onCellClick(dataPoint.y, dataPoint.x);
						}
					}
				}
			}
		});
	}

	onMount(() => {
		createChart();

		return () => {
			if (chartInstance) {
				chartInstance.destroy();
			}
		};
	});

	// 데이터 변경 시 차트 업데이트
	$effect(() => {
		if (data && canvasRef) {
			createChart();
		}
	});
</script>

<div class="heatmap-container">
	<div class="heatmap-header">
		<h3>상관관계 히트맵</h3>
		<p class="description">자산 간 상관계수를 시각화합니다 (빨강: 양의 상관, 파랑: 음의 상관)</p>
	</div>

	<div class="chart-wrapper">
		<canvas bind:this={canvasRef}></canvas>
	</div>

	<!-- 범례 -->
	<div class="legend">
		<div class="legend-item">
			<div class="legend-color" style="background: rgba(59, 130, 246, 0.8);"></div>
			<span>강한 음의 상관 (-1.0)</span>
		</div>
		<div class="legend-item">
			<div class="legend-color" style="background: rgba(156, 163, 175, 0.3);"></div>
			<span>무상관 (0.0)</span>
		</div>
		<div class="legend-item">
			<div class="legend-color" style="background: rgba(239, 68, 68, 0.8);"></div>
			<span>강한 양의 상관 (+1.0)</span>
		</div>
	</div>
</div>

<style>
	.heatmap-container {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.heatmap-header {
		margin-bottom: 1.5rem;
	}

	.heatmap-header h3 {
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
		height: 500px;
		width: 100%;
		margin-bottom: 1rem;
	}

	.legend {
		display: flex;
		justify-content: center;
		gap: 2rem;
		flex-wrap: wrap;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.legend-color {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.legend-item span {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
	}

	@media (max-width: 768px) {
		.heatmap-container {
			padding: 1rem;
		}

		.chart-wrapper {
			height: 400px;
		}

		.legend {
			gap: 1rem;
		}

		.legend-item span {
			font-size: 0.75rem;
		}
	}
</style>
