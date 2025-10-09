<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { TradingEntry, TradingStats } from '$lib/types';
	import { userStore, signInWithGoogle } from '$lib/stores/auth';
	import {
		fetchTradingEntries,
		createTradingEntry,
		deleteTradingEntry,
		updateTradingEntry
	} from '$lib/api/trading';

	// SEO 메타 태그는 svelte:head에서 처리

	// 구조화된 데이터
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'BullGaze 매매일지',
		description: '투자 거래 기록을 체계적으로 관리하고 분석하는 도구',
		url: 'https://bullgaze.com/journal',
		applicationCategory: 'FinanceApplication',
		featureList: ['거래 기록', '성과 분석', '통계 대시보드', '투자 일지'],
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		}
	};

	// 상태 관리
	let entries = $state<TradingEntry[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let showAddForm = $state(false);
	let editingId = $state<string | null>(null);
	let newEntry = $state<Partial<TradingEntry>>({
		date: new Date().toISOString().split('T')[0],
		symbol: '',
		action: 'buy',
		quantity: 0,
		price: 0,
		amount: 0,
		notes: '',
		tags: []
	});
	let editEntry = $state<Partial<TradingEntry>>({});

	// 거래 기록 로드
	async function loadEntries() {
		loading = true;
		error = null;

		const { data, error: fetchError } = await fetchTradingEntries();

		if (fetchError) {
			error = '거래 기록을 불러오는데 실패했습니다.';
			console.error('거래 기록 로드 오류:', fetchError);
		} else {
			entries = data || [];
		}

		loading = false;
	}

	// 컴포넌트 마운트 시 데이터 로드
	onMount(() => {
		if ($userStore) {
			loadEntries();
		}
	});

	// 사용자 인증 상태 변경 감지
	$effect(() => {
		if ($userStore) {
			loadEntries();
		} else {
			entries = [];
			loading = false;
		}
	});

	// 정렬된 엔트리 (최신순)
	const sortedEntries = $derived((): TradingEntry[] =>
		[...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	);

	// 통계 계산
	const stats = $derived((): TradingStats => {
		const buyEntries = entries.filter((e) => e.action === 'buy');
		const sellEntries = entries.filter((e) => e.action === 'sell');

		// 매수/매도 쌍을 찾아서 거래별 수익 계산
		const trades: { profit: number; isWin: boolean }[] = [];

		// 간단한 예시: 같은 종목의 매수/매도 쌍을 찾아서 수익 계산
		const symbols = [...new Set(entries.map((e) => e.symbol))];

		for (const symbol of symbols) {
			const symbolEntries = entries
				.filter((e) => e.symbol === symbol)
				.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

			let buyAmount = 0;
			let buyQuantity = 0;

			for (const entry of symbolEntries) {
				if (entry.action === 'buy') {
					buyAmount += entry.amount;
					buyQuantity += entry.quantity;
				} else if (entry.action === 'sell' && buyQuantity > 0) {
					const sellRatio = entry.quantity / buyQuantity;
					const costBasis = buyAmount * sellRatio;
					const profit = entry.amount - costBasis;

					trades.push({
						profit,
						isWin: profit > 0
					});

					// 매도한 만큼 매수 수량과 금액 차감
					buyAmount -= costBasis;
					buyQuantity -= entry.quantity;
				}
			}
		}

		const winningTrades = trades.filter((t) => t.isWin);
		const losingTrades = trades.filter((t) => !t.isWin);

		const totalProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
		const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));

		return {
			totalTrades: trades.length,
			winningTrades: winningTrades.length,
			losingTrades: losingTrades.length,
			winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
			totalProfit,
			totalLoss,
			netProfit: totalProfit - totalLoss,
			averageWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
			averageLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
			profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0
		};
	});

	// 거래 추가
	async function addEntry() {
		if (!newEntry.symbol || !newEntry.quantity || !newEntry.price) return;

		loading = true;
		error = null;

		const entry = {
			date: newEntry.date || new Date().toISOString().split('T')[0],
			symbol: newEntry.symbol.toUpperCase(),
			action: newEntry.action || 'buy',
			quantity: newEntry.quantity,
			price: newEntry.price,
			amount: newEntry.quantity * newEntry.price,
			notes: newEntry.notes,
			tags: newEntry.tags || []
		} as Omit<TradingEntry, 'id' | 'created_at' | 'updated_at'>;

		const { data, error: createError } = await createTradingEntry(entry);

		if (createError) {
			error = '거래 기록 추가에 실패했습니다.';
			console.error('거래 기록 추가 오류:', createError);
			loading = false;
			return;
		}

		if (data) {
			entries = [data, ...entries];
		}

		// 폼 초기화
		newEntry = {
			date: new Date().toISOString().split('T')[0],
			symbol: '',
			action: 'buy',
			quantity: 0,
			price: 0,
			amount: 0,
			notes: '',
			tags: []
		};

		showAddForm = false;
		loading = false;
	}

	// 거래 수정 시작
	function startEdit(entry: TradingEntry) {
		editingId = entry.id;
		editEntry = {
			date: entry.date,
			symbol: entry.symbol,
			action: entry.action,
			quantity: entry.quantity,
			price: entry.price,
			amount: entry.amount,
			notes: entry.notes,
			tags: entry.tags
		};
		showAddForm = false; // 추가 폼 닫기
	}

	// 거래 수정 취소
	function cancelEdit() {
		editingId = null;
		editEntry = {};
	}

	// 거래 수정 저장
	async function saveEdit(id: string) {
		if (!editEntry.symbol || !editEntry.quantity || !editEntry.price) return;

		loading = true;
		error = null;

		const updates = {
			date: editEntry.date || new Date().toISOString().split('T')[0],
			symbol: editEntry.symbol.toUpperCase(),
			action: editEntry.action || 'buy',
			quantity: editEntry.quantity,
			price: editEntry.price,
			amount: editEntry.quantity * editEntry.price,
			notes: editEntry.notes,
			tags: editEntry.tags || []
		} as Partial<Omit<TradingEntry, 'id' | 'created_at' | 'updated_at'>>;

		const { data, error: updateError } = await updateTradingEntry(id, updates);

		if (updateError) {
			error = '거래 기록 수정에 실패했습니다.';
			console.error('거래 기록 수정 오류:', updateError);
			loading = false;
			return;
		}

		if (data) {
			// 목록에서 해당 항목 업데이트
			entries = entries.map((e) => (e.id === id ? data : e));
		}

		editingId = null;
		editEntry = {};
		loading = false;
	}

	// 거래 삭제
	async function deleteEntry(id: string) {
		if (!confirm('이 거래 기록을 삭제하시겠습니까?')) return;

		loading = true;
		error = null;

		const { success, error: deleteError } = await deleteTradingEntry(id);

		if (deleteError) {
			error = '거래 기록 삭제에 실패했습니다.';
			console.error('거래 기록 삭제 오류:', deleteError);
			loading = false;
			return;
		}

		if (success) {
			entries = entries.filter((e) => e.id !== id);
		}

		loading = false;
	}

	// 태그 문자열을 배열로 변환
	function parseTags(tagString: string): string[] {
		return tagString
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
	}

	// 금액 포맷팅
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('ko-KR', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	// 날짜 포맷팅
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('ko-KR');
	}
</script>

<!-- SEO 메타 태그 및 구조화된 데이터 -->
<svelte:head>
	<title>매매일지 - BullGaze</title>
	<meta
		name="description"
		content="투자 거래 기록을 체계적으로 관리하고 분석하세요. 매매일지를 통해 투자 성과를 추적하고 개선점을 찾아보세요."
	/>
	<script type="application/ld+json">
		{JSON.stringify(structuredData)}
	</script>
</svelte:head>

{#if $userStore}
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
					투자 거래를 체계적으로 기록하고 성과를 분석해보세요
				</p>

				<!-- 장식적 요소 -->
				<div class="mt-4 flex justify-center space-x-2">
					<div class="h-1 w-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"></div>
					<div class="h-1 w-4 rounded-full bg-gradient-to-r from-orange-500 to-red-500"></div>
					<div class="h-1 w-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500"></div>
				</div>
			</div>

			<!-- 에러 메시지 -->
			{#if error}
				<div
					class="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-center text-sm text-red-400 sm:mb-6 sm:p-4"
				>
					{error}
				</div>
			{/if}

			<!-- 로딩 상태 -->
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="flex flex-col items-center gap-3">
						<div
							class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
						></div>
						<p class="text-sm text-gray-400">데이터를 불러오는 중...</p>
					</div>
				</div>
			{:else}
				<div class="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-12 lg:gap-8 xl:gap-12">
					<!-- 통계 대시보드 -->
					<div class="lg:col-span-4 xl:col-span-3">
						<div class="space-y-4 sm:space-y-6">
							<!-- 성과 요약 카드 -->
							<div
								class="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-3 backdrop-blur-xl sm:p-4 md:p-6"
							>
								<h3
									class="mb-3 text-base font-bold text-white sm:mb-4 sm:text-lg md:mb-6 md:text-xl"
								>
									성과 요약
								</h3>
								<div
									class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-1 lg:space-y-3 md:lg:space-y-4"
								>
									<div class="flex justify-between text-xs sm:text-sm">
										<span class="text-gray-400">총 거래 수</span>
										<span class="font-mono font-bold text-white">{stats().totalTrades}</span>
									</div>
									<div class="flex justify-between text-xs sm:text-sm">
										<span class="text-gray-400">승률</span>
										<span class="font-mono font-bold text-blue-400"
											>{stats().winRate.toFixed(1)}%</span
										>
									</div>
									<div class="flex justify-between text-xs sm:text-sm">
										<span class="text-gray-400">총 수익</span>
										<span class="font-mono text-xs font-bold text-emerald-400 sm:text-sm"
											>{formatCurrency(stats().totalProfit)}</span
										>
									</div>
									<div class="flex justify-between text-xs sm:text-sm">
										<span class="text-gray-400">총 손실</span>
										<span class="font-mono text-xs font-bold text-red-400 sm:text-sm"
											>{formatCurrency(stats().totalLoss)}</span
										>
									</div>
									<div
										class="col-span-2 border-t border-white/10 pt-2 sm:pt-3 lg:col-span-1 lg:pt-4"
									>
										<div class="flex items-center justify-between">
											<span class="text-xs font-medium text-white sm:text-sm">순수익</span>
											<div class="text-right">
												<div
													class="font-mono text-sm font-bold sm:text-base md:text-lg lg:text-xl {stats()
														.netProfit >= 0
														? 'text-emerald-400'
														: 'text-red-400'}"
												>
													{formatCurrency(stats().netProfit)}
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- 거래 추가 버튼 -->
							<button
								onclick={() => (showAddForm = !showAddForm)}
								class="w-full rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10"
							>
								<div class="flex items-center justify-center gap-2">
									<span class="text-2xl">➕</span>
									<span class="font-medium text-white">새 거래 추가</span>
								</div>
							</button>

							<!-- 거래 추가 폼 -->
							{#if showAddForm}
								<div
									class="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl sm:p-4 md:p-6"
								>
									<h3
										class="mb-3 text-base font-bold text-white sm:mb-4 sm:text-lg md:mb-6 md:text-xl"
									>
										새 거래 추가
									</h3>
									<div class="space-y-3 sm:space-y-4">
										<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
											<div>
												<label for="action" class="mb-2 block text-sm font-medium text-gray-300">
													거래 유형
												</label>
												<select
													id="action"
													bind:value={newEntry.action}
													class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
												>
													<option value="buy" class="bg-gray-800 text-white">매수</option>
													<option value="sell" class="bg-gray-800 text-white">매도</option>
												</select>
											</div>
											<div>
												<label for="date" class="mb-2 block text-sm font-medium text-gray-300">
													거래일
												</label>
												<input
													id="date"
													type="date"
													bind:value={newEntry.date}
													class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
												/>
											</div>
										</div>

										<div>
											<label
												for="symbol"
												class="mb-1.5 block text-xs font-medium text-gray-300 sm:mb-2 sm:text-sm"
											>
												종목명
											</label>
											<input
												id="symbol"
												type="text"
												bind:value={newEntry.symbol}
												placeholder="NVDL"
												class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
											/>
										</div>

										<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
											<div>
												<label
													for="quantity"
													class="mb-1.5 block text-xs font-medium text-gray-300 sm:mb-2 sm:text-sm"
												>
													수량
												</label>
												<input
													id="quantity"
													type="number"
													bind:value={newEntry.quantity}
													placeholder="50"
													step="1"
													class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
												/>
											</div>
											<div>
												<label
													for="price"
													class="mb-1.5 block text-xs font-medium text-gray-300 sm:mb-2 sm:text-sm"
												>
													단가 ($)
												</label>
												<input
													id="price"
													type="number"
													bind:value={newEntry.price}
													placeholder="100.00"
													step="0.01"
													class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
												/>
											</div>
										</div>

										<div>
											<label
												for="notes"
												class="mb-1.5 block text-xs font-medium text-gray-300 sm:mb-2 sm:text-sm"
											>
												메모
											</label>
											<textarea
												id="notes"
												bind:value={newEntry.notes}
												placeholder="거래 관련 메모를 입력하세요..."
												rows="3"
												class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
											></textarea>
										</div>

										<div>
											<label
												for="tags"
												class="mb-1.5 block text-xs font-medium text-gray-300 sm:mb-2 sm:text-sm"
											>
												태그 (쉼표로 구분)
											</label>
											<input
												id="tags"
												type="text"
												value={newEntry.tags?.join(', ') || ''}
												oninput={(e) => {
													const target = e.target as HTMLInputElement;
													if (target) {
														const tagString = target.value;
														newEntry.tags = parseTags(tagString);
													}
												}}
												placeholder="AI, ETF, 단기"
												class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 backdrop-blur-xl focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
											/>
										</div>

										<div class="flex gap-3">
											<button
												onclick={addEntry}
												class="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
											>
												추가
											</button>
											<button
												onclick={() => (showAddForm = false)}
												class="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
											>
												취소
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- 거래 기록 테이블 -->
					<div class="lg:col-span-8 xl:col-span-9">
						<div class="space-y-6">
							<!-- 거래 기록 카드 -->
							<div
								class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl xl:shadow-2xl"
							>
								<div class="border-b border-white/10 bg-white/5 p-3 sm:p-4 md:p-6">
									<h3 class="text-base font-bold text-white sm:text-lg md:text-xl">거래 기록</h3>
								</div>

								{#if entries.length === 0}
									<div class="py-8 text-center text-xs text-gray-500 sm:py-16 sm:text-sm">
										아직 거래 기록이 없습니다. 첫 번째 거래를 추가해보세요!
									</div>
								{:else}
									<!-- 모바일: 카드 형태 -->
									<div class="block lg:hidden">
										<div class="space-y-3 p-4">
											{#each sortedEntries() as entry}
												<div class="rounded-xl border border-white/10 bg-white/5 p-4">
													{#if editingId === entry.id}
														<!-- 수정 모드 -->
														<div class="space-y-3">
															<div class="grid grid-cols-2 gap-3">
																<div>
																	<label class="mb-1 block text-xs font-medium text-gray-300"
																		>거래 유형</label
																	>
																	<select
																		bind:value={editEntry.action}
																		class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
																	>
																		<option value="buy">매수</option>
																		<option value="sell">매도</option>
																	</select>
																</div>
																<div>
																	<label class="mb-1 block text-xs font-medium text-gray-300"
																		>거래일</label
																	>
																	<input
																		type="date"
																		bind:value={editEntry.date}
																		class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
																	/>
																</div>
															</div>
															<div>
																<label class="mb-1 block text-xs font-medium text-gray-300"
																	>종목명</label
																>
																<input
																	type="text"
																	bind:value={editEntry.symbol}
																	class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
																/>
															</div>
															<div class="grid grid-cols-2 gap-3">
																<div>
																	<label class="mb-1 block text-xs font-medium text-gray-300"
																		>수량</label
																	>
																	<input
																		type="number"
																		bind:value={editEntry.quantity}
																		class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
																	/>
																</div>
																<div>
																	<label class="mb-1 block text-xs font-medium text-gray-300"
																		>단가 ($)</label
																	>
																	<input
																		type="number"
																		bind:value={editEntry.price}
																		step="0.01"
																		class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
																	/>
																</div>
															</div>
															<div>
																<label class="mb-1 block text-xs font-medium text-gray-300"
																	>메모</label
																>
																<textarea
																	bind:value={editEntry.notes}
																	rows="2"
																	class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
																></textarea>
															</div>
															<div>
																<label class="mb-1 block text-xs font-medium text-gray-300"
																	>태그 (쉼표로 구분)</label
																>
																<input
																	type="text"
																	value={editEntry.tags?.join(', ') || ''}
																	oninput={(e) => {
																		const target = e.target as HTMLInputElement;
																		if (target) {
																			editEntry.tags = parseTags(target.value);
																		}
																	}}
																	class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
																/>
															</div>
															<div class="flex gap-2">
																<button
																	onclick={() => saveEdit(entry.id)}
																	class="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
																>
																	저장
																</button>
																<button
																	onclick={cancelEdit}
																	class="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
																>
																	취소
																</button>
															</div>
														</div>
													{:else}
														<!-- 일반 모드 -->
														<div class="flex items-start justify-between">
															<div class="flex-1">
																<div class="mb-2 flex items-center gap-2">
																	<span
																		class="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-mono text-xs font-medium text-white"
																	>
																		{entry.symbol}
																	</span>
																	<span
																		class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium {entry.action ===
																		'buy'
																			? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30'
																			: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'}"
																	>
																		{entry.action === 'buy' ? '매수' : '매도'}
																	</span>
																</div>
																<div class="mb-2 text-xs text-gray-400">
																	{formatDate(entry.date)}
																</div>
																<div class="grid grid-cols-2 gap-2 text-xs">
																	<div>
																		<span class="text-gray-400">수량:</span>
																		<span class="ml-1 font-mono text-white">{entry.quantity}</span>
																	</div>
																	<div>
																		<span class="text-gray-400">단가:</span>
																		<span class="ml-1 font-mono text-white"
																			>${entry.price.toFixed(2)}</span
																		>
																	</div>
																</div>
																<div class="mt-2">
																	<span class="text-xs text-gray-400">금액:</span>
																	<span class="ml-1 font-mono text-sm font-bold text-white"
																		>{formatCurrency(entry.amount)}</span
																	>
																</div>
																{#if entry.notes}
																	<div class="mt-2">
																		<p class="text-xs text-gray-300">{entry.notes}</p>
																	</div>
																{/if}
																{#if entry.tags && entry.tags.length > 0}
																	<div class="mt-2 flex flex-wrap gap-1">
																		{#each entry.tags as tag}
																			<span
																				class="inline-flex items-center rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-500/30"
																			>
																				{tag}
																			</span>
																		{/each}
																	</div>
																{/if}
															</div>
															<div class="flex flex-col gap-2">
																<button
																	onclick={() => startEdit(entry)}
																	class="rounded-lg bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
																>
																	수정
																</button>
																<button
																	onclick={() => deleteEntry(entry.id)}
																	class="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
																>
																	삭제
																</button>
															</div>
														</div>
													{/if}
												</div>
											{/each}
										</div>
									</div>

									<!-- 데스크톱: 테이블 형태 -->
									<div class="hidden overflow-x-auto lg:block">
										<table class="w-full text-xs sm:text-sm">
											<thead class="border-b border-white/10 bg-white/5">
												<tr>
													<th
														class="px-3 py-2 text-left text-xs font-semibold text-gray-300 sm:px-4 sm:py-3 sm:text-sm"
													>
														날짜
													</th>
													<th
														class="px-3 py-2 text-left text-xs font-semibold text-gray-300 sm:px-4 sm:py-3 sm:text-sm"
													>
														종목
													</th>
													<th
														class="px-3 py-2 text-center text-xs font-semibold text-gray-300 sm:px-4 sm:py-3 sm:text-sm"
													>
														거래
													</th>
													<th
														class="px-3 py-2 text-right text-xs font-semibold text-gray-300 sm:px-4 sm:py-3 sm:text-sm"
													>
														수량
													</th>
													<th
														class="px-3 py-2 text-right text-xs font-semibold text-gray-300 sm:px-4 sm:py-3 sm:text-sm"
													>
														단가
													</th>
													<th
														class="px-3 py-2 text-right text-xs font-semibold text-gray-300 sm:px-4 sm:py-3 sm:text-sm"
													>
														금액
													</th>
													<th
														class="px-3 py-2 text-left text-xs font-semibold text-gray-300 sm:px-4 sm:py-3 sm:text-sm"
													>
														메모
													</th>
													<th
														class="px-3 py-2 text-center text-xs font-semibold text-gray-300 sm:px-4 sm:py-3 sm:text-sm"
													>
														작업
													</th>
												</tr>
											</thead>
											<tbody>
												{#each sortedEntries() as entry}
													{#if editingId === entry.id}
														<!-- 수정 모드 -->
														<tr class="border-b border-white/5 bg-white/10">
															<td class="px-3 py-2 sm:px-4 sm:py-3">
																<input
																	type="date"
																	bind:value={editEntry.date}
																	class="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white"
																/>
															</td>
															<td class="px-3 py-2 sm:px-4 sm:py-3">
																<input
																	type="text"
																	bind:value={editEntry.symbol}
																	class="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white"
																/>
															</td>
															<td class="px-3 py-2 text-center sm:px-4 sm:py-3">
																<select
																	bind:value={editEntry.action}
																	class="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white"
																>
																	<option value="buy">매수</option>
																	<option value="sell">매도</option>
																</select>
															</td>
															<td class="px-3 py-2 sm:px-4 sm:py-3">
																<input
																	type="number"
																	bind:value={editEntry.quantity}
																	class="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-right text-xs text-white"
																/>
															</td>
															<td class="px-3 py-2 sm:px-4 sm:py-3">
																<input
																	type="number"
																	bind:value={editEntry.price}
																	step="0.01"
																	class="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-right text-xs text-white"
																/>
															</td>
															<td class="px-3 py-2 text-right font-mono text-white sm:px-4 sm:py-3">
																${editEntry.quantity && editEntry.price
																	? (editEntry.quantity * editEntry.price).toFixed(2)
																	: '0.00'}
															</td>
															<td class="px-3 py-2 sm:px-4 sm:py-3">
																<div class="space-y-1">
																	<input
																		type="text"
																		bind:value={editEntry.notes}
																		placeholder="메모"
																		class="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white"
																	/>
																	<input
																		type="text"
																		value={editEntry.tags?.join(', ') || ''}
																		oninput={(e) => {
																			const target = e.target as HTMLInputElement;
																			if (target) {
																				editEntry.tags = parseTags(target.value);
																			}
																		}}
																		placeholder="태그"
																		class="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white"
																	/>
																</div>
															</td>
															<td class="px-3 py-2 text-center sm:px-4 sm:py-3">
																<div class="flex justify-center gap-1">
																	<button
																		onclick={() => saveEdit(entry.id)}
																		class="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
																	>
																		저장
																	</button>
																	<button
																		onclick={cancelEdit}
																		class="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs font-medium text-white hover:bg-white/10"
																	>
																		취소
																	</button>
																</div>
															</td>
														</tr>
													{:else}
														<!-- 일반 모드 -->
														<tr class="border-b border-white/5 transition-colors hover:bg-white/5">
															<td class="px-3 py-2 text-white sm:px-4 sm:py-3">
																{formatDate(entry.date)}
															</td>
															<td class="px-3 py-2 sm:px-4 sm:py-3">
																<span
																	class="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-mono text-xs font-medium text-white"
																>
																	{entry.symbol}
																</span>
															</td>
															<td class="px-3 py-2 text-center sm:px-4 sm:py-3">
																<span
																	class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium {entry.action ===
																	'buy'
																		? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30'
																		: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'}"
																>
																	{entry.action === 'buy' ? '매수' : '매도'}
																</span>
															</td>
															<td class="px-3 py-2 text-right font-mono text-white sm:px-4 sm:py-3">
																{entry.quantity}
															</td>
															<td class="px-3 py-2 text-right font-mono text-white sm:px-4 sm:py-3">
																${entry.price.toFixed(2)}
															</td>
															<td class="px-3 py-2 text-right font-mono text-white sm:px-4 sm:py-3">
																{formatCurrency(entry.amount)}
															</td>
															<td class="px-3 py-2 text-white sm:px-4 sm:py-3">
																<div class="max-w-xs">
																	{#if entry.notes}
																		<p class="truncate text-xs text-gray-300">{entry.notes}</p>
																	{/if}
																	{#if entry.tags && entry.tags.length > 0}
																		<div class="mt-1 flex flex-wrap gap-1">
																			{#each entry.tags as tag}
																				<span
																					class="inline-flex items-center rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-500/30"
																				>
																					{tag}
																				</span>
																			{/each}
																		</div>
																	{/if}
																</div>
															</td>
															<td class="px-3 py-2 text-center sm:px-4 sm:py-3">
																<div class="flex justify-center gap-1">
																	<button
																		onclick={() => startEdit(entry)}
																		class="rounded-lg bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
																	>
																		수정
																	</button>
																	<button
																		onclick={() => deleteEntry(entry.id)}
																		class="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
																	>
																		삭제
																	</button>
																</div>
															</td>
														</tr>
													{/if}
												{/each}
											</tbody>
										</table>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
				<div class="pb-12 sm:pb-16 md:pb-20"></div>
			{/if}
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-black">
		<div
			class="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center sm:py-32"
		>
			<h1 class="mb-3 text-2xl font-bold text-white sm:text-3xl">
				매매일지는 로그인 후 이용 가능합니다
			</h1>
			<p class="mb-6 text-sm text-gray-300 sm:text-base">
				거래를 기록하고 통계를 확인하려면 구글 계정으로 로그인해 주세요.
			</p>
			<button
				onclick={() => signInWithGoogle()}
				class="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700"
			>
				구글로 로그인
			</button>
		</div>
	</div>
{/if}

<style>
</style>
