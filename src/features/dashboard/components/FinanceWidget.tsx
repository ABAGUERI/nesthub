import React from 'react';
import './FinanceWidget.css';

const mockPortfolio = {
  total: 12450,
  delta: 2.6,
  marketStatus: 'Ouvert',
  holdings: [
    { symbol: 'TSLA', name: 'Tesla', price: 248.3, change: 1.2 },
    { symbol: 'AAPL', name: 'Apple', price: 192.1, change: -0.5 },
    { symbol: 'NVDA', name: 'Nvidia', price: 662.4, change: 3.1 },
    { symbol: 'BTC', name: 'Bitcoin', price: 98765, change: 0.8 },
  ],
};

export const FinanceWidget: React.FC = () => {
  const { total, delta, marketStatus, holdings } = mockPortfolio;
  const isUp = delta >= 0;

  return (
    <div className="widget finance-widget">
      <div className="widget-header">
        <div className="widget-title">💹 Portefeuille & Marché</div>
        <span className={`market-chip ${marketStatus === 'Ouvert' ? 'open' : 'closed'}`}>
          {marketStatus}
        </span>
      </div>

      <div className="finance-hero">
        <div>
          <div className="finance-label">Valeur totale</div>
          <div className="finance-total">{total.toLocaleString('fr-CA', { minimumFractionDigits: 0 })}$</div>
        </div>
        <div className={`finance-delta ${isUp ? 'up' : 'down'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      </div>

      <div className="finance-grid">
        {holdings.map((stock) => (
          <div key={stock.symbol} className="finance-row">
            <div className="finance-symbol">
              <span className="symbol-pill">{stock.symbol}</span>
              <span className="stock-name">{stock.name}</span>
            </div>
            <div className="finance-values">
              <span className="stock-price">{stock.price.toFixed(2)}$</span>
              <span className={`stock-change ${stock.change >= 0 ? 'up' : 'down'}`}>
                {stock.change >= 0 ? '+' : ''}
                {stock.change.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
