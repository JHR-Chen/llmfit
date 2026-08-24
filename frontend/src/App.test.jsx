import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App.jsx';
import HardwarePanel from './components/HardwarePanel.jsx';

const system = { system: { cpu_name: 'Test CPU', cpu_cores: 8, backend: 'CUDA', total_ram_gb: 16, available_ram_gb: 8, gpu_count: 1, gpu_name: 'Test GPU', gpu_vram_gb: 8, has_gpu: true, gpus: [{ name: 'Test GPU', backend: 'CUDA', vram_gb: 8, count: 1 }] } };
const model = { name: 'Example/Model-7B', provider: 'Example', fit_level: 'good', score: 88.2, estimated_tps: 31.4, best_quant: 'Q4_K_M', run_mode: 'gpu', runtime: 'llamacpp', memory_required_gb: 5.2, usable_context: 8192, use_case: 'coding', score_components: { quality: 90, speed: 80, fit: 95, context: 85 }, capabilities: ['Tool Use'], notes: ['Test note'] };

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((path) => Promise.resolve({ ok: true, json: async () => path.includes('/system') ? system : path.includes('/status') ? { status: 'ready' } : { models: [model], returned_models: 1, total_models: 1 } })));
});

afterEach(() => vi.unstubAllGlobals());

test('renders hardware and model data, then opens details', async () => {
  render(<App />);
  expect(await screen.findByText('Test CPU')).toBeInTheDocument();
  expect(screen.getByText('Example/Model-7B')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Example/Model-7B'));
  expect(await screen.findByText('模型详情 · 良好适配')).toBeInTheDocument();
});

test('shows empty results without crashing', async () => {
  vi.stubGlobal('fetch', vi.fn((path) => Promise.resolve({ ok: true, json: async () => path.includes('/system') ? system : path.includes('/status') ? { status: 'ready' } : { models: [], returned_models: 0, total_models: 0 } })));
  render(<App />);
  expect(await screen.findByText('没有匹配的模型')).toBeInTheDocument();
});

test('renders CPU mode when no GPU is reported', () => {
  render(<HardwarePanel data={{ system: { cpu_name: 'CPU only', cpu_cores: 4, total_ram_gb: 8, available_ram_gb: 4, has_gpu: false, gpu_count: 0, gpus: [] } }} />);
  expect(screen.getByText('CPU 模式')).toBeInTheDocument();
  expect(screen.getByText(/未检测到独立 GPU/)).toBeInTheDocument();
});
