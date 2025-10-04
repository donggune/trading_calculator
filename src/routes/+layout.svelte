<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children } = $props();

	const isActive = (path: string) => {
		return $page.url.pathname === path;
	};
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-container">
	<nav class="main-nav">
		<div class="nav-content">
			<a href="/" class="logo">
				<div class="logo-icon">💹</div>
				<div class="logo-text">
					<span class="logo-title">BullGaze</span>
					<span class="logo-subtitle">시장 분석 도구</span>
				</div>
			</a>
			<div class="nav-links">
				<a href="/" class:active={isActive('/')}>
					<div class="nav-icon">📊</div>
					<div class="nav-text">
						<span class="nav-label">대시보드</span>
						<span class="nav-desc">금융 데이터</span>
					</div>
				</a>
				<a href="/calculator" class:active={isActive('/calculator')}>
					<div class="nav-icon">🎯</div>
					<div class="nav-text">
						<span class="nav-label">분할 익절</span>
						<span class="nav-desc">계산기</span>
					</div>
				</a>
			</div>
		</div>
	</nav>

	<main class="main-content">{@render children?.()}</main>

	<!-- 푸터 -->
	<footer class="footer">
		<div class="footer-content">
			<div class="footer-section">
				<div class="footer-logo">
					<div class="footer-icon">💹</div>
					<div class="footer-text">
						<span class="footer-title">BullGaze</span>
						<span class="footer-subtitle">시장 분석 도구</span>
					</div>
				</div>
				<p class="footer-description">시장을 주시하고 분석하는 전문적인 투자 도구입니다.</p>
			</div>

			<div class="footer-section">
				<h3 class="footer-heading">도구</h3>
				<ul class="footer-links">
					<li><a href="/" class="footer-link">대시보드</a></li>
					<li><a href="/calculator" class="footer-link">분할 익절 계산기</a></li>
				</ul>
			</div>

			<div class="footer-section">
				<h3 class="footer-heading">정보</h3>
				<ul class="footer-links">
					<li><span class="footer-text">분할 익절 전략</span></li>
					<li><span class="footer-text">투자 가이드</span></li>
				</ul>
			</div>
		</div>

		<div class="footer-bottom">
			<div class="footer-bottom-content">
				<p class="footer-copyright">© 2024 BullGaze. 투자에 신중하세요.</p>
				<div class="footer-disclaimer">
					<p>본 도구는 참고용이며, 투자 결정은 본인 책임입니다.</p>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	.app-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: black;
	}

	.main-nav {
		background: rgba(0, 0, 0, 0.95);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(24px);
		position: sticky;
		top: 0;
		z-index: 1000;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.nav-content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0.75rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	@media (min-width: 640px) {
		.nav-content {
			padding: 1rem 2rem;
		}
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 1rem;
		text-decoration: none;
		transition: all 0.3s ease;
	}

	.logo:hover {
		transform: translateY(-1px);
	}

	.logo-icon {
		font-size: 2rem;
		filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));
	}

	.logo-text {
		display: flex;
		flex-direction: column;
	}

	.logo-title {
		font-size: 1.25rem;
		font-weight: 700;
		background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		line-height: 1.2;
	}

	@media (min-width: 640px) {
		.logo-title {
			font-size: 1.5rem;
		}
	}

	.logo-subtitle {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 400;
	}

	.nav-links {
		display: flex;
		gap: 0.25rem;
	}

	@media (min-width: 640px) {
		.nav-links {
			gap: 0.75rem;
		}
	}

	.nav-links a {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border-radius: 12px;
		text-decoration: none;
		transition: all 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.08);
		position: relative;
		overflow: hidden;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.75rem;
	}

	@media (min-width: 640px) {
		.nav-links a {
			gap: 0.75rem;
			padding: 0.875rem 1.5rem;
			border-radius: 16px;
			font-size: 0.875rem;
		}
	}

	.nav-links a::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
		transition: left 0.5s;
	}

	.nav-links a:hover::before {
		left: 100%;
	}

	.nav-links a:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.25);
		transform: translateY(-2px);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
		color: white;
	}

	.nav-links a.active {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
		color: rgb(147, 197, 253);
		border-color: rgba(59, 130, 246, 0.5);
		box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
	}

	.nav-icon {
		font-size: 1.25rem;
		filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.1));
	}

	.nav-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.nav-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: inherit;
		line-height: 1.2;
	}

	.nav-desc {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 400;
	}

	.nav-links a.active .nav-desc {
		color: rgba(147, 197, 253, 0.8);
	}

	.main-content {
		flex: 1;
	}

	/* 푸터 스타일 */
	.footer {
		background: rgba(0, 0, 0, 0.95);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(24px);
		margin-top: auto;
	}

	.footer-content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 3rem 2rem 2rem;
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: 3rem;
	}

	.footer-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.footer-logo {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.footer-icon {
		font-size: 2rem;
		filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));
	}

	.footer-text {
		display: flex;
		flex-direction: column;
	}

	.footer-title {
		font-size: 1.25rem;
		font-weight: 700;
		background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		line-height: 1.2;
	}

	.footer-subtitle {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 400;
	}

	.footer-description {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		line-height: 1.6;
		margin: 0;
	}

	.footer-heading {
		font-size: 1rem;
		font-weight: 600;
		color: white;
		margin: 0 0 1rem 0;
	}

	.footer-links {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.footer-link {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color 0.3s ease;
	}

	.footer-link:hover {
		color: #3b82f6;
	}

	.footer-bottom {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding: 1.5rem 0;
	}

	.footer-bottom-content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.footer-copyright {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
		margin: 0;
	}

	.footer-disclaimer {
		text-align: right;
	}

	.footer-disclaimer p {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.75rem;
		margin: 0;
		line-height: 1.4;
	}

	@media (max-width: 768px) {
		.nav-content {
			padding: 0.75rem 1rem;
			flex-direction: column;
			gap: 0.75rem;
		}

		.logo {
			justify-content: center;
		}

		.logo-subtitle {
			display: none;
		}

		.nav-links {
			width: 100%;
			justify-content: center;
			gap: 0.5rem;
		}

		.nav-links a {
			flex: 1;
			justify-content: center;
			padding: 0.5rem 0.75rem;
		}

		.nav-text {
			align-items: center;
		}

		.nav-desc {
			display: none;
		}

		/* 푸터 모바일 스타일 */
		.footer-content {
			grid-template-columns: 1fr;
			gap: 1.5rem;
			padding: 1.5rem 1rem 1rem;
		}

		.footer-section {
			text-align: center;
		}

		.footer-bottom-content {
			flex-direction: column;
			gap: 0.75rem;
			text-align: center;
			padding: 0 1rem;
		}

		.footer-disclaimer {
			text-align: center;
		}

		.footer-title {
			font-size: 1.25rem;
		}

		.footer-subtitle {
			font-size: 0.7rem;
		}

		.footer-description {
			font-size: 0.7rem;
		}

		.footer-heading {
			font-size: 0.875rem;
		}
	}

	@media (max-width: 480px) {
		.nav-links a {
			flex-direction: column;
			gap: 0.25rem;
			padding: 0.5rem 0.375rem;
			font-size: 0.65rem;
		}

		.nav-icon {
			font-size: 1.25rem;
		}

		.nav-label {
			font-size: 0.65rem;
		}

		.logo-title {
			font-size: 1rem;
		}

		.footer-content {
			padding: 1rem 0.75rem 0.75rem;
			gap: 1rem;
		}

		.footer-title {
			font-size: 1rem;
		}

		.footer-subtitle {
			font-size: 0.65rem;
		}

		.footer-description {
			font-size: 0.65rem;
		}
	}
</style>
