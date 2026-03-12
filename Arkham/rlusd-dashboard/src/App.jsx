import { StoreProvider, useStore } from './store';
import { Container } from './components/Container';
import { Spinner } from './components/Spinner';
import { MetricsBar } from './components/MetricsBar';
import { Summary } from './components/Summary';
import EntityExplorer from './components/entityExplorer';
import HoldersTable from './components/HoldersTable';
import CounterpartyTable from './components/CounterpartyTable';
import HoldersChart from './components/HoldersChart';
import FlowChart from './components/FlowChart';
import { DashboardHeader } from './components/Header';

function Dashboard() {
  const {
    loading, error, tokenInfo, holders, counterparties, interval, setInterval,
    totalHeld, totalChange, totalChangePct, cexTotal, defiTotal,
  } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d11] flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-xs text-zinc-600 mt-3 font-mono">LOADING RLUSD INTELLIGENCE...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0d11] flex items-center justify-center">
        <div className="text-red-500 font-mono text-sm">ERROR: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d11]">
      <DashboardHeader tokenInfo={tokenInfo} interval={interval} onIntervalChange={setInterval} />
      <MetricsBar tokenInfo={tokenInfo} totalHeld={totalHeld} holderCount={holders.length} topHolder={holders[0]?.entityName} />

      <div className="max-w-[1600px] mx-auto px-3 py-3 space-y-3">
        {/* Row 1: Stats */}
        <Summary holders={holders} totalHeld={totalHeld} totalChange={totalChange} totalChangePct={totalChangePct} cexTotal={cexTotal} defiTotal={defiTotal} />

        {/* Row 2: Entity Explorer - full width */}
        <EntityExplorer holders={holders} counterparties={counterparties} totalHeld={totalHeld} />

        {/* Row 3: Charts - 2 col */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <HoldersChart holders={holders} />
          <FlowChart counterparties={counterparties} />
        </div>

        {/* Row 4: Tables - 2 col */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <HoldersTable holders={holders} totalHeld={totalHeld} />
          <CounterpartyTable counterparties={counterparties} />
        </div>
      </div>

      {/* Minimal footer */}
      <div className="border-t border-zinc-800/50 py-2 mt-3">
        <p className="text-center text-[10px] text-zinc-700 font-mono tracking-wider uppercase">
          Powered by Arkham Intelligence · RLUSD On-Chain Analytics
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <Dashboard />
    </StoreProvider>
  );
}

export default App;
