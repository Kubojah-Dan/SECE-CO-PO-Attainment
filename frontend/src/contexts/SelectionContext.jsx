import React, { createContext, useContext, useState, useEffect } from 'react';
import { subjectService } from '../services/api';
import { useAuth } from './AuthContext';

const SelectionContext = createContext();

export function SelectionProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [selectedAY, setSelectedAY] = useState(() => {
    const saved = localStorage.getItem('selectedAY');
    return saved ? Number(saved) : null;
  });

  const [dateRange, setDateRange] = useState({
    start: null,
    end: null
  });

  useEffect(() => {
    if (selectedAY) {
      localStorage.setItem('selectedAY', selectedAY);
    }
  }, [selectedAY]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const initAY = async () => {
      try {
        const res = await subjectService.listYears();
        const years = Array.isArray(res.data) 
          ? res.data 
          : (Array.isArray(res.data?.results) ? res.data.results : []);
        
        if (selectedAY) {
          const current = years.find(y => y.id === selectedAY);
          if (current && current.start_date && current.end_date) {
            setDateRange({ start: current.start_date, end: current.end_date });
          }
          return;
        }

        const current = years.find(y => y.is_current) || years[0];
        if (current) {
          setSelectedAY(current.id);
          if (current.start_date && current.end_date) {
            setDateRange({ start: current.start_date, end: current.end_date });
          }
        }
      } catch (error) {
        console.error("Failed to load academic years:", error);
      }
    };
    initAY();
  }, [selectedAY, isAuthenticated]);

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
