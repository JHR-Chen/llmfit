import { formatGb, formatNumber } from '../labels';

function Card({ eyebrow, title, icon, children, accent = 'blue' }) {
  return (
    <article className={`hardware-card accent-${accent}`}>
      <div className="card-heading"><span className="card-icon">{icon}</span><span>{eyebrow}</span></div>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function GpuList({ gpus }) {
  if (!gpus?.length) return <p className="muted">未检测到独立 GPU，将使用 CPU 模式。</p>;
  return (
    <div className="gpu-list">
      {gpus.map((gpu, index) => (
        <div className="gpu-row" key={`${gpu.name || 'gpu'}-${index}`}>
          <div><strong>{gpu.name || '未知 GPU'}</strong><span>{gpu.backend || '未知后端'} · {gpu.count || 1} 个设备</span></div>
          <b>{formatGb(gpu.vram_gb)}</b>
        </div>
      ))}
    </div>
  );
}

export default function HardwarePanel({ data }) {
  const system = data?.system || {};
  const total = Number(system.total_ram_gb) || 0;
  const available = Number(system.available_ram_gb) || 0;
  const usage = total > 0 ? Math.min(100, Math.max(0, ((total - available) / total) * 100)) : 0;
  return (
    <section className="hardware-grid" aria-label="硬件信息">
      <Card eyebrow="处理器" title={system.cpu_name || 'CPU 信息不可用'} icon="CPU" accent="blue">
        <div className="metric-line"><strong>{system.cpu_cores ?? '—'}</strong><span>逻辑核心</span></div>
        <p className="muted">推理后端：{system.backend || '未知'}</p>
      </Card>
      <Card eyebrow="系统内存" title={formatGb(total)} icon="RAM" accent="violet">
        <div className="metric-line"><strong>{formatGb(available)}</strong><span>当前可用</span></div>
        <div className="progress"><i style={{ width: `${usage}%` }} /></div>
        <p className="muted">已使用 {formatNumber(usage)}%</p>
      </Card>
      <Card eyebrow={`图形处理器 · ${system.gpu_count || 0} 个设备`} title={system.gpu_name || (system.has_gpu ? 'GPU 信息不完整' : 'CPU 模式')} icon="GPU" accent="cyan">
        <div className="metric-line"><strong>{formatGb(system.gpu_vram_gb)}</strong><span>主 GPU VRAM</span></div>
        <GpuList gpus={system.gpus} />
      </Card>
    </section>
  );
}
