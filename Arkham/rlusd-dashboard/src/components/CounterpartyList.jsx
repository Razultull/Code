function fmtUsd(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function shortenAddr(addr) {
  if (!addr || addr.length < 12) return addr || 'Unknown';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function CounterpartyList({ counterparties }) {
  const entries = counterparties?.ethereum || [];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          Ripple Top Counterparties
        </div>
      </div>
      <div className="card-body" style={{ maxHeight: 520, overflowY: 'auto' }}>
        {entries.length === 0 && (
          <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
            No counterparty data available
          </div>
        )}
        {entries.map((cp, i) => {
          const name = cp.address?.arkhamEntity?.name
            || cp.address?.arkhamLabel?.name
            || shortenAddr(cp.address?.address);
          const flow = cp.flow || 'all';

          return (
            <div key={i} className="cp-row">
              <div className="holder-rank">{i + 1}</div>
              <span className={`cp-label ${flow}`}>{flow.toUpperCase()}</span>
              <div className="cp-name">{name}</div>
              <div className="cp-txns">{cp.transactionCount} txns</div>
              <div className="cp-usd">{fmtUsd(cp.usd)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
