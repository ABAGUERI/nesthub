import React from 'react';
import { EMOJI_OPTIONS } from './emojiOptions';

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ value, onChange, label = 'Emoji' }) => {
  return (
    <div className="emoji-picker">
      <span className="emoji-picker-label">{label}</span>
      <div className="emoji-grid" role="listbox" aria-label={label}>
        {EMOJI_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`emoji-option${value === emoji ? ' selected' : ''}`}
            onClick={() => onChange(emoji)}
            aria-pressed={value === emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
