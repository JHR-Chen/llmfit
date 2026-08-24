import { USE_CASE_LABELS } from '../labels';

export default function FilterBar({ filters, onChange, onRefresh, busy }) {
  const set = (key) => (event) => onChange({ ...filters, [key]: event.target.value });
  return (
    <div className="filter-bar">
      <label className="search-box"><span>⌕</span><input value={filters.search} onChange={set('search')} placeholder="搜索模型或提供商" /></label>
      <select value={filters.minFit} onChange={set('minFit')} aria-label="适配等级">
        <option value="good">良好及以上</option><option value="perfect">仅完美</option><option value="marginal">包含勉强</option><option value="all">全部结果</option>
      </select>
      <select value={filters.useCase} onChange={set('useCase')} aria-label="用途">
        <option value="all">全部用途</option>{Object.entries(USE_CASE_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select>
      <select value={filters.runtime} onChange={set('runtime')} aria-label="运行时">
        <option value="any">全部运行时</option><option value="llamacpp">llama.cpp</option><option value="mlx">MLX</option><option value="vllm">vLLM</option>
      </select>
      <select value={filters.sort} onChange={set('sort')} aria-label="排序">
        <option value="score">综合评分</option><option value="tps">预计速度</option><option value="params">参数量</option><option value="mem">内存占用</option><option value="ctx">上下文</option>
      </select>
      <button className="button button-ghost" onClick={onRefresh} disabled={busy}>{busy ? '刷新中…' : '刷新'}</button>
    </div>
  );
}
