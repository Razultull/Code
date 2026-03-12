import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getTokenInfo, getEntityBalances, getCounterparties } from './api';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [holders, setHolders] = useState([]);
  const [counterparties, setCounterparties] = useState(null);
  const [interval, setInterval] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [token, balances, cps] = await Promise.all([
        getTokenInfo(),
        getEntityBalances(interval, 20),
        getCounterparties(15),
      ]);
      setTokenInfo(token);
      setHolders(balances);
      setCounterparties(cps);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [interval]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Compute derived values
  const totalHeld = holders.reduce((s, h) => s + h.balanceUsd, 0);
  const totalPrev = holders.reduce((s, h) => s + h.prevBalanceUsd, 0);
  const totalChange = totalHeld - totalPrev;
  const totalChangePct = totalPrev > 0 ? (totalChange / totalPrev) * 100 : 0;
  const cexHolders = holders.filter(h => h.entityType === 'cex');
  const defiHolders = holders.filter(h => h.entityType !== 'cex' && h.entityType !== 'misc');
  const cexTotal = cexHolders.reduce((s, h) => s + h.balanceUsd, 0);
  const defiTotal = defiHolders.reduce((s, h) => s + h.balanceUsd, 0);

  return (
    <StoreContext.Provider value={{
      tokenInfo, holders, counterparties, interval, setInterval,
      loading, error, totalHeld, totalPrev, totalChange, totalChangePct,
      cexTotal, defiTotal, refresh: fetchData,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
