import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, icon: Icon, trend, color = 'blue' }) {
  const iconStyles = {
    blue:   { wrapper: 'bg-[var(--primary-50)] text-[var(--primary-500)]' },
    green:  { wrapper: 'bg-emerald-50 text-emerald-600' },
    amber:  { wrapper: 'bg-[var(--accent-50)] text-[var(--accent-600)]' },
    purple: { wrapper: 'bg-purple-50 text-purple-600' },
    red:    { wrapper: 'bg-red-50 text-red-600' },
  };

  const style = iconStyles[color] || iconStyles.blue;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm cursor-default flex items-start justify-between"
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
      <div className={`p-2.5 rounded-xl ${style.wrapper}`}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
    </motion.div>
  );
}

