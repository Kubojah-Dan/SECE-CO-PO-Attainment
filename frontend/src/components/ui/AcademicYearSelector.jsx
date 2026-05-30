import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Search, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { subjectService } from '../../services/api';
import { useSelection } from '../../contexts/SelectionContext';

export default function AcademicYearSelector({ align = 'left' }) {
  const { selectedAY, setSelectedAY, setDateRange } = useSelection();
  const [isOpen, setIsOpen] = useState(false);
  const [searchDate, setSearchDate] = useState('');
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleYearSelect = (year) => {
    setSelectedAY(year.id);
    if (year.start_date && year.end_date) {
      setDateRange({ start: year.start_date, end: year.end_date });
    }
    setIsOpen(false);
  };

  const findAYFromDate = () => {
    if (!searchDate) return;
    const yearPart = searchDate.split('-')[0];
    if (yearPart.length > 4 || parseInt(yearPart) > 2100) {
      toast.error('Please enter a valid date (year should be between 2000 and 2100)');
      return;
    }
    const date = new Date(searchDate);
    const found = years.find(y => {
      if (!y.start_date || !y.end_date) return false;
      return date >= new Date(y.start_date) && date <= new Date(y.end_date);
    });
    if (found) {
      handleYearSelect(found);
      toast.success(`Switched to Academic Year ${found.label}`);
    } else {
      toast.info(
        <div className="flex flex-col gap-2">
          <p className="font-bold">No Academic Year found</p>
          <p className="text-xs mt-1">Please create one in Admin &gt; Academic Years</p>
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
    return <div className="h-9 w-36 bg-slate-100 animate-pulse rounded-lg" />;
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button — compact, flat, enterprise */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-gray-400 text-sm font-semibold text-slate-700 rounded-lg transition-colors duration-150 active:bg-slate-50"
      >
        <Calendar size={14} className="text-slate-400 flex-shrink-0" />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Session</span>
          <span className="text-slate-800 text-[13px]">AY {selectedYear?.label || 'Select Year'}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            /* ── Positioning: anchors to left or right edge of trigger based on align prop.
               right-0 prevents viewport clipping on far-right placements.
               z-[200] floats above sidebar (z-[101]) safely ── */
            className={`absolute ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} mt-1.5 w-64 bg-white border border-gray-200 rounded-xl z-[200] overflow-hidden`}
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          >

            {/* ── Section 1: Academic Year List ── */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                Academic Year
              </p>
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                {years.length === 0 && (
                  <p className="text-xs text-slate-400 px-2 py-3 text-center">No academic years configured.</p>
                )}
                {years.map((year) => {
                  const isActive = selectedAY === year.id;
                  return (
                    <button
                      key={year.id}
                      onClick={() => handleYearSelect(year)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors duration-100 ${
                        isActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold">AY {year.label}</span>
                        {(year.start_date || year.end_date) && (
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {year.start_date ? new Date(year.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                            {' – '}
                            {year.end_date ? new Date(year.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        )}
                      </div>
                      {/* Simple checkmark — no neon glow */}
                      {isActive && (
                        <Check size={14} className="text-slate-700 flex-shrink-0 ml-2" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Section 2: Calendar Resolver — secondary utility ── */}
            <div className="border-t border-gray-100 px-3 py-2.5 mt-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                Resolve from Date
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="flex-1 text-[11px] px-2 py-1.5 border border-gray-200 rounded-md text-slate-600 bg-white focus:outline-none focus:border-slate-400 transition-colors"
                />
                <button
                  onClick={findAYFromDate}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                  title="Find Academic Year"
                >
                  <Search size={13} />
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 px-1">
                Pick any date to locate its academic year.
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
