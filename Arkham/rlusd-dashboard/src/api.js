const API_KEY = import.meta.env.VITE_ARKHAM_API_KEY;

const headers = { 'API-Key': API_KEY };

const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function cachedFetch(key, fetcher) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;
  const data = await fetcher();
  cache.set(key, { data, time: Date.now() });
  return data;
}

async function fetchAPI(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) query.set(k, String(v));
  });
  const qs = query.toString();
  const url = `/api${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function getTokenInfo() {
  return cachedFetch('tokenInfo', () => fetchAPI('/intelligence/token/ripple-usd'));
}

export async function getEntityBalances(interval = '30d', limit = 20) {
  return cachedFetch(`entityBalances:${interval}:${limit}`, () =>
    fetchAPI('/intelligence/entity_balance_changes', {
      pricingIds: 'ripple-usd',
      orderBy: 'balanceUsd',
      orderDir: 'desc',
      limit,
      interval,
    })
  );
}

export async function getCounterparties(limit = 15) {
  return cachedFetch(`counterparties:${limit}`, () =>
    fetchAPI('/counterparties/entity/ripple', {
      limit,
      sortKey: 'usd',
      sortDir: 'desc',
    })
  );
}

export async function getEntityFlow(entity = 'ripple') {
  return cachedFetch(`entityFlow:${entity}`, () =>
    fetchAPI(`/flow/entity/${entity}`, { chains: 'ethereum' })
  );
}

export async function getEntitySummary(entity = 'ripple') {
  return cachedFetch(`entitySummary:${entity}`, () =>
    fetchAPI(`/intelligence/entity/${entity}/summary`)
  );
}

export async function searchToken(query) {
  return cachedFetch(`search:${query}`, () =>
    fetchAPI('/intelligence/search', { query })
  );
}
