export const TYPE_COLORS = {
  cex: '#06b6d4',
  dex: '#a855f7',
  'lending-decentralized': '#f59e0b',
  misc: '#3b82f6',
  fund: '#22c55e',
};

export const DEFAULT_COLOR = '#6366f1';

export function getColor(type) {
  return TYPE_COLORS[type] || DEFAULT_COLOR;
}

export function fmtUsd(n) {
  if (n == null || isNaN(n)) return '--';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtNum(n) {
  if (n == null || isNaN(n)) return '--';
  return n.toLocaleString('en-US');
}

export function truncateLabel(name, maxChars = 14) {
  if (!name) return '';
  if (name.length <= maxChars) return name;
  return name.slice(0, maxChars - 1) + '\u2026';
}

export function shortenAddr(addr) {
  if (!addr || addr.length < 12) return addr || 'Unknown';
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

export function getName(cp) {
  if (cp.address?.arkhamEntity?.name) return cp.address.arkhamEntity.name;
  if (cp.address?.arkhamLabel?.name) return cp.address.arkhamLabel.name;
  const addr = cp.address?.address || '';
  if (addr.length > 12) return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  return addr || 'Unknown';
}

export function getEntityType(cp) {
  return cp.address?.arkhamEntity?.type || cp.address?.arkhamLabel?.type || 'misc';
}

export const FLOW_STYLES = {
  in: { bg: 'bg-green-400/10', text: 'text-green-400', label: 'IN', color: '#22c55e' },
  out: { bg: 'bg-red-400/10', text: 'text-red-400', label: 'OUT', color: '#ef4444' },
  all: { bg: 'bg-blue-400/10', text: 'text-blue-400', label: 'ALL', color: '#3b82f6' },
};

export const TYPE_CONFIG = {
  cex: { label: 'CEX', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  dex: { label: 'DEX', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  'lending-decentralized': { label: 'Lending', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  fund: { label: 'Fund', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  misc: { label: 'Misc', bg: 'bg-blue-500/15', text: 'text-blue-400' },
};

// Merge holders + counterparties into a unified entities array
export function mergeEntities(holders = [], counterparties = null, totalHeld = 0) {
  const entityMap = new Map();

  // Add holders
  holders.forEach((h, i) => {
    entityMap.set(h.entityId, {
      id: h.entityId,
      name: h.entityName || 'Unknown',
      type: h.entityType || 'misc',
      balanceUsd: h.balanceUsd || 0,
      balanceUnit: h.balanceUnit || 0,
      prevBalanceUsd: h.prevBalanceUsd || 0,
      changePct: h.prevBalanceUsd > 0 ? ((h.balanceUsd - h.prevBalanceUsd) / h.prevBalanceUsd) * 100 : 0,
      share: totalHeld > 0 ? (h.balanceUsd / totalHeld) * 100 : 0,
      rank: i + 1,
      isHolder: true,
      volume: 0,
      txCount: 0,
      flow: null,
      address: null,
    });
  });

  // Enrich with counterparty data
  const cpEntries = counterparties?.ethereum || [];
  cpEntries.forEach((cp) => {
    const name = getName(cp);
    const addr = cp.address?.address || name;
    const entityType = getEntityType(cp);

    const existing = entityMap.get(addr);
    if (existing) {
      existing.volume = (existing.volume || 0) + (cp.usd || 0);
      existing.txCount = (existing.txCount || 0) + (cp.transactionCount || 0);
      existing.flow = cp.flow || existing.flow;
      existing.address = cp.address?.address || existing.address;
    } else {
      entityMap.set(addr, {
        id: addr,
        name,
        type: entityType,
        balanceUsd: 0,
        balanceUnit: 0,
        prevBalanceUsd: 0,
        changePct: 0,
        share: 0,
        rank: null,
        isHolder: false,
        volume: cp.usd || 0,
        txCount: cp.transactionCount || 0,
        flow: cp.flow || 'all',
        address: cp.address?.address || null,
      });
    }
  });

  return Array.from(entityMap.values());
}

// Build links for the network graph from counterparties
export function buildLinks(counterparties) {
  const cpEntries = counterparties?.ethereum || [];
  if (cpEntries.length === 0) return [];

  const maxUsd = Math.max(1, ...cpEntries.map(e => e.usd || 0));

  return cpEntries.map(cp => {
    const name = getName(cp);
    const id = cp.address?.address || name;
    return {
      source: cp.flow === 'in' ? id : 'ripple',
      target: cp.flow === 'in' ? 'ripple' : id,
      usd: cp.usd || 0,
      txCount: cp.transactionCount || 0,
      flow: cp.flow || 'all',
      thickness: 1 + ((cp.usd || 0) / maxUsd) * 6,
    };
  });
}
