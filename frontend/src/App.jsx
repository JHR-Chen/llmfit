import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_FILTERS, fetchModels, fetchStatus, fetchSystem } from './api';
import { formatNumber } from './labels';
import HardwarePanel from './components/HardwarePanel';
import FilterBar from './components/FilterBar';
import ModelTable from './components/ModelTable';
import DetailDrawer from './components/DetailDrawer';
import StatusPanel from './components/StatusPanel';

export default function App() {
  const [system, setSystem] = useState(null);
  const [models, setModels] = useState([]);
  const [summary, setSummary] = useState({ returned: 0, total: 0 });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestRef = useRef(null);

  const refresh = useCallback(async (nextFilters = filters) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true); setError(null);
    try {
      const [status, hardware, modelResponse] = await Promise.all([fetchStatus(controller.signal), fetchSystem(controller.signal), fetchModels(nextFilters, controller.signal)]);
      if (status.status === 'error') throw new Error(status.message || '本地服务启动失败。');
      setSystem(hardware); setModels(modelResponse.models || []); setSummary({ returned: modelResponse.returned_models ?? modelResponse.models?.length ?? 0, total: modelResponse.total_models ?? 0 }); setLastUpdated(new Date());
    } catch (caught) {
      if (caught.name !== 'AbortError') setError(caught.message || '加载失败。');
    } finally { setBusy(false); }
  }, [filters]);

  useEffect(() => { refresh(); return () => requestRef.current?.abort(); }, []);
  useEffect(() => { const timer = setTimeout(() => refresh(filters), 280); return () => clearTimeout(timer); }, [filters.search, filters.minFit, filters.runtime, filters.useCase, filters.sort]);

  if (error && !system) return <main className="app-shell"><Header busy={busy} onRefresh={() => refresh()} lastUpdated={lastUpdated} /><StatusPanel title="无法连接本机服务" message={error} onAction={() => refresh()} /></main>;
  return <main className="app-shell">
    <Header busy={busy} onRefresh={() => refresh()} lastUpdated={lastUpdated} />
    {error && <div className="inline-error">{error}<button onClick={() => refresh()}>重试</button></div>}
    <HardwarePanel data={system} />
    <section className="models-section">
      <div className="section-heading"><div><span className="overline">FIT EXPLORER</span><h2>适合你的模型</h2><p>{summary.returned ? `显示 ${summary.returned} / ${summary.total || summary.returned} 个结果` : '正在读取模型适配结果…'}</p></div><div className="section-stat"><strong>{system?.system?.backend || '—'}</strong><span>推理后端</span></div></div>
      <FilterBar filters={filters} onChange={setFilters} onRefresh={() => refresh()} busy={busy} />
      {busy && !models.length ? <div className="loading-state"><span className="spinner" />正在计算模型适配度…</div> : <ModelTable models={models} onSelect={setSelected} />}
    </section>
    <footer>数据由本机官方 llmfit 提供 · 仅供本地推理规划参考</footer>
    <DetailDrawer model={selected} onClose={() => setSelected(null)} />
  </main>;
}

function Header({ busy, onRefresh, lastUpdated }) {
  return <header className="topbar"><div className="brand"><div className="brand-mark">λ</div><div><h1>LLMFit</h1><span>硬件适配中心</span></div></div><div className="top-actions"><span className="live-status"><i />本机服务在线</span><span className="updated">{lastUpdated ? `更新于 ${lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '准备加载'}</span><button className="button button-primary" onClick={onRefresh} disabled={busy}>{busy ? '读取中…' : '刷新硬件'}</button></div></header>;
}
