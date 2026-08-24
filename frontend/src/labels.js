export const FIT_LABELS = {
  Perfect: '完美适配',
  perfect: '完美适配',
  Good: '良好适配',
  good: '良好适配',
  Marginal: '勉强适配',
  marginal: '勉强适配',
  TooTight: '内存紧张',
  too_tight: '内存紧张',
};

export const RUN_MODE_LABELS = {
  GPU: 'GPU 推理',
  gpu: 'GPU 推理',
  CPU: 'CPU 推理',
  cpu: 'CPU 推理',
  'CPU + GPU': 'CPU + GPU',
  cpu_offload: 'CPU 卸载',
};

export const RUNTIME_LABELS = {
  llamacpp: 'llama.cpp',
  mlx: 'MLX',
  vllm: 'vLLM',
  ollama: 'Ollama',
};

export const USE_CASE_LABELS = {
  general: '通用',
  coding: '编程',
  reasoning: '推理',
  chat: '对话',
  multimodal: '多模态',
  embedding: '向量嵌入',
};

export function fitLabel(value) {
  return FIT_LABELS[value] || value || '未知';
}

export function runModeLabel(value) {
  return RUN_MODE_LABELS[value] || value || '未知';
}

export function runtimeLabel(value) {
  return RUNTIME_LABELS[value] || value || '未知';
}

export function useCaseLabel(value) {
  return USE_CASE_LABELS[value] || value || '未分类';
}

export function formatNumber(value, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

export function formatGb(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)} GB` : '—';
}
