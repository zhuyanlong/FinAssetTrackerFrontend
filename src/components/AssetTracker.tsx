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

interface SimulationAction {
    field: keyof AssetData;
    delta: number;
}

interface SimulationResponse {
    original: AssetResults;
    simulated: AssetResults;
    diff_summary: {
        total_assets: string;
        risk_score: string;
        liquidity: string;
        // btc_ratio: string;
        agent_verdict: string;
        agent_advice: string;
    }
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
    { name: 'stock_usd', label: '股票(美元/元)', step: '0.01' },
    { name: 'savings_usd', label: '储蓄(美元/元)', step: '0.01' },
]

const AssetTracker = () => {
    const [assetData, setAssetData] = useState<AssetData>(initialAssetData);
    const [results, setResults] = useState<AssetResults | null>(null);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [simActions, setSimActions] = useState<SimulationAction[]>([]);
    const [currentSimAction, setCurrentSimAction] = useState<SimulationAction>({field: 'savings_cny', delta: 0});
    const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
    const [simLoading, setSimLoading] = useState<boolean>(false);

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

    const addSimAction = () => {
        if (currentSimAction.delta === 0) return;
        setSimActions([...simActions, { ...currentSimAction }]);
        setCurrentSimAction({ ...currentSimAction, delta: 0 });
    };

    const removeSimAction = (index: number) => {
        setSimActions(simActions.filter((_, i) => i !== index));
    };

    const handleRunSimulation = async () => {
        if (simActions.length === 0) return;
        setSimLoading(true);
        setError(null);

        try {
            const response = await fetch(API_URL + '/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actions: simActions,
                    notes: "User Sandbox Decision"
                }),
            });

            if (!response.ok) throw new Error('模型请求失败');
            const data = await response.json() as SimulationResponse;
            setSimResult(data);
        } catch (err) {
            setError(`模拟失败 ${err instanceof Error ? err.message : '未知错误'}`)
        } finally {
            setSimLoading(false);
        }
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', margin: '40px', maxWidth: '800px' }}>
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
                            <div className="form-group" key={field.name} style={{ 
                                marginBottom: '15px', 
                                display: 'flex',
                                alignItems: 'center',
                                maxWidth: '500px'
                            }}>
                                <label style={{ 
                                    width: '180px',
                                    marginRight: '10px',
                                    textAlign: 'right'
                                }}>{field.label}</label>
                                <input
                                    type="number"
                                    step={field.step}
                                    name={field.name}
                                    value={assetData[field.name]}
                                    onChange={handleInputChange}
                                    required
                                    style={{
                                        flex: 1,
                                        padding: '5px'
                                    }}
                                />
                            </div>
                        ))}

                        <button type="submit" disabled={loading} style={{padding: '10px 20px', marginTop: '10px'}}>
                            {loading ? '计算中...' : '计算总资产'}
                        </button>
                    </form>

                    <hr style={{ margin: '40px 0' }} />
                    <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h2>决策模拟沙盒</h2>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            模拟资金变动情况
                        </p>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <select
                                value={currentSimAction.field}
                                onChange={(e) => setCurrentSimAction({...currentSimAction, field: e.target.value as keyof AssetData})}
                                style={{ padding: '8px' }}
                            >
                                {formFields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                            </select>
                            <input
                                type="number"
                                placeholder="变化量(可为负)"
                                value={currentSimAction.delta}
                                onChange={(e) => setCurrentSimAction({...currentSimAction, delta: parseFloat(e.target.value) || 0})}
                                style={{ padding: '8px' }}
                            />
                            <button onClick={addSimAction} style={{ backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 15px' }}>
                                添加动作
                            </button>
                        </div>

                        {simActions.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4>待执行变更:</h4>
                                <ul>
                                    {simActions.map((action, idx) => (
                                        <li key={idx}>
                                            {formFields.find(f => f.name === action.field)?.label}:
                                            <span style={{ color: action.delta >= 0 ? 'green': 'red', fontWeight: 'bold' }}>
                                                {action.delta >= 0 ? `+${action.delta}`: action.delta}
                                            </span>
                                            <button onClick={() => removeSimAction(idx)} style={{ marginLeft: '10px', cursor: 'pointer' }}>删除</button>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={handleRunSimulation}
                                    disabled={simLoading}
                                    style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '4px', fontWeight: 'bold' }}
                                >
                                    {simLoading ? '分析中...' : '开始模拟'}
                                </button>
                                <button onClick={() => {setSimActions([]); setSimResult(null);}} style={{ marginLeft: '10px' }}>重置沙盒</button>
                            </div>
                        )}

                        {simResult && (
                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff', borderLeft: '5px solid #4CAF50' }}>
                                <h3 style={{ color: '#2e7d32' }}>模拟分析结果</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <p>结论: <strong>{simResult.diff_summary.agent_verdict.toUpperCase()}</strong></p>
                                        <p>总资产变动: {simResult.diff_summary.total_assets}</p>
                                        <p>风险分变动: {simResult.diff_summary.risk_score}</p>
                                        <p>流动性变动: {simResult.diff_summary.liquidity}</p>
                                    </div>
                                    <div style={{ backgroundColor: '#f0f4f0', padding: '10px', borderRadius: '4px' }}>
                                        <p><strong>AI 决策建议:</strong></p>
                                        <p style={{ fontSize: '14px', fontStyle: 'italic' }}>{simResult.diff_summary.agent_advice}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    { results && (
                        <div className="result" style={{ marginTop: '20px', fontWeight: 'bold' }}>
                            <h2>计算结果(美元)</h2>
                            <p>可用流动性: {results.total_savings_usd ? parseFloat(results.total_savings_usd as unknown as string).toFixed(2) : '0.00' }</p>
                            <p>可用流动性占总资产比例: {results.available_liquidity_ratio ? parseFloat(results.available_liquidity_ratio as unknown as string).toFixed(2) : '0.00' }</p>
                            <p>黄金占总资产比例: {results.gold_ratio ? parseFloat(results.gold_ratio as unknown as string).toFixed(2): '0.00' }</p>
                            <p>比特币占总资产比例: {results.btc_ratio ? parseFloat(results.btc_ratio as unknown as string).toFixed(2): '0.00'}</p>
                            <p>整体风险分: {results.weighted_risk_score ? parseFloat(results.weighted_risk_score as unknown as string).toFixed(2): '0.00'}</p>
                            <p>投机/高波动资产占比: {results.speculative_ratio ? parseFloat(results.speculative_ratio as unknown as string).toFixed(2): '0.00'}</p>
                            <p>大模型建议: {results.message ? results.message : '大模型错误'}</p>
                            <h3>总资产: {results.total_assets_usd ? parseFloat(results.total_assets_usd as unknown as string).toFixed(2): '0.00'}</h3>

                            {results.report_path && (
                                <div className="download-section">
                                    <a href={`${API_URL}/download_report/${results.report_path.split('/').pop()}`} target="_blank" rel="noopener noreferrer">
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