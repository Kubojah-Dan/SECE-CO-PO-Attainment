import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  onClick,
  className = '',
  disabled = false,
  isLoading = false,
  type = 'button',
}) => {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)] focus-visible:outline-none";

  const sizes = {
    sm:  'px-3 py-1.5 text-xs',
    md:  'px-4 py-2.5 text-sm',
    lg:  'px-6 py-3 text-sm',
    xl:  'px-8 py-4 text-base',
  };

  const variants = {
    primary:   'bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white',
    dark:      'bg-slate-900 hover:bg-slate-800 text-white',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 hover:border-gray-400',
    outline:   'bg-transparent hover:bg-[var(--primary-50)] text-[var(--primary-500)] border border-[var(--primary-300)]',
    ghost:     'bg-transparent hover:bg-[var(--surface-tertiary)] text-[var(--text-secondary)]',
    danger:    'bg-[var(--danger)] hover:bg-red-700 text-white',
    success:   'bg-[var(--success)] hover:bg-emerald-700 text-white',
    accent:    'bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white font-semibold',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin shrink-0" />
      ) : (
        Icon && <Icon size={16} className={children ? "shrink-0" : ""} />
      )}
      {children}
    </button>
  );
};

export default Button;

