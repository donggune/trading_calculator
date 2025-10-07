<script lang="ts">
	import { userStore, signInWithGoogle, signOut } from '$lib/stores/auth';
	import { page } from '$app/stores';

	let showUserMenu = $state(false);
	let showMobileMenu = $state(false);

	async function handleSignIn() {
		await signInWithGoogle();
	}

	async function handleSignOut() {
		await signOut();
		showUserMenu = false;
	}
</script>

<header class="fixed top-0 right-0 left-0 z-50 border-b border-black bg-black">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- 로고 -->
			<div class="flex items-center">
				<a href="/" class="flex items-center gap-2">
					<span class="text-2xl">🐂</span>
					<span
						class="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-xl font-bold text-transparent"
					>
						BullGaze
					</span>
				</a>
			</div>

			<!-- 네비게이션 (데스크톱) -->
			<nav class="hidden items-center gap-6 md:flex">
				<a
					href="/"
					class="text-sm font-medium transition-colors {$page.url.pathname === '/'
						? 'text-blue-400'
						: 'text-gray-300 hover:text-white'}"
				>
					홈
				</a>
				<a
					href="/calculator"
					class="text-sm font-medium transition-colors {$page.url.pathname === '/calculator'
						? 'text-blue-400'
						: 'text-gray-300 hover:text-white'}"
				>
					계산기
				</a>
				<a
					href="/journal"
					class="text-sm font-medium transition-colors {$page.url.pathname === '/journal'
						? 'text-blue-400'
						: 'text-gray-300 hover:text-white'}"
				>
					매매일지
				</a>
			</nav>

			<!-- 모바일 햄버거 버튼 -->
			<button
				class="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-200 transition-all hover:bg-white/10 md:hidden"
				aria-label={showMobileMenu ? '메뉴 닫기' : '메뉴 열기'}
				aria-expanded={showMobileMenu}
				onclick={() => (showMobileMenu = !showMobileMenu)}
			>
				{#if showMobileMenu}
					<!-- X 아이콘 -->
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				{:else}
					<!-- 햄버거 아이콘 -->
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				{/if}
			</button>

			<!-- 사용자 메뉴 (데스크톱 전용) -->
			<div class="hidden items-center md:flex">
				{#if $userStore}
					<div class="relative">
						<button
							onclick={() => (showUserMenu = !showUserMenu)}
							class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
						>
							{#if $userStore.user_metadata?.avatar_url}
								<img
									src={$userStore.user_metadata.avatar_url}
									alt="프로필"
									class="h-6 w-6 rounded-full"
								/>
							{:else}
								<div
									class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
								>
									<span class="text-xs font-bold text-white">
										{$userStore.email?.charAt(0).toUpperCase()}
									</span>
								</div>
							{/if}
							<span class="hidden text-sm text-white sm:inline">
								{$userStore.email?.split('@')[0] || '사용자'}
							</span>
							<svg
								class="h-4 w-4 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>

						{#if showUserMenu}
							<div
								class="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-gray-900/95 py-2 shadow-xl backdrop-blur-xl"
							>
								<div class="border-b border-white/10 px-4 py-3">
									<p class="text-sm font-medium text-white">{$userStore.email}</p>
									<p class="mt-1 text-xs text-gray-400">
										{$userStore.user_metadata?.full_name || '사용자'}
									</p>
								</div>
								<button
									onclick={handleSignOut}
									class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
										/>
									</svg>
									로그아웃
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<button
						onclick={handleSignIn}
						class="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						구글 로그인
					</button>
				{/if}
			</div>
		</div>
	</div>
</header>

<!-- 헤더 높이만큼 공간 확보 -->
<div class="h-16"></div>

<!-- 모바일 네비게이션 패널 -->
{#if showMobileMenu}
	<!-- 오버레이 배경 (클릭 시 메뉴 닫기) -->
	<div
		class="animate-fade-in fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
		onclick={() => (showMobileMenu = false)}
		onkeydown={(e) => {
			if (e.key === 'Escape') showMobileMenu = false;
		}}
		role="button"
		tabindex="-1"
		aria-label="메뉴 닫기"
	></div>

	<!-- 메뉴 패널 -->
	<div class="animate-slide-down fixed top-16 right-0 left-0 z-40 md:hidden">
		<div class="border-b border-white/10 bg-black/95 shadow-lg backdrop-blur-xl">
			<nav class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
				<div class="flex flex-col gap-2">
					<a
						href="/"
						onclick={() => (showMobileMenu = false)}
						class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {$page.url
							.pathname === '/'
							? 'bg-white/10 text-blue-400'
							: 'text-gray-300 hover:bg-white/5 hover:text-white'}"
					>
						홈
					</a>
					<a
						href="/calculator"
						onclick={() => (showMobileMenu = false)}
						class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {$page.url
							.pathname === '/calculator'
							? 'bg-white/10 text-blue-400'
							: 'text-gray-300 hover:bg-white/5 hover:text-white'}"
					>
						계산기
					</a>
					<a
						href="/journal"
						onclick={() => (showMobileMenu = false)}
						class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {$page.url
							.pathname === '/journal'
							? 'bg-white/10 text-blue-400'
							: 'text-gray-300 hover:bg-white/5 hover:text-white'}"
					>
						매매일지
					</a>

					<!-- 모바일: 인증 영역 -->
					{#if $userStore}
						<div class="mt-2 rounded-lg border border-white/10 bg-white/5 p-3">
							<p class="mb-2 text-xs text-gray-300">{$userStore.email}</p>
							<button
								onclick={() => {
									showMobileMenu = false;
									handleSignOut();
								}}
								class="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
							>
								로그아웃
							</button>
						</div>
					{:else}
						<button
							onclick={() => {
								showMobileMenu = false;
								handleSignIn();
							}}
							class="mt-2 w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700"
						>
							구글 로그인
						</button>
					{/if}
				</div>
			</nav>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slide-down {
		from {
			transform: translateY(-100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	:global(.animate-fade-in) {
		animation: fade-in 0.2s ease-out;
	}

	:global(.animate-slide-down) {
		animation: slide-down 0.3s ease-out;
	}
</style>
