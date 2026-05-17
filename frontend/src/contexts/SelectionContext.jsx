import React, { createContext, useContext, useState, useEffect } from 'react';

const SelectionContext = createContext();

export function SelectionProvider({ children }) {
  // Default to 1 (AY 2024-25 usually) or null
  const [selectedAY, setSelectedAY] = useState(() => {
    const saved = localStorage.getItem('selectedAY');
    return saved ? Number(saved) : 1;
  });

  const [dateRange, setDateRange] = useState({
    start: null,
    end: null
  });

  useEffect(() => {
    localStorage.setItem('selectedAY', selectedAY);
  }, [selectedAY]);

  const value = {
    selectedAY,
    setSelectedAY,
    dateRange,
    setDateRange,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
