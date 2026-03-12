export function useEntityType(type) {
  const types = {
    cex: { label: 'CEX', color: 'cyan' },
    dex: { label: 'DEX', color: 'purple' },
    'lending-decentralized': { label: 'Lending', color: 'yellow' },
    misc: { label: 'Misc', color: 'blue' },
    fund: { label: 'Fund', color: 'green' },
  };
  return types[type] || { label: type || 'Unknown', color: 'zinc' };
}
