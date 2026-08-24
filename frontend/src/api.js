export const DEFAULT_FILTERS = {
  search: '',
  minFit: 'good',
  runtime: 'any',
  useCase: 'all',
  sort: 'score',
  limit: '50',
};

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.minFit === 'all') {
    params.set('min_fit', 'too_tight');
    params.set('include_too_tight', 'true');
  } else {
    params.set('min_fit', filters.minFit || 'good');
    params.set('include_too_tight', 'false');
  }
  if (filters.runtime && filters.runtime !== 'any') params.set('runtime', filters.runtime);
  if (filters.useCase && filters.useCase !== 'all') params.set('use_case', filters.useCase);
  if (filters.sort) params.set('sort', filters.sort);
  params.set('limit', String(filters.limit || 50));
  return params.toString();
}

async function getJson(path, signal) {
  const response = await fetch(path, { signal });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('服务返回了无效数据。');
  }
  if (!response.ok) {
    throw new Error(payload?.error || `请求失败（${response.status}）。`);
  }
  return payload;
}

export function fetchSystem(signal) {
  return getJson('/api/v1/system', signal);
}

export function fetchModels(filters, signal) {
  return getJson(`/api/v1/models?${buildQuery(filters)}`, signal);
}

export function fetchStatus(signal) {
  return getJson('/api/app/status', signal);
}

export { buildQuery };
