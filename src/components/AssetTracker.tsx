import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type { AssetData, AssetResults } from '../interfaces/AssetInterfaces';


const API_URL = 'https://finasset.yanlongzhu.space'

const initialAssetData: AssetData = {
    gold_g: 0,
    gold_oz: 0,

    retirement_funds_cny: 0,
    savings_cny: 0,
    funds_cny: 0,
    housing_fund_cny: 0,

    funds_sgd: 0,
    savings_sgd: 0,

    funds_eur: 0,
    savings_eur: 0,

    funds_hkd: 0,
    savings_hkd: 0,

    btc: 0,
    btc_stock_usd: 0,

    deposit_gbp: 0,

    savings_usd: 0,
    stock_usd: 0
}

interface FormField {
    name: keyof AssetData;
    label: string;
    step: string;
}

const formFields: FormField[] = [
    { name: 'gold_g', label: '黄金(g)', step: '0.01' },
    { name: 'gold_oz', label: '黄金(oz)', step: '0.01' },
    { name: 'retirement_funds_cny', label: '养老基金(人民币/元)', step: '0.01' },
    { name: 'housing_fund_cny', label: '公积金(人民币/元)', step: '0.01' },
    { name: 'savings_cny', label: '储蓄(人民币/元)', step: '0.01' },
    { name: 'funds_cny', label: '基金(人民币/元)', step: '0.01' },
    { name: 'funds_sgd', label: '基金(新加坡元/元)', step: '0.01' },
    { name: 'savings_sgd', label: '储蓄(新加坡元/元)', step: '0.01' },
    { name: 'funds_eur', label: '基金(欧元/元)', step: '0.01' },
    { name: 'savings_eur', label: '储蓄(欧元/元)', step: '0.01' },
    { name: 'funds_hkd', label: '基金(港元/元)', step: '0.01' },
    { name: 'savings_hkd', label: '储蓄(港元/元)', step: '0.01' },
    { name: 'deposit_gbp', label: '存款(英镑/元)', step: '0.01' },
    { name: 'btc', label: '比特币(个)', step: '0.00000001' },
    { name: 'btc_stock_usd', label: '比特币股票(美元/元)', step: '0.01' },
    { name: 'stock_usd', label: '股票(英镑/元)', step: '0.01' },
    { name: 'savings_usd', label: '储蓄(美元/元)', step: '0.01' },
]

const AssetTracker = () => {
    const [assetData, setAssetData] = useState<AssetData>(initialAssetData);
    const [results, setResults] = useState<AssetResults | null>(null);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await fetch(API_URL)

                if (response.status == 404) {
                    setAssetData(initialAssetData);
                    setResults(null);
                    setError(null);
                    return;
                }   

                if (!response.ok) {
                    throw new Error(`Failed to load data: ${response.status}`)
                }

                const initialSnapshot = await response.json();

                const dataToForm: Partial<AssetData> = {};
                for (const key in initialAssetData) {
                    if (initialSnapshot.hasOwnProperty(key)) {
                        dataToForm[key as keyof AssetData] = initialSnapshot[key];
                    }
                }
                setAssetData({ ...initialAssetData, ...dataToForm as AssetData });
            } catch (err) {
                setError(`无法加载初始数据: ${err instanceof Error ? err.message: '连接错误'}`);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setAssetData(prevData => ({
            ...prevData,
            [name as keyof AssetData]: parseFloat(value) || 0,
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await fetch(API_URL + '/update_assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail ? errorBody.detail[0].msg: `HTTP error! status: ${response.status}`);
            }

            const resultData = await response.json() as AssetResults;
            setResults(resultData);
        } catch (err) {
            setError(`计算失败: ${err instanceof Error ? err.message: '未知错误'}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClearData = async() => {
        if(!window.confirm('确定要清除所有数据吗?')) return

        try {
            const response = await fetch(API_URL + '/clear')
            const data = await response.json();

            if (data.message) {
                alert('数据已清除。');
                setAssetData(initialAssetData);
                setResults(null);
            } else {
                alert('清除数据失败.')
            }
        } catch (err) {
            alert('发生错误: 无法连接到清除API.')
        }
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', margin: '40px' }}>
            <h1>资产统计器</h1>

            {loading && <h2>加载中...请稍后</h2>}

            {!loading && (
                <>
                    <button onClick={handleClearData} style={{ padding: '10px 20px', marginBottom: '20px' }}>
                        清除所有数据
                    </button>

                    {error && <p style={{ color: 'red', fontWidth: 'bold'}}>错误: {error}</p>}

                    <form onSubmit={handleSubmit} id="assetForm">
                        {formFields.map(field => (
                            <div className="form-group" key={field.name} style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'inline-block', width: '20px' }}>{field.label}</label>
                                <input
                                    type="number"
                                    step={field.step}
                                    name={field.name}
                                    value={assetData[field.name]}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        ))}

                        <button type="submit" disabled={loading} style={{padding: '10px 20px', marginTop: '10px'}}>
                            {loading ? '计算中...' : '计算总资产'}
                        </button>
                    </form>

                    { results && (
                        <div className="result" style={{ marginTop: '20px', fontWeight: 'bold' }}>
                            <h2>计算结果(美元)</h2>
                            <p>可用流动性: {results.total_savings_usd ? parseFloat(results.total_savings_usd as unknown as string).toFixed(2) : '0.00'}</p>
                            <p>可用流动性占总资产比例: {results.available_liquidity_ratio? results.available_liquidity_ratio : 0 }</p>
                            <p>黄金占总资产比例: {results.gold_ratio ? results.gold_ratio: 0}</p>
                            <p>比特币占总资产比例: {results.btc_ratio ? results.btc_ratio: 0}</p>
                            <h3>总资产: {results.total_assets_usd ? results.total_assets_usd: 0}</h3>

                            {results.report_path && (
                                <div className="download-section">
                                    <a href={`{API_URL}/download_report/${results.report_path.split('/').pop()}`} target="_blank" rel="noopener noreferrer">
                                        Download Report
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default AssetTracker;