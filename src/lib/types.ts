// 기존 타입 정의
export interface FinancialPrice {
	id: string;
	asset_type: string;
	symbol: string;
	name: string;
	price: number;
	currency: string;
	change_24h?: number;
	change_percent?: number;
	high_24h?: number;
	low_24h?: number;
	open_24h?: number;
	volume_24h?: number;
	market_cap?: number;
	created_at: string;
	updated_at: string;
}

export interface TradingEntry {
	id: string;
	user_id: string;
	date: string;
	symbol: string;
	action: 'buy' | 'sell';
	quantity: number;
	price: number;
	amount: number;
	notes?: string;
	tags?: string[];
	created_at: string;
	updated_at: string;
}

export interface TradingStats {
	totalTrades: number;
	winRate: number;
	totalProfit: number;
	totalLoss: number;
	netProfit: number;
	avgProfit: number;
	avgLoss: number;
	profitFactor: number;
}

export interface CorrelationMatrix {
	symbols: string[];
	matrix: number[][];
}

export interface MarketInsight {
	type: 'strong_positive' | 'strong_negative' | 'independent';
	asset1: string;
	asset2: string;
	correlation: number;
	description: string;
}

export interface AssetComparison {
	symbol: string;
	name: string;
	data: number[];
	dates: string[];
	normalizedData: number[];
}

// 캔들차트용 타입 추가
export interface CandleData {
	time: string | number; // ISO string 또는 Unix timestamp
	open: number;
	high: number;
	low: number;
	close: number;
	volume?: number;
}

export interface RealtimeCandleData {
	id: string;
	symbol: string;
	timeframe: string;
	timestamp: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume?: number;
	created_at: string;
	updated_at: string;
}
