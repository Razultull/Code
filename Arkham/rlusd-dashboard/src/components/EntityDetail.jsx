import { useEffect } from 'react';
import { X, ExternalLink, Globe, Twitter } from 'lucide-react';

export default function EntityDetail({ entity, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!entity) return null;

  const typeLabel = entity.entityType
    ? entity.entityType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl animate-[slideInRight_250ms_ease-out] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100 truncate">
            {entity.entityName || 'Entity Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Identity section */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">
              Identity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Name</span>
                <span className="text-sm font-medium text-zinc-100">
                  {entity.entityName || '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Type</span>
                <span className="text-sm font-medium text-zinc-300">{typeLabel}</span>
              </div>
              {entity.entityId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">ID</span>
                  <span className="text-xs font-mono text-zinc-500 truncate max-w-[200px]">
                    {entity.entityId}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Links */}
          {(entity.website || entity.twitter) && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">
                Links
              </h3>
              <div className="flex gap-2">
                {entity.website && (
                  <a
                    href={entity.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {entity.twitter && (
                  <a
                    href={`https://twitter.com/${entity.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 rounded-lg hover:bg-sky-500/20 transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    @{entity.twitter}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Balance section */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">
              Balance
            </h3>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">USD Value</span>
                <span className="text-sm font-semibold text-zinc-100 tabular-nums">
                  {entity.balanceUsd != null
                    ? entity.balanceUsd.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      })
                    : '--'}
                </span>
              </div>
              {entity.balanceUnit != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Token Amount</span>
                  <span className="text-sm text-zinc-300 tabular-nums">
                    {entity.balanceUnit.toLocaleString('en-US', { maximumFractionDigits: 0 })} RLUSD
                  </span>
                </div>
              )}
              {entity.prevBalanceUsd != null && entity.prevBalanceUsd > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Change</span>
                  {(() => {
                    const pct =
                      ((entity.balanceUsd - entity.prevBalanceUsd) / entity.prevBalanceUsd) * 100;
                    const isUp = pct >= 0;
                    return (
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          isUp ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isUp ? '\u25B2' : '\u25BC'} {Math.abs(pct).toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>

          {/* Counterparties placeholder */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">
              Top Counterparties
            </h3>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6 text-center">
              <p className="text-sm text-zinc-500">
                Counterparty details will appear here when entity is expanded.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
