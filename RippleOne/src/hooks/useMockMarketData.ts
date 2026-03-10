"use client";

import { useState, useEffect, useCallback } from "react";

// --- Types ---

export interface MarketTicker {
  symbol: string;
  price: number;
  previousPrice: number;
  isTrendingUp: boolean;
  displayPrice: string;
  change24h: number;
  displayChange: string;
  high24h: number;
  low24h: number;
  volume24h: string;
  marketCap: string;
  bid: number;
  ask: number;
}

export interface Transaction {
  id: string;
  asset: string;
  type: "Buy" | "Sell";
  amount: string;
  value: string;
  time: string;
  status: "Settled" | "Pending" | "Confirming";
  txHash: string;
  counterparty: string;
}

export interface MockMarketData {
  tickers: MarketTicker[];
  transactions: Transaction[];
}

// --- Helpers ---

function formatPrice(price: number, decimals: number): string {
  return `$${price.toFixed(decimals)}`;
}

function fluctuate(price: number, maxPct: number): number {
  const direction = Math.random() > 0.5 ? 1 : -1;
  const magnitude = Math.random() * maxPct;
  return price * (1 + direction * magnitude);
}

function randomHash(): string {
  return "0x" + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// --- Seed data ---

const INITIAL_TICKERS = [
  { symbol: "XRP/USD", price: 0.5432, decimals: 4, maxPct: 0.003, high: 0.5621, low: 0.5298, vol: "1.82B", mcap: "$28.4B" },
  { symbol: "RLUSD/USD", price: 1.0001, decimals: 4, maxPct: 0.0005, high: 1.0004, low: 0.9998, vol: "342M", mcap: "$4.2B" },
  { symbol: "EUR/USD", price: 1.0847, decimals: 4, maxPct: 0.001, high: 1.0892, low: 1.0801, vol: "2.1T", mcap: "—" },
  { symbol: "BTC/USD", price: 67842.50, decimals: 2, maxPct: 0.002, high: 68450.00, low: 66980.00, vol: "24.5B", mcap: "$1.33T" },
  { symbol: "ETH/USD", price: 3248.75, decimals: 2, maxPct: 0.0025, high: 3312.00, low: 3195.50, vol: "12.8B", mcap: "$390B" },
  { symbol: "SOL/USD", price: 142.38, decimals: 2, maxPct: 0.004, high: 148.20, low: 139.60, vol: "3.2B", mcap: "$62.1B" },
];

const COUNTERPARTIES = ["Citadel Securities", "Jump Trading", "Cumberland DRW", "Galaxy Digital", "Wintermute", "Flow Traders", "Jane Street", "Ripple Treasury"];

const TRANSACTION_POOL: Omit<Transaction, "id" | "time" | "status" | "txHash" | "counterparty">[] = [
  { asset: "XRP/USD", type: "Buy", amount: "+5,000,000 XRP", value: "$2,716,000" },
  { asset: "XRP/USD", type: "Sell", amount: "-12,400,000 XRP", value: "$6,735,680" },
  { asset: "ETH/USD", type: "Sell", amount: "-842.5 ETH", value: "$2,737,419" },
  { asset: "BTC/USD", type: "Buy", amount: "+45.25 BTC", value: "$3,069,823" },
  { asset: "RLUSD/USD", type: "Buy", amount: "+50,000,000 RLUSD", value: "$50,005,000" },
  { asset: "EUR/USD", type: "Sell", amount: "-€25,000,000", value: "$27,117,500" },
  { asset: "XRP/USD", type: "Buy", amount: "+8,200,000 XRP", value: "$4,454,240" },
  { asset: "ETH/USD", type: "Buy", amount: "+1,200 ETH", value: "$3,898,500" },
  { asset: "BTC/USD", type: "Sell", amount: "-12.8 BTC", value: "$868,384" },
  { asset: "SOL/USD", type: "Buy", amount: "+25,000 SOL", value: "$3,559,500" },
  { asset: "XRP/USD", type: "Buy", amount: "+3,400,000 XRP", value: "$1,846,880" },
  { asset: "RLUSD/USD", type: "Sell", amount: "-10,000,000 RLUSD", value: "$10,001,000" },
];

const TIME_LABELS = ["Just now", "14s ago", "38s ago", "1m ago", "2m ago", "4m ago", "7m ago", "12m ago"];
const STATUSES: Transaction["status"][] = ["Settled", "Settled", "Settled", "Pending", "Confirming", "Settled", "Settled", "Settled"];

function buildInitialTickers(): MarketTicker[] {
  return INITIAL_TICKERS.map(({ symbol, price, decimals, high, low, vol, mcap }) => {
    const change = +(Math.random() * 6 - 2).toFixed(2);
    const spread = price * 0.0002;
    return {
      symbol,
      price,
      previousPrice: price,
      isTrendingUp: change >= 0,
      displayPrice: formatPrice(price, decimals),
      change24h: change,
      displayChange: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
      high24h: high,
      low24h: low,
      volume24h: vol,
      marketCap: mcap,
      bid: price - spread / 2,
      ask: price + spread / 2,
    };
  });
}

function pickTransactions(): Transaction[] {
  const shuffled = [...TRANSACTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8).map((tx, i) => ({
    ...tx,
    id: `tx-${Date.now()}-${i}`,
    time: TIME_LABELS[i],
    status: STATUSES[i],
    txHash: randomHash(),
    counterparty: COUNTERPARTIES[Math.floor(Math.random() * COUNTERPARTIES.length)],
  }));
}

// --- Hook ---

export function useMockMarketData(): MockMarketData {
  const [tickers, setTickers] = useState<MarketTicker[]>(buildInitialTickers);
  const [transactions, setTransactions] = useState<Transaction[]>(pickTransactions);

  const tick = useCallback(() => {
    setTickers((prev) =>
      prev.map((ticker, i) => {
        const { decimals, maxPct } = INITIAL_TICKERS[i];
        const newPrice = fluctuate(ticker.price, maxPct);
        const isTrendingUp = newPrice >= ticker.price;
        const spread = newPrice * 0.0002;
        return {
          ...ticker,
          previousPrice: ticker.price,
          price: newPrice,
          isTrendingUp,
          displayPrice: formatPrice(newPrice, decimals),
          bid: newPrice - spread / 2,
          ask: newPrice + spread / 2,
        };
      })
    );
  }, []);

  useEffect(() => {
    const priceInterval = setInterval(tick, 800);
    const txInterval = setInterval(() => setTransactions(pickTransactions()), 10000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(txInterval);
    };
  }, [tick]);

  return { tickers, transactions };
}
