export interface FinancialPrice {
	id: number;
	asset_type: string;
	symbol: string;
	name: string;
	currency: string;
	price: number;
	change: number | null;
	change_percent: number | null;
	open: number | null;
	high: number | null;
	low: number | null;
	prev_close: number | null;
	volume: number | null;
	updated_at: string;
}

export interface ChartDataPoint {
	date: string;
	price: number;
}
