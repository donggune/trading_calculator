import { writable, type Readable, derived } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';
import { browser } from '$app/environment';

// 인증 상태 스토어
export const userStore = writable<User | null>(null);
export const sessionStore = writable<Session | null>(null);
export const loadingStore = writable<boolean>(true);

// 로그인 여부를 쉽게 확인할 수 있는 derived 스토어
export const isAuthenticated: Readable<boolean> = derived(userStore, ($user) => $user !== null);

// 인증 상태 초기화
export function initAuth() {
	if (!browser) return;

	// 현재 세션 확인
	supabase.auth.getSession().then(({ data: { session } }) => {
		sessionStore.set(session);
		userStore.set(session?.user ?? null);
		loadingStore.set(false);
	});

	// 인증 상태 변경 리스너
	const {
		data: { subscription }
	} = supabase.auth.onAuthStateChange((_event, session) => {
		sessionStore.set(session);
		userStore.set(session?.user ?? null);
		loadingStore.set(false);
	});

	return () => {
		subscription.unsubscribe();
	};
}

// 구글 로그인
export async function signInWithGoogle() {
	const currentPath = window.location.pathname + window.location.search + window.location.hash;
	const next = encodeURIComponent(currentPath || '/');
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			// 로그인 완료 후 콜백으로 돌아오며 next 파라미터 전달
			redirectTo: `${window.location.origin}/auth/callback?next=${next}`
		}
	});

	if (error) {
		console.error('Google 로그인 오류:', error);
		return { error };
	}

	return { data };
}

// 로그아웃
export async function signOut() {
	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error('로그아웃 오류:', error);
		return { error };
	}

	return { error: null };
}

// 사용자 정보 가져오기
export async function getCurrentUser() {
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error) {
		console.error('사용자 정보 가져오기 오류:', error);
		return null;
	}

	return user;
}
