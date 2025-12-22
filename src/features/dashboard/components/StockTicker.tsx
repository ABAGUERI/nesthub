import React, { useState, useEffect } from 'react';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import './StockTicker.css';

interface StockData {
  symbol: string;
  change: number;
}

export const StockTicker: React.FC = () => {
  const { config } = useClientConfig();
  const [stocks, setStocks] = useState<StockData[]>([]);

  useEffect(() => {
    loadStocks();
    
    // Rafraîchir toutes les 60 secondes
    const interval = setInterval(loadStocks, 60000);
    return () => clearInterval(interval);
  }, [config]);

  const loadStocks = async () => {
    // Symboles par défaut si non configurés
    const symbols = config?.stockSymbols || [
      'BTC-USD',
      'NVDA',
      'AAPL',
      'GOOGL',
      'MSFT',
      'ETH-USD',
    ];

    // Pour l'instant, données simulées
    // TODO: Intégrer une vraie API (Yahoo Finance, Alpha Vantage, etc.)
    const mockData: StockData[] = symbols.map((symbol) => ({
      symbol,
      change: (Math.random() * 4 - 2), // -2% à +2%
    }));

    setStocks(mockData);
  };

  return (
    <div className="stock-ticker">
      <div className="stock-ticker-content">
        {stocks.map((stock, index) => (
          <span key={`${stock.symbol}-${index}`} className="stock-item">
            <span className="stock-symbol">{stock.symbol}</span>
            <span className={stock.change >= 0 ? 'stock-up' : 'stock-down'}>
              {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
            </span>
          </span>
        ))}
        {/* Dupliquer pour un scroll infini */}
        {stocks.map((stock, index) => (
          <span key={`${stock.symbol}-dup-${index}`} className="stock-item">
            <span className="stock-symbol">{stock.symbol}</span>
            <span className={stock.change >= 0 ? 'stock-up' : 'stock-down'}>
              {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};
