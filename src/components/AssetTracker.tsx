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

type ActionType = 'ADJUST' | 'TRANSFER';

interface SimulationAction {
    type: ActionType;
    from_field: keyof AssetData;
    to_field?: keyof AssetData;
    amount: number;
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
        logs?: string[];
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

    const [simMode, setSimMode] = useState<ActionType>('ADJUST');
    const [simFromField, setSimFromField] = useState<keyof AssetData>('savings_cny');
    const [simToField, setSimToField] = useState<keyof AssetData>('savings_usd');
    const [simAmountInput, setSimAmountInput] = useState<string>("");

    const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
    const [simLoading, setSimLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await fetch(API_URL)

                if (response.status == 404) {
                    setAssetData(initialAssetData);
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
        } finally {
            setLoading(false);
        }
    };

    const handleClearData = async() => {
        if(!window.confirm('确定要清除所有数据吗?')) return

        try {
            await fetch(API_URL + '/clear');
            alert('数据已清除');
            setAssetData(initialAssetData);
            setResults(null);
        } catch (err) {
            alert('发生错误: 无法连接到清除API.')
        }
    };

    const addSimAction = () => {
        const amount = parseFloat(simAmountInput);
        if (isNaN(amount) || amount === 0) return;

        const newAction: SimulationAction = {
            type: simMode,
            from_field: simFromField,
            amount: amount
        };

        if (simMode === 'TRANSFER') {
            newAction.to_field = simToField;
        }

        setSimActions([...simActions, newAction]);
        setSimAmountInput("");
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

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <label style={{ marginBottom: '15px', display: 'flex', gap: '20px' }}>
                                <input
                                    type="radio"
                                    name="simMode"
                                    checked={simMode === 'ADJUST'}
                                    onChange={() => setSimMode('ADJUST')}
                                />
                                收入/支出(单向)
                            </label>
                            <label style={{cursor: 'pointer'}}>
                                <input
                                    type="radio"
                                    name="simMode"
                                    checked={simMode === 'TRANSFER'}
                                    onChange={() => setSimMode('TRANSFER')}
                                />
                                资产互换
                            </label>
                        </div>

                        {/* 动态输入区域 */}
                        <div style={{display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap'}}>
                            {simMode === 'ADJUST' && (
                                <>
                                    <select
                                        value={simFromField}
                                        onChange={(e) => setSimFromField(e.target.value as keyof AssetData)}
                                        style={{ padding: '8px' }}
                                    >
                                        {formFields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="变动金额 (+/-)"
                                        value={simAmountInput}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || val === "-" || !isNaN(Number(val))) setSimAmountInput(val);
                                        }}
                                        style={{ padding: '8px', width: '120px' }}
                                    />
                                </>
                            )}

                            {simMode === 'TRANSFER' && (
                                <>
                                    <span>从</span>
                                    <select>
                                        {formFields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                                    </select>

                                    <span>转出</span>
                                    <input
                                        type="text"
                                        placeholder="数量"
                                        value={simAmountInput}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || val === "-" || !isNaN(Number(val))) setSimAmountInput(val);
                                        }}
                                        style={{ padding: '8px', width: '100px' }}
                                    />

                                    <span>换成</span>
                                    <select
                                        value={simToField}
                                        onChange={(e) => setSimToField(e.target.value as keyof AssetData)}
                                        style={{ padding: '8px' }}
                                    >
                                        {formFields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                                    </select>
                                </>
                            )}

                            <button onClick={addSimAction} style={{ backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 15px', cursor: 'pointer' }}>
                                添加动作
                            </button>

                        </div>
                        {/* 待执行列表 */}
                        {simActions.length > 0 && (
                            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '4px' }}>
                                <h4 style={{marginTop: 0}}>待执行变更:</h4>
                                <ul style={{ paddingLeft: '20px' }}>
                                    {simActions.map((action, idx) => {
                                        const fromLabel = formFields.find(f => f.name === action.from_field)?.label;

                                        let displayText = "";
                                        if (action.type === 'ADJUST') {
                                            const sign = action.amount >= 0 ? '+' : '';
                                            displayText = `${fromLabel}: ${sign}${action.amount}`;
                                        } else {
                                            const toLabel = formFields.find(f => f.name === action.to_field)?.label;
                                            displayText = `${fromLabel} (转出 ${action.amount}) 兑换为 ${toLabel}`
                                        }

                                        return (
                                            <li key={idx} style={{ marginBottom: '5px' }}>
                                                {displayText}
                                                <button onClick={() => removeSimAction(idx)} style={{ marginLeft: '10px', cursor: 'pointer', color: '#dc3545', border: 'none', background: 'none' }}>
                                                    [删除]
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={handleRunSimulation}
                                        disabled={simLoading}
                                        style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                    >
                                        {simLoading ? '分析中...' : '开始模拟'}
                                </button>
                                <button onClick={() => {setSimActions([]); setSimResult(null);}} style={{ padding: '10px', cursor: 'pointer' }}>重置沙盒</button>
                                </div>
                            </div>
                        )}

                        {simResult && (
                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff', borderLeft: '5px solid #4CAF50', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ color: '#2e7d32', marginTop: 0 }}>模拟分析结果</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                    <div>
                                        <p>结论: <strong>{simResult.diff_summary.agent_verdict.toUpperCase()}</strong></p>
                                        <p>总资产变动: {simResult.diff_summary.total_assets}</p>
                                        <p>风险分变动: {simResult.diff_summary.risk_score}</p>
                                        <p>流动性变动: {simResult.diff_summary.liquidity}</p>
                                    </div>
                                    <div style={{ backgroundColor: '#f0f4f0', padding: '10px', borderRadius: '4px' }}>
                                        <p style={{marginTop: 0}}><strong>AI 决策建议:</strong></p>
                                        <p style={{ fontSize: '14px', fontStyle: 'italic', lineHeight: '1.5' }}>{simResult.diff_summary.agent_advice}</p>
                                        {simResult.diff_summary.logs && (
                                            <div style={{ fontSize: '12px', color: '#666', borderTop: '1px dashed #ccc', marginTop: '10px', paddingTop: '5px' }}>
                                                <strong>交易日志:</strong>
                                                <ul style={{paddingLeft: '15px', margin: '5px 0'}}>
                                                    {simResult.diff_summary.logs.map((log, i) => <li key={i}>{log}</li>)}
                                                </ul>
                                            </div>
                                        )}
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