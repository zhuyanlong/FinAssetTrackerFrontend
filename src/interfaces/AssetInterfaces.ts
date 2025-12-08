export interface AssetData {
    gold_g: number;
    gold_oz: number;

    retirement_funds_cny: number;
    savings_cny: number;
    funds_cny: number;
    housing_fund_cny: number;

    funds_sgd: number;
    savings_sgd: number;

    funds_eur: number;
    savings_eur: number;

    funds_hkd: number;
    savings_hkd: number;

    btc: number;
    btc_stock_usd: number;

    deposit_gbp: number;

    savings_usd: number;
    stock_usd: number;
}

export interface AssetResults {
    total_assets_usd: number;
    total_savings_usd: number;
    available_liquidity_ratio: number;
    gold_ratio: number;
    btc_ratio: number;
    weighted_risk_score: number;
    speculative_ratio: number;
    report_path?: string;
    message?: string;
}