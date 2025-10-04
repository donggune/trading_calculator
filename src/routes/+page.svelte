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
				class: 'buy-row'
			},
			{
				type: '1차매도',
				qty: q1,
				price: p1,
				amount: q1 * p1,
				profit: q1 * (p1 - p0),
				profitRate: ((p1 - p0) / p0) * 100,
				class: 'sell-row'
			},
			{
				type: '2차매도',
				qty: q2,
				price: p2,
				amount: q2 * p2,
				profit: q2 * (p2 - p0),
				profitRate: ((p2 - p0) / p0) * 100,
				class: 'sell-row'
			},
			{
				type: '3차매도',
				qty: q3,
				price: p3,
				amount: q3 * p3,
				profit: q3 * (p3 - p0),
				profitRate: ((p3 - p0) / p0) * 100,
				class: 'sell-row'
			},
			{
				type: '4차매도',
				qty: q4,
				price: p4,
				amount: q4 * p4,
				profit: q4 * (p4 - p0),
				profitRate: ((p4 - p0) / p0) * 100,
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
</script>

<svelte:head>
	<title>분할 익절 계산기</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5">
	<div class="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-2xl md:p-12">
		<h1 class="mb-3 text-center text-4xl font-bold text-[#667eea] md:text-5xl">
			📊 분할 익절 계산기
		</h1>
		<p class="mb-10 text-center text-lg text-gray-600">
			매수가, 수량, 초기 상승률을 입력하면 자동으로 4단계 분할 익절 계획을 생성합니다
		</p>

		<!-- 입력 섹션 -->
		<div class="mb-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-8 shadow-sm">
			<div class="space-y-6">
				<div>
					<label for="ticker" class="mb-2 block text-lg font-semibold text-gray-700">
						종목명
					</label>
					<input
						type="text"
						id="ticker"
						bind:value={ticker}
						placeholder="예: NVDL, TSLL, TQQQ"
						class="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg transition-colors focus:border-[#667eea] focus:outline-none"
					/>
				</div>

				<div>
					<label for="buyPrice" class="mb-2 block text-lg font-semibold text-gray-700">
						매수가 ($)
					</label>
					<input
						type="number"
						id="buyPrice"
						bind:value={buyPrice}
						placeholder="예: 100"
						step="0.01"
						class="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg transition-colors focus:border-[#667eea] focus:outline-none"
					/>
				</div>

				<div>
					<label for="quantity" class="mb-2 block text-lg font-semibold text-gray-700">
						매수 수량
					</label>
					<input
						type="number"
						id="quantity"
						bind:value={quantity}
						placeholder="예: 50"
						step="1"
						class="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg transition-colors focus:border-[#667eea] focus:outline-none"
					/>
				</div>

				<div>
					<label for="rate" class="mb-2 block text-lg font-semibold text-gray-700">
						초기 상승률 (%)
					</label>
					<input
						type="number"
						id="rate"
						bind:value={rate}
						oninput={handleRateInput}
						placeholder="예: 8 (권장: 4~9%)"
						step="0.01"
						class="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg transition-colors focus:border-[#667eea] focus:outline-none"
					/>
					<p class="mt-2 text-sm text-gray-500">또는 아래 초기 수익금을 입력하세요</p>
				</div>

				<div>
					<label for="profit" class="mb-2 block text-lg font-semibold text-gray-700">
						또는 초기 수익금 ($)
					</label>
					<input
						type="number"
						id="profit"
						bind:value={profit}
						oninput={handleProfitInput}
						placeholder="예: 202.86"
						step="0.01"
						class="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg transition-colors focus:border-[#667eea] focus:outline-none"
					/>
					<p class="mt-2 text-sm text-gray-500">1차 매도에서 원하는 수익금 (선택사항)</p>
				</div>
			</div>
		</div>

		<!-- 계산 정보 -->
		<div class="mb-8 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-6">
			<div class="mb-3 flex justify-between text-lg">
				<span class="font-semibold text-gray-800">사용된 초기 상승률:</span>
				<span class="font-bold text-blue-600">{usedRate().toFixed(2)}%</span>
			</div>
			<div class="flex justify-between text-lg">
				<span class="font-semibold text-gray-800">Δ (기본 상승 단위):</span>
				<span class="font-bold text-blue-600">${delta.toFixed(2)}</span>
			</div>
		</div>

		<!-- 테이블 -->
		<div class="mb-8 overflow-x-auto rounded-xl shadow-lg">
			<table class="w-full border-collapse">
				<thead>
					<tr class="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white">
						<th class="px-4 py-4 text-center">종목</th>
						<th class="px-4 py-4 text-center">매매 구분</th>
						<th class="px-4 py-4 text-center">수량</th>
						<th class="px-4 py-4 text-center">단가(달러)</th>
						<th class="px-4 py-4 text-center">금액</th>
						<th class="px-4 py-4 text-center">수익금</th>
						<th class="px-4 py-4 text-center">수익률</th>
					</tr>
				</thead>
				<tbody>
					{#if rows().length === 0}
						<tr>
							<td colspan="7" class="py-8 text-center text-gray-400"> 위의 입력란을 채워주세요 </td>
						</tr>
					{:else}
						{#each rows() as row}
							<tr
								class="border-b border-gray-200 transition-colors hover:bg-blue-50 {row.class ===
								'buy-row'
									? 'bg-orange-50 font-semibold'
									: row.class === 'sell-row'
										? 'bg-green-50'
										: ''}"
							>
								<td class="px-4 py-4 text-center">{ticker}</td>
								<td class="px-4 py-4 text-center font-bold">{row.type}</td>
								<td class="px-4 py-4 text-center">{row.qty}</td>
								<td class="px-4 py-4 text-center">${row.price.toFixed(2)}</td>
								<td class="px-4 py-4 text-center">${row.amount.toFixed(2)}</td>
								<td class="px-4 py-4 text-center">
									{#if row.profit !== null}
										<span class="font-bold text-green-600">${row.profit.toFixed(2)}</span>
									{:else}
										-
									{/if}
								</td>
								<td class="px-4 py-4 text-center">
									{#if row.profitRate !== null}
										{row.profitRate.toFixed(2)}%
									{:else}
										-
									{/if}
								</td>
							</tr>
						{/each}

						<!-- 합계 행 -->
						<tr class="bg-yellow-100 text-lg font-bold">
							<td colspan="2" class="px-4 py-4 text-center">【합계】</td>
							<td class="px-4 py-4 text-center">{quantity}</td>
							<td class="px-4 py-4 text-center">-</td>
							<td class="px-4 py-4 text-center">${totalReturn.toFixed(2)}</td>
							<td class="px-4 py-4 text-center">
								<span class={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
									${netProfit.toFixed(2)}
								</span>
							</td>
							<td class="px-4 py-4 text-center">
								<span class={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
									{totalProfitRate.toFixed(2)}%
								</span>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		<!-- 요약 카드 -->
		<div class="grid gap-6 md:grid-cols-3">
			<div
				class="rounded-2xl bg-gradient-to-br from-[#f093fb] to-[#f5576c] p-8 text-center text-white shadow-lg"
			>
				<div class="mb-3 text-sm opacity-90">총 투자금</div>
				<div class="text-4xl font-bold">${totalInvest.toFixed(2)}</div>
			</div>

			<div
				class="rounded-2xl bg-gradient-to-br from-[#4facfe] to-[#00f2fe] p-8 text-center text-white shadow-lg"
			>
				<div class="mb-3 text-sm opacity-90">총 회수금</div>
				<div class="text-4xl font-bold">${totalReturn.toFixed(2)}</div>
			</div>

			<div
				class="rounded-2xl bg-gradient-to-br from-[#43e97b] to-[#38f9d7] p-8 text-center text-white shadow-lg"
			>
				<div class="mb-3 text-sm opacity-90">순수익</div>
				<div class="text-4xl font-bold">
					${netProfit.toFixed(2)}
					<div class="mt-1 text-lg">({totalProfitRate.toFixed(2)}%)</div>
				</div>
			</div>
		</div>
	</div>
</div>
