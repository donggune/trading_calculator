export interface FinancialPrice {
	id: number;
	asset_type: string;
	symbol: string;
	name: string;
	currency: string;
	price: number;
	change: number | null;
	change_24h: number | null;
	change_percent: number | null;
	open: number | null;
	high: number | null;
	low: number | null;
	prev_close: number | null;
	volume: number | null;
	created_at: string;
	updated_at: string;
}

export interface ChartDataPoint {
	date: string;
	price: number;
}

// 매매일지 관련 타입들
export interface TradingEntry {
	id: string;
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

export interface TradingJournal {
	id: string;
	title: string;
	description?: string;
	entries: TradingEntry[];
	created_at: string;
	updated_at: string;
}

export interface TradingStats {
	totalTrades: number;
	winningTrades: number;
	losingTrades: number;
	winRate: number;
	totalProfit: number;
	totalLoss: number;
	netProfit: number;
	averageWin: number;
	averageLoss: number;
	profitFactor: number;
}

// 상관관계 분석 관련 타입들
export interface CorrelationData {
	asset1: string;
	asset2: string;
	correlation: number;
	pValue?: number;
}

export interface CorrelationMatrix {
	symbols: string[];
	matrix: number[][];
}

export interface AssetComparison {
	symbol: string;
	name: string;
	data: number[];
	dates: string[];
	normalizedData?: number[]; // 100 기준 정규화 데이터
}

export interface MarketInsight {
	type: 'correlation' | 'trend' | 'volatility';
	title: string;
	description: string;
	severity: 'high' | 'medium' | 'low';
	relatedAssets: string[];
}
