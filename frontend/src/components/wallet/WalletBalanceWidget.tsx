import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Wallet } from 'lucide-react';
import { useSpring, animated } from 'react-spring';
import { useWallet } from '../../hooks/useWallet';
import { parseBalance } from '../../utils/stellar';
import BalanceToggle, { BalanceMode } from './BalanceToggle';
import PriceSparkline, { PricePoint } from './PriceSparkline';
import LowBalanceWarning from './LowBalanceWarning';

const WALLET_BUY_URL = 'https://www.stellar.org/lumens/exchanges';

const WalletBalanceWidget: React.FC = () => {
  const { balance, refreshBalance, isConnected } = useWallet();
  const [mode, setMode] = useState<BalanceMode>('XLM');
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [sparkline, setSparkline] = useState<PricePoint[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const prevXlmRef = useRef<number | null>(null);

  const xlm = useMemo(() => {
    if (!balance || balance.asset !== 'XLM') return 0;
    return parseBalance(balance.balance);
  }, [balance]);

  const usd = useMemo(() => {
    if (priceUsd == null) return null;
    return xlm * priceUsd;
  }, [xlm, priceUsd]);

  const displayValue =
    mode === 'XLM'
      ? `${xlm.toFixed(2)} XLM`
      : usd != null
        ? `$${usd.toFixed(2)}`
        : '—';

  // Animation when balance changes
  const [valueSpring, valueApi] = useSpring(() => ({
    scale: 1,
    config: { tension: 260, friction: 18 },
  }));

  useEffect(() => {
    if (prevXlmRef.current == null) {
      prevXlmRef.current = xlm;
      return;
    }
    if (xlm !== prevXlmRef.current) {
      valueApi.start({ scale: 1.06 });
      const timeout = setTimeout(() => {
        valueApi.start({ scale: 1 });
      }, 180);
      prevXlmRef.current = xlm;
      return () => clearTimeout(timeout);
    }
    return;
  }, [xlm, valueApi]);

  // Fetch live XLM price and 24h sparkline from CoinGecko
  useEffect(() => {
    let interval: number | undefined;

    const fetchPrice = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/stellar/market_chart?vs_currency=usd&days=1&interval=hourly'
        );
        if (!res.ok) return;
        const json = await res.json();
        const prices: [number, number][] = json.prices ?? [];
        if (!prices.length) return;

        const latest = prices[prices.length - 1][1];
        setPriceUsd(latest);

        const points: PricePoint[] = prices.map(([ts, price]) => ({
          time: ts,
          price,
        }));
        setSparkline(points);
      } catch {
        // Silently ignore price errors; widget still shows XLM
      }
    };

    fetchPrice();
    interval = window.setInterval(fetchPrice, 60_000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const handleToggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleRefresh = async () => {
    await refreshBalance();
  };

  const containerClasses =
    'inline-flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 shadow-md shadow-slate-900/50';

  if (!isConnected || !balance) {
    // Show nothing if wallet is not connected; WalletConnect handles onboarding elsewhere.
    return null;
  }

  return (
    <div className={containerClasses} aria-label="Wallet balance">
      <button
        type="button"
        onClick={handleToggleExpanded}
        className="flex items-center gap-2 text-left"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-100 border border-slate-700">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Wallet
          </span>
          <animated.span
            style={valueSpring}
            className="text-xs font-semibold text-slate-50"
          >
            {displayValue}
          </animated.span>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-1 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <BalanceToggle mode={mode} onChange={setMode} />
            <button
              type="button"
              onClick={handleRefresh}
              className="text-[10px] text-slate-400 hover:text-slate-200"
            >
              Refresh
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400">24h price</span>
              <span className="text-xs font-semibold text-emerald-300">
                {priceUsd != null ? `$${priceUsd.toFixed(4)}` : '—'}
              </span>
            </div>
            <PriceSparkline data={sparkline} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <LowBalanceWarning balanceXlm={xlm} />
            <a
              href={WALLET_BUY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:text-sky-100 hover:bg-slate-800"
            >
              <span>Add Funds</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletBalanceWidget;

