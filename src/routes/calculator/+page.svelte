<script lang="ts">
	let ticker = $state('NVDL');
	let buyPrice = $state(100);
	let quantity = $state(50);
	let rate = $state<number | undefined>(8);
	let profit = $state<number | undefined>(undefined);
	let lastModified = $state<'rate' | 'profit'>('rate');

	// 사용된 상승률 계산 (수익금 입력 시 역계산)
	const usedRate = $derived(() => {
		if (lastModified === 'profit' && profit && profit > 0) {
			const q1 = Math.round(quantity * 0.5);
			if (q1 > 0 && buyPrice > 0) {
				return (profit / (q1 * buyPrice)) * 100;
			}
		}
		return rate || 0;
	});

	// 기본 상승 단위 (Δ)
	const delta = $derived(buyPrice * (usedRate() / 100));

	// 수량 분할
	const q1 = $derived(Math.round(quantity * 0.5));
	const q2 = $derived(Math.round(quantity * 0.25));
	const q3 = $derived(Math.round(quantity * 0.125));
	const q4 = $derived(quantity - q1 - q2 - q3);

	// 가격 계산
	const p0 = $derived(buyPrice);
	const p1 = $derived(buyPrice + delta * 1);
	const p2 = $derived(buyPrice + delta * 3);
	const p3 = $derived(buyPrice + delta * 7);
	const p4 = $derived(buyPrice + delta * 10.5);

	// 테이블 데이터
	const rows = $derived(() => {
		if (buyPrice <= 0 || quantity <= 0 || usedRate() <= 0) {
			return [];
		}

		return [
			{
				type: '매수',
				qty: quantity,
				price: p0,
				amount: quantity * p0,
				profit: null,
				profitRate: null,
				multiplier: null,
				class: 'buy-row'
			},
			{
				type: '1차매도',
				qty: q1,
				price: p1,
				amount: q1 * p1,
				profit: q1 * (p1 - p0),
				profitRate: ((p1 - p0) / p0) * 100,
				multiplier: '1Δ',
				class: 'sell-row'
			},
			{
				type: '2차매도',
				qty: q2,
				price: p2,
				amount: q2 * p2,
				profit: q2 * (p2 - p0),
				profitRate: ((p2 - p0) / p0) * 100,
				multiplier: '3Δ',
				class: 'sell-row'
			},
			{
				type: '3차매도',
				qty: q3,
				price: p3,
				amount: q3 * p3,
				profit: q3 * (p3 - p0),
				profitRate: ((p3 - p0) / p0) * 100,
				multiplier: '7Δ',
				class: 'sell-row'
			},
			{
				type: '4차매도',
				qty: q4,
				price: p4,
				amount: q4 * p4,
				profit: q4 * (p4 - p0),
				profitRate: ((p4 - p0) / p0) * 100,
				multiplier: '10.5Δ',
				class: 'sell-row'
			}
		];
	});

	// 요약 데이터
	const totalInvest = $derived(rows().length > 0 ? rows()[0].amount : 0);
	const totalReturn = $derived(
		rows().length > 0
			? rows()
					.slice(1)
					.reduce((sum, row) => sum + row.amount, 0)
			: 0
	);
	const netProfit = $derived(totalReturn - totalInvest);
	const totalProfitRate = $derived(totalInvest > 0 ? (netProfit / totalInvest) * 100 : 0);

	function handleRateInput() {
		lastModified = 'rate';
		profit = undefined;
	}

	function handleProfitInput() {
		lastModified = 'profit';
		rate = undefined;
	}

	function getRowBgClass(rowClass: string) {
		if (rowClass === 'buy-row') return 'bg-orange-500/10';
		if (rowClass === 'sell-row') return 'bg-emerald-500/10';
		return '';
	}
</script>

<svelte:head>
	<title>BullGaze - 분할 익절 계산기</title>
</svelte:head>

<div class="min-h-screen bg-black pb-24">
	<!-- 배경 그라디언트 -->
	<div class="pointer-events-none fixed inset-0">
		<div
			class="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,0),rgba(0,0,0,1))]"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.1),transparent_50%)]"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.1),transparent_50%)]"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(236,72,153,0.05),transparent_50%)]"
		></div>
	</div>

	<div class="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<!-- 헤더 -->
		<div class="mb-8 text-center">
			<h1
				class="mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl"
			>
				분할 익절 계산기
			</h1>
			<p class="text-base text-gray-300">
				매수가, 수량, 초기 상승률을 입력하면 자동으로 4단계 분할 익절 계획을 생성합니다
			</p>
		</div>

		<div class="grid gap-8 lg:grid-cols-12">
			<!-- 입력 섹션 -->
			<div class="lg:col-span-4">
				<div class="space-y-6">
					<!-- 입력 카드 -->
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
						<h2 class="mb-6 text-xl font-bold text-white">📝 입력 정보</h2>

						<div class="space-y-5">
							<div>
								<label for="ticker" class="mb-2 block text-sm font-medium text-gray-300">
									종목명
								</label>
								<input
									id="ticker"
									type="text"
									bind:value={ticker}
									placeholder="NVDL"
									class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
								/>
							</div>

							<div>
								<label for="buyPrice" class="mb-2 block text-sm font-medium text-gray-300">
									매수가 ($)
								</label>
								<input
									id="buyPrice"
									type="number"
									bind:value={buyPrice}
									placeholder="100.00"
									step="0.01"
									class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
								/>
							</div>

							<div>
								<label for="quantity" class="mb-2 block text-sm font-medium text-gray-300">
									매수 수량
								</label>
								<input
									id="quantity"
									type="number"
									bind:value={quantity}
									placeholder="50"
									step="1"
									class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
								/>
							</div>

							<div>
								<label for="rate" class="mb-2 block text-sm font-medium text-gray-300">
									초기 상승률 (%)
									<span
										class="ml-2 inline-flex items-center rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400 ring-1 ring-blue-500/30 ring-inset"
									>
										권장: 4~9%
									</span>
								</label>
								<input
									id="rate"
									type="number"
									bind:value={rate}
									oninput={handleRateInput}
									placeholder="8.00"
									step="0.01"
									class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
								/>
							</div>

							<div class="relative">
								<div class="absolute inset-0 flex items-center">
									<div class="w-full border-t border-white/10"></div>
								</div>
								<div class="relative flex justify-center text-xs">
									<span class="bg-black px-2 text-gray-500">또는</span>
								</div>
							</div>

							<div>
								<label for="profit" class="mb-2 block text-sm font-medium text-gray-300">
									초기 수익금 ($)
								</label>
								<input
									id="profit"
									type="number"
									bind:value={profit}
									oninput={handleProfitInput}
									placeholder="202.86"
									step="0.01"
									class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
								/>
								<p class="mt-2 text-xs text-gray-500">
									1차 매도에서 원하는 수익금을 입력하면 상승률이 자동 계산됩니다
								</p>
							</div>
						</div>

						<!-- 계산 정보 -->
						<div
							class="mt-6 space-y-3 rounded-xl bg-blue-500/10 p-4 ring-1 ring-blue-500/20 ring-inset"
						>
							<div class="flex justify-between text-sm">
								<span class="font-medium text-gray-300">사용된 초기 상승률</span>
								<span class="font-mono font-bold text-blue-400">{usedRate().toFixed(2)}%</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="font-medium text-gray-300">Δ (기본 상승 단위)</span>
								<span class="font-mono font-bold text-blue-400">${delta.toFixed(2)}</span>
							</div>
						</div>
					</div>

					<!-- 요약 카드 -->
					<div
						class="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-xl"
					>
						<h3 class="mb-6 text-lg font-bold text-white">💰 수익 요약</h3>
						<div class="space-y-4">
							<div class="flex justify-between text-sm">
								<span class="text-gray-400">총 투자금</span>
								<span class="font-mono font-bold text-white">${totalInvest.toFixed(2)}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-400">총 회수금</span>
								<span class="font-mono font-bold text-blue-400">${totalReturn.toFixed(2)}</span>
							</div>
							<div class="border-t border-white/10 pt-4">
								<div class="flex justify-between">
									<span class="font-medium text-white">순수익</span>
									<div class="text-right">
										<div
											class="font-mono text-xl font-bold {netProfit >= 0
												? 'text-emerald-400'
												: 'text-red-400'}"
										>
											${netProfit.toFixed(2)}
										</div>
										<div
											class="font-mono text-sm {netProfit >= 0
												? 'text-emerald-400'
												: 'text-red-400'}"
										>
											({totalProfitRate.toFixed(2)}%)
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- 테이블 섹션 -->
			<div class="lg:col-span-8">
				<div class="space-y-6">
					<!-- 테이블 카드 -->
					<div
						class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
					>
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="border-b border-white/10 bg-white/5">
									<tr>
										<th class="px-4 py-4 text-left text-sm font-semibold text-gray-300">종목</th>
										<th class="px-4 py-4 text-left text-sm font-semibold text-gray-300">매매</th>
										<th class="px-4 py-4 text-center text-sm font-semibold text-gray-300">수량</th>
										<th class="px-4 py-4 text-right text-sm font-semibold text-gray-300">단가</th>
										<th class="px-4 py-4 text-right text-sm font-semibold text-gray-300">금액</th>
										<th class="px-4 py-4 text-right text-sm font-semibold text-gray-300">수익금</th>
										<th class="px-4 py-4 text-right text-sm font-semibold text-gray-300">수익률</th>
									</tr>
								</thead>
								<tbody>
									{#if rows().length === 0}
										<tr>
											<td colspan="7" class="py-16 text-center text-gray-500">
												입력란을 채워주세요
											</td>
										</tr>
									{:else}
										{#each rows() as row}
											<tr
												class="border-b border-white/5 transition-colors hover:bg-white/5 {getRowBgClass(
													row.class
												)}"
											>
												<td class="px-4 py-4">
													<span
														class="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs font-medium text-white"
													>
														{ticker}
													</span>
												</td>
												<td class="px-4 py-4">
													<div class="flex items-center gap-2">
														<span class="font-semibold text-white">{row.type}</span>
														{#if row.multiplier}
															<span
																class="inline-flex items-center rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-300 ring-1 ring-blue-500/30 ring-inset"
															>
																{row.multiplier}
															</span>
														{/if}
													</div>
												</td>
												<td class="px-4 py-4 text-center font-mono text-sm text-white">
													{row.qty}
												</td>
												<td class="px-4 py-4 text-right font-mono text-sm text-white">
													${row.price.toFixed(2)}
												</td>
												<td class="px-4 py-4 text-right font-mono text-sm text-white">
													${row.amount.toFixed(2)}
												</td>
												<td class="px-4 py-4 text-right">
													{#if row.profit !== null}
														<span class="font-mono text-sm font-bold text-emerald-400">
															${row.profit.toFixed(2)}
														</span>
													{:else}
														<span class="text-gray-600">-</span>
													{/if}
												</td>
												<td class="px-4 py-4 text-right">
													{#if row.profitRate !== null}
														<span class="font-mono text-sm text-emerald-400">
															{row.profitRate.toFixed(2)}%
														</span>
													{:else}
														<span class="text-gray-600">-</span>
													{/if}
												</td>
											</tr>
										{/each}

										<!-- 합계 행 -->
										<tr class="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 font-bold">
											<td colspan="2" class="px-4 py-4 text-center text-white">【합계】</td>
											<td class="px-4 py-4 text-center font-mono text-white">{quantity}</td>
											<td class="px-4 py-4 text-right text-gray-600">-</td>
											<td class="px-4 py-4 text-right font-mono text-white">
												${totalReturn.toFixed(2)}
											</td>
											<td class="px-4 py-4 text-right">
												<span
													class="font-mono text-lg {netProfit >= 0
														? 'text-emerald-400'
														: 'text-red-400'}"
												>
													${netProfit.toFixed(2)}
												</span>
											</td>
											<td class="px-4 py-4 text-right">
												<span
													class="font-mono text-lg {netProfit >= 0
														? 'text-emerald-400'
														: 'text-red-400'}"
												>
													{totalProfitRate.toFixed(2)}%
												</span>
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					</div>

					<!-- 설명 카드 -->
					<div
						class="rounded-2xl border-l-4 border-blue-500 bg-blue-500/10 p-6 ring-1 ring-blue-500/20 ring-inset"
					>
						<h3 class="mb-4 text-lg font-bold text-white">💡 분할 익절 전략</h3>
						<div class="space-y-3 text-sm text-gray-300">
							<p>
								• <strong class="text-white">50% (1Δ)</strong>: 초기 목표가 달성 시 절반 익절로 원금
								회수
							</p>
							<p>• <strong class="text-white">25% (3Δ)</strong>: 추가 상승 시 1/4 익절</p>
							<p>• <strong class="text-white">12.5% (7Δ)</strong>: 큰 상승 시 일부 익절</p>
							<p>
								• <strong class="text-white">나머지 (10.5Δ)</strong>: 최대 상승을 노리며 장기 보유
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
