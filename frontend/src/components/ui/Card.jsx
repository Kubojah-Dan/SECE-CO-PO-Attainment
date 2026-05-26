import React from 'react';

export default function Card({ title, subtitle, children, footer, className = "", ...props }) {
  return (
    <div className={`bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden ${className}`} {...props}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-secondary)]">
          {title && <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>}
          {subtitle && <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="px-6 py-5">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-secondary)]">
          {footer}
        </div>
      )}
    </div>
  );
}

