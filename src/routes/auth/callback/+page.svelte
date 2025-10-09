<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			// URL에서 next 파라미터 파싱
			const url = new URL(window.location.href);
			const next = url.searchParams.get('next') || '/';

			// 현재 세션 확인
			const {
				data: { session },
				error: authError
			} = await supabase.auth.getSession();

			if (authError) throw authError;

			if (session) {
				// 로그인 성공 - 원래 보려던 페이지로 이동
				goto(next, { replaceState: true });
			} else {
				// 세션이 없으면 홈으로
				goto('/', { replaceState: true });
			}
		} catch (err) {
			console.error('인증 콜백 오류:', err);
			error = '로그인 처리 중 오류가 발생했습니다.';
			loading = false;
		}
	});
</script>

<div class="min-h-screen pb-24">
	<div
		class="relative mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8 xl:max-w-none xl:px-12"
	>
		<div class="flex min-h-[400px] items-center justify-center">
			<div class="text-center">
				{#if loading}
					<div class="mb-6">
						<div
							class="mb-4 h-15 w-15 animate-spin rounded-full border-4 border-white/10 border-t-blue-400 shadow-lg shadow-blue-400/30"
						></div>
					</div>
					<p class="text-lg font-medium text-white">로그인 처리 중...</p>
				{:else if error}
					<div class="rounded-2xl border border-red-500/50 bg-red-500/10 p-8 backdrop-blur-xl">
						<p class="mb-6 text-lg font-semibold text-red-400">{error}</p>
						<button
							onclick={() => goto('/')}
							class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
						>
							홈으로 돌아가기
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
