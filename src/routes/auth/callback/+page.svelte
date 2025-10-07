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

<div class="flex min-h-screen items-center justify-center bg-black">
	<div class="text-center">
		{#if loading}
			<div class="mb-4">
				<div
					class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"
				></div>
			</div>
			<p class="text-lg text-white">로그인 처리 중...</p>
		{:else if error}
			<div class="rounded-lg bg-red-500/20 p-6 text-red-400">
				<p class="text-lg font-semibold">{error}</p>
				<button
					onclick={() => goto('/')}
					class="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
				>
					홈으로 돌아가기
				</button>
			</div>
		{/if}
	</div>
</div>
