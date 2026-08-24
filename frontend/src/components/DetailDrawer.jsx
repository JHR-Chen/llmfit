import { formatGb, formatNumber, fitLabel, runtimeLabel, runModeLabel, useCaseLabel } from '../labels';

function Detail({ label, value }) { return <div className="detail-item"><span>{label}</span><strong>{value || '—'}</strong></div>; }

export default function DetailDrawer({ model, onClose }) {
  if (!model) return null;
  const parts = model.score_components || {};
  return <div className="drawer-backdrop" onClick={onClose}>
    <aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
      <button className="drawer-close" onClick={onClose} aria-label="关闭详情">×</button>
      <span className="overline">模型详情 · {fitLabel(model.fit_level || model.fit_label)}</span>
      <h2>{model.name}</h2><p className="muted">{model.provider || '未知提供商'} · {useCaseLabel(model.use_case || model.category)}</p>
      <div className="hero-score"><strong>{formatNumber(model.score)}</strong><span>综合评分</span><b>{formatNumber(model.measured_tps ?? model.estimated_tps)} tok/s</b></div>
      <div className="score-grid">{[['质量', parts.quality], ['速度', parts.speed], ['适配', parts.fit], ['上下文', parts.context]].map(([label, value]) => <div key={label}><span>{label}</span><i><em style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} /></i><b>{formatNumber(value)}</b></div>)}</div>
      <div className="detail-grid">
        <Detail label="最佳量化" value={model.best_quant} /><Detail label="运行模式" value={runModeLabel(model.run_mode || model.run_mode_label)} />
        <Detail label="运行时" value={runtimeLabel(model.runtime)} /><Detail label="许可证" value={model.license} />
        <Detail label="内存需求" value={formatGb(model.memory_required_gb ?? model.total_memory_gb)} /><Detail label="显存利用率" value={model.utilization_pct == null ? '—' : `${formatNumber(model.utilization_pct)}%`} />
        <Detail label="可用上下文" value={model.usable_context ? `${Math.round(model.usable_context).toLocaleString()} tokens` : '—'} /><Detail label="原生上下文" value={model.context_length ? `${Math.round(model.context_length).toLocaleString()} tokens` : '—'} />
      </div>
      <div className="detail-section"><h3>能力</h3><div className="tag-list">{(model.capabilities || []).length ? model.capabilities.map((item) => <span key={item}>{item}</span>) : <span className="muted">未提供</span>}</div></div>
      <div className="detail-section"><h3>官方备注</h3>{(model.notes || []).length ? <ul>{model.notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="muted">暂无备注</p>}</div>
    </aside>
  </div>;
}
