<script lang="ts">
	import type { MarketInsight } from '$lib/types';

	interface Props {
		insights: MarketInsight[];
	}

	let { insights }: Props = $props();

	// 아이콘 매핑
	function getIcon(type: MarketInsight['type']): string {
		switch (type) {
			case 'correlation':
				return '🔗';
			case 'trend':
				return '📈';
			case 'volatility':
				return '⚡';
			default:
				return '💡';
		}
	}

	// 심각도 색상
	function getSeverityColor(severity: MarketInsight['severity']): string {
		switch (severity) {
			case 'high':
				return 'rgba(239, 68, 68, 0.2)'; // 빨강
			case 'medium':
				return 'rgba(251, 191, 36, 0.2)'; // 노랑
			case 'low':
				return 'rgba(59, 130, 246, 0.2)'; // 파랑
			default:
				return 'rgba(156, 163, 175, 0.2)';
		}
	}

	function getSeverityBorder(severity: MarketInsight['severity']): string {
		switch (severity) {
			case 'high':
				return 'rgba(239, 68, 68, 0.5)';
			case 'medium':
				return 'rgba(251, 191, 36, 0.5)';
			case 'low':
				return 'rgba(59, 130, 246, 0.5)';
			default:
				return 'rgba(156, 163, 175, 0.5)';
		}
	}
</script>

<div class="insights-container">
	<div class="insights-header">
		<h3>💡 시장 인사이트</h3>
		<p class="description">데이터에서 발견된 주요 관계성과 패턴</p>
	</div>

	{#if insights.length === 0}
		<div class="empty-state">
			<p>아직 발견된 인사이트가 없습니다.</p>
		</div>
	{:else}
		<div class="insights-grid">
			{#each insights as insight}
				<div
					class="insight-card"
					style="background: {getSeverityColor(insight.severity)}; border-color: {getSeverityBorder(
						insight.severity
					)}"
				>
					<div class="insight-header">
						<span class="insight-icon">{getIcon(insight.type)}</span>
						<span class="insight-title">{insight.title}</span>
					</div>
					<p class="insight-description">{insight.description}</p>
					{#if insight.relatedAssets.length > 0}
						<div class="related-assets">
							{#each insight.relatedAssets as asset}
								<span class="asset-tag">{asset}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.insights-container {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.insights-header {
		margin-bottom: 1.5rem;
	}

	.insights-header h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin-bottom: 0.5rem;
	}

	.description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.insights-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.insight-card {
		padding: 1.25rem;
		border-radius: 12px;
		border: 1px solid;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.insight-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.insight-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.insight-icon {
		font-size: 1.5rem;
	}

	.insight-title {
		font-size: 1rem;
		font-weight: 600;
		color: white;
	}

	.insight-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
		margin-bottom: 0.75rem;
	}

	.related-assets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.asset-tag {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem 0;
	}

	.empty-state p {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}

	@media (max-width: 768px) {
		.insights-container {
			padding: 1rem;
		}

		.insights-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
