import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChildSelectionContextType {
  selectedChildIndex: number;
  setSelectedChildIndex: (index: number) => void;
  totalChildren: number;
  setTotalChildren: (count: number) => void;
}

const ChildSelectionContext = createContext<ChildSelectionContextType | undefined>(undefined);

export const ChildSelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [totalChildren, setTotalChildren] = useState(0);

  return (
    <ChildSelectionContext.Provider
      value={{
        selectedChildIndex,
        setSelectedChildIndex,
        totalChildren,
        setTotalChildren,
      }}
    >
      {children}
    </ChildSelectionContext.Provider>
  );
};

export const useChildSelection = () => {
  const context = useContext(ChildSelectionContext);
  if (!context) {
    throw new Error('useChildSelection must be used within ChildSelectionProvider');
  }
  return context;
};
