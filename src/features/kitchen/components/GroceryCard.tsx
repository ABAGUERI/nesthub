// src/features/kitchen/components/GroceryCard.tsx
// Carte flip pour afficher liste d'épicerie

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import './GroceryCard.css';

interface GroceryItem {
  name: string;
  checked: boolean;
}

type GroceryCategory = 
  | 'Viandes & Poissons'
  | 'Légumes'
  | 'Fruits'
  | 'Féculents'
  | 'Produits laitiers'
  | 'Épices & condiments';

type GroceryList = Record<GroceryCategory, GroceryItem[]>;

export const GroceryCard: React.FC = () => {
  const { user } = useAuth();
  const [isFlipped, setIsFlipped] = useState(false);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [currentWeek, setCurrentWeek] = useState<string>('');

  useEffect(() => {
    loadGroceryList();
  }, []);

  const getWeekStart = (): string => {
    const date = new Date();
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  };

  const loadGroceryList = () => {
    try {
      const weekStart = getWeekStart();
      setCurrentWeek(weekStart);
      
      const cached = localStorage.getItem(`hub_grocery_${weekStart}`);
      if (cached) {
        setGroceryList(JSON.parse(cached));
      }
    } catch (error) {
      console.error('❌ Erreur chargement épicerie:', error);
    }
  };

  const toggleItem = (category: GroceryCategory, itemIndex: number) => {
    if (!groceryList) return;

    const updated = { ...groceryList };
    updated[category] = [...updated[category]];
    updated[category][itemIndex] = {
      ...updated[category][itemIndex],
      checked: !updated[category][itemIndex].checked,
    };

    setGroceryList(updated);
    localStorage.setItem(`hub_grocery_${currentWeek}`, JSON.stringify(updated));
  };

  const totalItems = groceryList 
    ? Object.values(groceryList).reduce((sum, items) => sum + items.length, 0)
    : 0;

  const checkedItems = groceryList
    ? Object.values(groceryList).reduce(
        (sum, items) => sum + items.filter(i => i.checked).length,
        0
      )
    : 0;

  return (
    <div className="grocery-card-container">
      <div className={`grocery-card ${isFlipped ? 'flipped' : ''}`}>
        {/* FRONT */}
        <div className="grocery-front" onClick={() => setIsFlipped(true)}>
          <div className="grocery-icon">🛒</div>
          <h3 className="grocery-title">Épicerie</h3>
          {groceryList && (
            <div className="grocery-stats">
              <span className="grocery-stat">
                {checkedItems}/{totalItems} articles
              </span>
            </div>
          )}
        </div>

        {/* BACK */}
        <div className="grocery-back">
          <div className="grocery-back-header">
            <h3 className="grocery-back-title">
              <span className="grocery-back-icon">🛒</span>
              Liste d'épicerie
            </h3>
            <button
              className="grocery-close-btn"
              onClick={() => setIsFlipped(false)}
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="grocery-back-content">
            {groceryList ? (
              Object.entries(groceryList).map(([category, items]) => (
                items.length > 0 && (
                  <div key={category} className="grocery-category">
                    <h4 className="category-title">{category}</h4>
                    <ul className="category-items">
                      {items.map((item, index) => (
                        <li key={index} className="grocery-item">
                          <label className="grocery-checkbox">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggleItem(category as GroceryCategory, index)}
                            />
                            <span className={item.checked ? 'checked' : ''}>
                              {item.name}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))
            ) : (
              <div className="grocery-empty">
                <span className="empty-icon">📭</span>
                <p className="empty-text">Aucune liste d'épicerie</p>
                <p className="empty-subtext">
                  Générez un menu avec l'IA pour créer automatiquement votre liste
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
