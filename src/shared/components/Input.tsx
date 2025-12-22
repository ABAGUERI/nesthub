import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const hasError = Boolean(error);

  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label">{label}</label>}
      
      <div className={`input-container ${hasError ? 'input-error' : ''}`}>
        {leftIcon && <div className="input-icon-left">{leftIcon}</div>}
        
        <input
          className={`input-field ${leftIcon ? 'input-with-left-icon' : ''} ${
            rightIcon ? 'input-with-right-icon' : ''
          }`}
          {...props}
        />
        
        {rightIcon && <div className="input-icon-right">{rightIcon}</div>}
      </div>
      
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && (
        <span className="input-helper-text">{helperText}</span>
      )}
    </div>
  );
};
