import { supabase } from '$lib/supabaseClient';
import type { TradingEntry } from '$lib/types';

/**
 * 사용자의 모든 거래 기록 조회
 */
export async function fetchTradingEntries(): Promise<{
	data: TradingEntry[] | null;
	error: Error | null;
}> {
	try {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			return { data: null, error: new Error('User not authenticated') };
		}

		const { data, error } = await supabase
			.from('financial_trading_entries')
			.select('*')
			.eq('user_id', user.id)
			.order('date', { ascending: false });

		if (error) {
			console.error('거래 기록 조회 오류:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data, error: null };
	} catch (err) {
		console.error('거래 기록 조회 중 예외 발생:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * 새로운 거래 기록 추가
 */
export async function createTradingEntry(
	entry: Omit<TradingEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<{
	data: TradingEntry | null;
	error: Error | null;
}> {
	try {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			return { data: null, error: new Error('User not authenticated') };
		}

		const { data, error } = await supabase
			.from('financial_trading_entries')
			.insert({
				user_id: user.id,
				date: entry.date,
				symbol: entry.symbol,
				action: entry.action,
				quantity: entry.quantity,
				price: entry.price,
				amount: entry.amount,
				notes: entry.notes || null,
				tags: entry.tags || []
			})
			.select()
			.single();

		if (error) {
			console.error('거래 기록 추가 오류:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data, error: null };
	} catch (err) {
		console.error('거래 기록 추가 중 예외 발생:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * 거래 기록 삭제
 */
export async function deleteTradingEntry(id: string): Promise<{
	success: boolean;
	error: Error | null;
}> {
	try {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: new Error('User not authenticated') };
		}

		const { error } = await supabase
			.from('financial_trading_entries')
			.delete()
			.eq('id', id)
			.eq('user_id', user.id);

		if (error) {
			console.error('거래 기록 삭제 오류:', error);
			return { success: false, error: new Error(error.message) };
		}

		return { success: true, error: null };
	} catch (err) {
		console.error('거래 기록 삭제 중 예외 발생:', err);
		return { success: false, error: err as Error };
	}
}

/**
 * 거래 기록 수정
 */
export async function updateTradingEntry(
	id: string,
	updates: Partial<Omit<TradingEntry, 'id' | 'created_at' | 'updated_at'>>
): Promise<{
	data: TradingEntry | null;
	error: Error | null;
}> {
	try {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			return { data: null, error: new Error('User not authenticated') };
		}

		const { data, error } = await supabase
			.from('financial_trading_entries')
			.update(updates)
			.eq('id', id)
			.eq('user_id', user.id)
			.select()
			.single();

		if (error) {
			console.error('거래 기록 수정 오류:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data, error: null };
	} catch (err) {
		console.error('거래 기록 수정 중 예외 발생:', err);
		return { data: null, error: err as Error };
	}
}
