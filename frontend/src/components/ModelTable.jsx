import { formatGb, formatNumber, fitLabel, runModeLabel, runtimeLabel, useCaseLabel } from '../labels';

function FitBadge({ value }) {
  const key = String(value || '').toLowerCase().replaceAll(' ', '_');
  return <span className={`fit-badge fit-${key}`}>{fitLabel(value)}</span>;
}

export default function ModelTable({ models, onSelect }) {
  if (!models.length) return <div className="empty-state"><span>◌</span><h3>没有匹配的模型</h3><p>尝试放宽适配等级或更换搜索条件。</p></div>;
  return (
    <div className="table-wrap">
      <table className="model-table">
        <thead><tr><th>模型</th><th>适配</th><th>评分</th><th>预计速度</th><th>量化</th><th>运行模式</th><th>内存需求</th><th>可用上下文</th></tr></thead>
        <tbody>{models.map((model) => <tr key={model.name} onClick={() => onSelect(model)} tabIndex="0" onKeyDown={(event) => event.key === 'Enter' && onSelect(model)}>
          <td><div className="model-name"><strong>{model.name}</strong><span>{model.provider || '未知提供商'} · {useCaseLabel(model.use_case || model.category)}{model.installed ? ' · 已安装' : ''}</span></div></td>
          <td><FitBadge value={model.fit_level || model.fit_label} /></td>
          <td><strong className="score">{formatNumber(model.score)}</strong></td>
          <td>{formatNumber(model.measured_tps ?? model.estimated_tps)} <small>tok/s</small></td>
          <td>{model.best_quant || '—'}</td>
          <td><span className="runtime">{runModeLabel(model.run_mode || model.run_mode_label)}</span><small>{runtimeLabel(model.runtime)}</small></td>
          <td>{formatGb(model.memory_required_gb ?? model.total_memory_gb)}</td>
          <td>{model.usable_context ? `${Math.round(model.usable_context).toLocaleString()}` : '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
