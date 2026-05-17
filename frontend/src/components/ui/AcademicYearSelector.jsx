import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { subjectService } from '../../services/api';
import { useSelection } from '../../contexts/SelectionContext';

export default function AcademicYearSelector() {
  const { selectedAY, setSelectedAY, setDateRange } = useSelection();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => subjectService.listYears(),
  });

  const years = Array.isArray(rawData?.data) 
    ? rawData.data 
    : (Array.isArray(rawData?.data?.results) ? rawData.data.results : []);

  const selectedYear = years.find(y => y.id === selectedAY) || years[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleYearSelect = (year) => {
    setSelectedAY(year.id);
    if (year.start_date && year.end_date) {
      setDateRange({ start: year.start_date, end: year.end_date });
    }
    setIsOpen(false);
  };

  const [searchDate, setSearchDate] = useState('');

  const findAYFromDate = () => {
    if (!searchDate) return;
    
    // Validation for unrealistic years (e.g. 12026)
    const yearPart = searchDate.split('-')[0];
    if (yearPart.length > 4 || parseInt(yearPart) > 2100) {
      toast.error('Please enter a valid date (year should be between 2000 and 2100)');
      return;
    }

    const date = new Date(searchDate);
    const found = years.find(y => {
      if (!y.start_date || !y.end_date) return false;
      const start = new Date(y.start_date);
      const end = new Date(y.end_date);
      return date >= start && date <= end;
    });

    if (found) {
      handleYearSelect(found);
      toast.success(`Switched to Academic Year ${found.label}`);
    } else {
      toast.info(
        <div className="flex flex-col gap-2">
          <p className="font-bold">No Academic Year found</p>
          <p className="text-xs mt-1">Please create one in Admin > Academic Years</p>
          {window.location.pathname.includes('/admin/') && (
            <button 
              onClick={() => window.location.href = '/admin/academic-years'}
              className="mt-2 text-[10px] font-bold text-blue-600 underline"
            >
              Go to Management
            </button>
          )}
        </div>
      );
    }
  };

  if (isLoading) {
    return <div className="h-10 w-40 bg-slate-100 animate-pulse rounded-xl" />;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-border hover:border-accent text-sm font-bold text-text-h rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95"
      >
        <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
          <Calendar size={14} className="text-accent" />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Session</span>
          <span>AY {selectedYear?.label || 'Select Year'}</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-72 bg-white border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-3 bg-slate-50 border-b border-border">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Select Academic Year</h4>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-2">
              {years.map((year) => (
                <button
                  key={year.id}
                  onClick={() => handleYearSelect(year)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all mb-1 ${
                    selectedAY === year.id 
                      ? 'bg-accent/10 text-accent' 
                      : 'hover:bg-slate-50 text-text-h'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-sm">AY {year.label}</span>
                    <span className="text-[10px] opacity-60">
                      {year.start_date ? new Date(year.start_date).toLocaleDateString() : 'N/A'} - 
                      {year.end_date ? new Date(year.end_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {selectedAY === year.id && (
                    <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
                  )}
                </button>
              ))}
            </div>

            {/* Calendar Resolve Section */}
            <div className="p-4 bg-slate-50 border-t border-border">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolve from Calendar</span>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="flex-1 text-[10px] p-2 border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none font-bold"
                    />
                    <button 
                      onClick={findAYFromDate}
                      className="bg-accent text-white p-2 rounded-lg font-bold transition-all hover:shadow-lg hover:shadow-accent/20 active:scale-95"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Select any date to find its AY</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
