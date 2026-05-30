import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, icon: Icon, trend }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white border border-gray-200 rounded-2xl p-6 cursor-default flex items-start justify-between"
    >
      <div>
        <p className="text-sm font-medium text-[var(--text-muted)] mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
        {trend && (
          <div className={`mt-2 flex items-center text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
            <span>{trend.positive ? '↑' : '↓'} {trend.value}%</span>
            <span className="ml-1 text-[var(--text-muted)] font-normal">vs last sem</span>
          </div>
        )}
      </div>
      {/* Monochromatic slate icon — no varied pastels */}
      <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
        {Icon && <Icon className="w-5 h-5" strokeWidth={1.75} />}
      </div>
    </motion.div>
  );
}


