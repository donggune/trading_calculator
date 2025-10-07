import { sampleCorrelation } from 'simple-statistics';
import type { FinancialPrice, CorrelationMatrix, MarketInsight } from '$lib/types';

/**
 * 두 자산 간의 상관계수를 계산합니다.
 * @param prices1 첫 번째 자산의 가격 배열
 * @param prices2 두 번째 자산의 가격 배열
 * @returns 상관계수 (-1 ~ 1)
 */
export function calculateCorrelation(prices1: number[], prices2: number[]): number {
	// 데이터 길이가 같고 최소 2개 이상이어야 함
	if (prices1.length !== prices2.length || prices1.length < 2) {
		return 0;
	}

	try {
		return sampleCorrelation(prices1, prices2);
	} catch (error) {
		console.error('상관계수 계산 오류:', error);
		return 0;
	}
}

/**
 * 일일 변화율을 계산합니다.
 * @param prices 가격 배열
 * @returns 일일 변화율 배열 (%)
 */
export function calculateDailyReturns(prices: number[]): number[] {
	if (prices.length < 2) return [];

	const returns: number[] = [];
	for (let i = 1; i < prices.length; i++) {
		const prevPrice = prices[i - 1];
		const currentPrice = prices[i];
		if (prevPrice !== 0) {
			const returnValue = ((currentPrice - prevPrice) / prevPrice) * 100;
			returns.push(returnValue);
		}
	}
	return returns;
}

/**
 * 여러 자산 간의 상관관계 행렬을 생성합니다.
 * @param historicalData 심볼별 히스토리 데이터
 * @returns 상관관계 행렬
 */
export function createCorrelationMatrix(historicalData: {
	[key: string]: FinancialPrice[];
}): CorrelationMatrix {
	const symbols = Object.keys(historicalData).filter((symbol) => {
		return historicalData[symbol] && historicalData[symbol].length >= 2;
	});

	const matrix: number[][] = [];

	for (let i = 0; i < symbols.length; i++) {
		const row: number[] = [];
		const data1 = historicalData[symbols[i]].map((d) => Number(d.price));

		for (let j = 0; j < symbols.length; j++) {
			if (i === j) {
				row.push(1); // 자기 자신과의 상관계수는 1
			} else {
				const data2 = historicalData[symbols[j]].map((d) => Number(d.price));
				const correlation = calculateCorrelation(data1, data2);
				row.push(correlation);
			}
		}
		matrix.push(row);
	}

	return { symbols, matrix };
}

/**
 * 데이터를 100 기준으로 정규화합니다.
 * @param prices 가격 배열
 * @returns 정규화된 배열 (첫 값을 100으로)
 */
export function normalizeData(prices: number[]): number[] {
	if (prices.length === 0 || prices[0] === 0) return [];

	const baseValue = prices[0];
	return prices.map((price) => (price / baseValue) * 100);
}

/**
 * 상관관계 행렬에서 인사이트를 추출합니다.
 * @param correlationMatrix 상관관계 행렬
 * @returns 인사이트 배열
 */
export function extractInsights(correlationMatrix: CorrelationMatrix): MarketInsight[] {
	const insights: MarketInsight[] = [];
	const { symbols, matrix } = correlationMatrix;

	// 강한 상관관계 찾기 (|r| > 0.7)
	for (let i = 0; i < symbols.length; i++) {
		for (let j = i + 1; j < symbols.length; j++) {
			const correlation = matrix[i][j];

			if (Math.abs(correlation) > 0.7) {
				const isPositive = correlation > 0;
				insights.push({
					type: 'correlation',
					title: isPositive ? '강한 양의 상관관계' : '강한 음의 상관관계',
					description: `${symbols[i]}와 ${symbols[j]}는 ${Math.abs(correlation).toFixed(2)}의 ${isPositive ? '양의' : '음의'} 상관관계를 보입니다.`,
					severity: Math.abs(correlation) > 0.85 ? 'high' : 'medium',
					relatedAssets: [symbols[i], symbols[j]]
				});
			}
		}
	}

	// 중간 역상관 찾기 (-0.7 < r < -0.4)
	for (let i = 0; i < symbols.length; i++) {
		for (let j = i + 1; j < symbols.length; j++) {
			const correlation = matrix[i][j];

			if (correlation < -0.4 && correlation > -0.7) {
				insights.push({
					type: 'correlation',
					title: '중간 역상관 관계',
					description: `${symbols[i]}와 ${symbols[j]}는 ${correlation.toFixed(2)}의 역상관 관계를 보입니다.`,
					severity: 'low',
					relatedAssets: [symbols[i], symbols[j]]
				});
			}
		}
	}

	// 중복 제거 및 상위 10개만 반환
	return insights.slice(0, 10);
}

/**
 * 상관계수 값을 색상으로 변환합니다.
 * @param correlation 상관계수 (-1 ~ 1)
 * @returns RGB 색상 문자열
 */
export function correlationToColor(correlation: number): string {
	// -1 (파란색) ~ 0 (흰색) ~ 1 (빨간색)
	const absCorr = Math.abs(correlation);
	const alpha = 0.2 + absCorr * 0.6; // 투명도 조절

	if (correlation > 0) {
		// 양의 상관: 빨간색
		return `rgba(239, 68, 68, ${alpha})`;
	} else if (correlation < 0) {
		// 음의 상관: 파란색
		return `rgba(59, 130, 246, ${alpha})`;
	} else {
		// 무상관: 회색
		return `rgba(156, 163, 175, 0.3)`;
	}
}

/**
 * 변동성(표준편차)을 계산합니다.
 * @param prices 가격 배열
 * @returns 표준편차
 */
export function calculateVolatility(prices: number[]): number {
	if (prices.length < 2) return 0;

	const returns = calculateDailyReturns(prices);
	const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
	const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
	const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / returns.length;

	return Math.sqrt(variance);
}
