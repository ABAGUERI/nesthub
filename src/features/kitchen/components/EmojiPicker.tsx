import React from 'react';
import './EmojiPicker.css';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

// Liste d'emojis de nourriture organisées par catégories
const FOOD_EMOJIS = [
  // Fast food & Street food
  '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥙',
  
  // Plats asiatiques
  '🍝', '🍜', '🍲', '🍱', '🍛', '🍣', '🍤', '🥘',
  
  // Petit-déjeuner & Oeufs
  '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🥚',
  
  // Légumes
  '🌶️', '🥕', '🥦', '🥒', '🥬', '🌽', '🍆', '🍅',
  
  // Féculents
  '🥑', '🍠', '🧅', '🥔', '🍞', '🥐', '🥖', '🥨',
  
  // Fromage & Fruits 1
  '🥯', '🧀', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌',
  
  // Fruits 2
  '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓',
  
  // Desserts
  '🫐', '🥝', '🥥', '🍰', '🎂', '🧁', '🥧', '🍦',
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="emoji-picker-backdrop" onClick={handleBackdropClick}>
      <div className="emoji-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="emoji-picker-header">
          <h3 className="emoji-picker-title">Choisir une emoji</h3>
          <button 
            className="emoji-picker-close"
            onClick={onClose}
            type="button"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        
        <div className="emoji-picker-grid">
          {FOOD_EMOJIS.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              className="emoji-picker-item"
              onClick={() => handleEmojiClick(emoji)}
              type="button"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
