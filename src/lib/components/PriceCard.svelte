<script lang="ts">
	interface Props {
		name: string;
		symbol: string;
		price: number;
		changePercent: number;
		currency?: string;
	}

	let { name, symbol, price, changePercent, currency = 'USD' }: Props = $props();

	const isPositive = $derived(changePercent >= 0);
	const formattedPrice = $derived(
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price)
	);
</script>

<div class="price-card">
	<div class="card-header">
		<div class="symbol-container">
			<div class="symbol-icon">{symbol.charAt(0)}</div>
			<div class="symbol-info">
				<h3>{name}</h3>
				<span class="symbol">{symbol}</span>
			</div>
		</div>
		<div class="status-indicator" class:positive={isPositive} class:negative={!isPositive}>
			<div class="status-dot"></div>
		</div>
	</div>
	<div class="card-body">
		<div class="price-container">
			<div class="price">{formattedPrice}</div>
			<div class="change" class:positive={isPositive} class:negative={!isPositive}>
				<span class="change-icon">{isPositive ? '▲' : '▼'}</span>
				<span class="change-text">{Math.abs(changePercent).toFixed(2)}%</span>
			</div>
		</div>
		<div class="trend-line" class:positive={isPositive} class:negative={!isPositive}></div>
	</div>
</div>

<style>
	.price-card {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.price-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.price-card:hover::before {
		opacity: 1;
	}

	.price-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.symbol-container {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.symbol-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: linear-gradient(135deg, #60a5fa, #a78bfa);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.125rem;
		color: white;
		box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
	}

	.symbol-info {
		display: flex;
		flex-direction: column;
	}

	h3 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: white;
		line-height: 1.2;
	}

	.symbol {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 500;
		margin-top: 0.25rem;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		transition: all 0.3s ease;
	}

	.status-indicator.positive .status-dot {
		background: #10b981;
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
	}

	.status-indicator.negative .status-dot {
		background: #ef4444;
		box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.price-container {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}

	.price {
		font-size: 1.75rem;
		font-weight: 700;
		color: white;
		line-height: 1;
	}

	.change {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.75rem;
		border-radius: 8px;
		font-weight: 600;
		backdrop-filter: blur(10px);
	}

	.change.positive {
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		color: #10b981;
	}

	.change.negative {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.change-icon {
		font-size: 0.875rem;
	}

	.change-text {
		font-size: 0.875rem;
	}

	.trend-line {
		height: 2px;
		border-radius: 1px;
		background: linear-gradient(90deg, transparent, currentColor, transparent);
		opacity: 0.6;
	}

	.trend-line.positive {
		color: #10b981;
	}

	.trend-line.negative {
		color: #ef4444;
	}

	@media (max-width: 480px) {
		.price-card {
			padding: 1.25rem;
		}

		.symbol-container {
			gap: 0.75rem;
		}

		.symbol-icon {
			width: 36px;
			height: 36px;
			font-size: 1rem;
		}

		.price {
			font-size: 1.5rem;
		}
	}
</style>
