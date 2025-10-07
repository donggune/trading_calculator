<script lang="ts">
	interface Props {
		name: string;
		symbol: string;
		price: number;
		currency?: string;
		change24h?: number;
		changePercent?: number;
	}

	let { name, symbol, price, currency = 'USD', change24h, changePercent }: Props = $props();

	const formattedPrice = $derived(
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price)
	);

	// 자산별 아이콘 스타일 설정 (심플한 단색)
	const getIconStyle = (symbol: string) => {
		const symbolUpper = symbol.toUpperCase();

		// 주식 지수 - 회색 계열
		if (symbolUpper.includes('SPX') || symbolUpper.includes('S&P')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}
		if (symbolUpper.includes('NDX') || symbolUpper.includes('NASDAQ')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}
		if (symbolUpper.includes('N225') || symbolUpper.includes('NIKKEI')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}
		if (symbolUpper.includes('RUT') || symbolUpper.includes('RUSSELL')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}

		// 채권 - 회색 계열
		if (symbolUpper.includes('TNX') || symbolUpper.includes('TREASURY')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}

		// 원자재 - 회색 계열
		if (symbolUpper.includes('XAU') || symbolUpper.includes('GOLD')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}
		if (symbolUpper.includes('WTI') || symbolUpper.includes('OIL')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}

		// 환율 - 회색 계열
		if (symbolUpper.includes('DXY') || symbolUpper.includes('DOLLAR')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}
		if (symbolUpper.includes('USDKRW') || symbolUpper.includes('KRW')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}
		if (symbolUpper.includes('USDJPY') || symbolUpper.includes('JPY')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}
		if (symbolUpper.includes('USDEUR') || symbolUpper.includes('EUR')) {
			return {
				gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
				shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
			};
		}

		// 기본값 - 회색 계열
		return {
			gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
			shadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
		};
	};

	const iconStyle = $derived(getIconStyle(symbol));
</script>

<div class="price-card">
	<div class="card-header">
		<div class="symbol-container">
			<div
				class="symbol-icon"
				style="--icon-gradient: {iconStyle.gradient}; --icon-shadow: {iconStyle.shadow};"
			>
				{symbol.charAt(0)}
			</div>
			<div class="symbol-info">
				<h3>{name}</h3>
				<span class="symbol">{symbol}</span>
			</div>
		</div>
	</div>
	<div class="card-body">
		<div class="price-container">
			<div class="price">{formattedPrice}</div>
			{#if change24h !== undefined && changePercent !== undefined}
				<div class="price-change" class:positive={change24h >= 0} class:negative={change24h < 0}>
					<span class="change-amount">
						{change24h >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: currency,
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						}).format(change24h)}
					</span>
					<span class="change-percent">
						({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
					</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.price-card {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
		height: 160px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 100%;
		box-sizing: border-box;
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
		margin-bottom: 1rem;
	}

	.symbol-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.symbol-icon {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: var(--icon-gradient);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1rem;
		color: white;
		box-shadow: var(--icon-shadow);
		flex-shrink: 0;
	}

	.symbol-info {
		display: flex;
		flex-direction: column;
	}

	h3 {
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0;
		color: white;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.symbol {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 500;
		margin-top: 0.2rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex: 1;
		justify-content: center;
	}

	.price-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.price {
		font-size: 1.75rem;
		font-weight: 700;
		color: white;
		line-height: 1.1;
		margin-bottom: 0.25rem;
		word-break: break-all;
	}

	.price-change {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		flex-wrap: wrap;
	}

	.price-change.positive {
		color: #10b981;
	}

	.price-change.negative {
		color: #ef4444;
	}

	.change-amount {
		font-size: 0.8rem;
	}

	.change-percent {
		font-size: 0.7rem;
		opacity: 0.9;
	}

	@media (max-width: 480px) {
		.price-card {
			padding: 1rem;
			height: 140px;
		}

		.symbol-container {
			gap: 0.5rem;
		}

		.symbol-icon {
			width: 32px;
			height: 32px;
			font-size: 0.9rem;
			background: var(--icon-gradient);
			box-shadow: var(--icon-shadow);
		}

		h3 {
			font-size: 0.85rem;
		}

		.symbol {
			font-size: 0.7rem;
		}

		.price {
			font-size: 1.5rem;
		}

		.price-change {
			font-size: 0.75rem;
		}

		.change-amount {
			font-size: 0.75rem;
		}

		.change-percent {
			font-size: 0.65rem;
		}
	}
</style>
