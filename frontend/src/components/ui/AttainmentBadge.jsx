/**
 * SECE CO-PO Platform — Attainment Level Badge
 * Visual indicator for CO/PO attainment levels (0, 1, 2, 3)
 */

const LEVEL_CONFIG = {
  3: { label: 'Level 3', sublabel: 'High',         className: 'level-3', dot: 'var(--level-3)' },
  2: { label: 'Level 2', sublabel: 'Medium',       className: 'level-2', dot: 'var(--level-2)' },
  1: { label: 'Level 1', sublabel: 'Low',          className: 'level-1', dot: 'var(--level-1)' },
  0: { label: 'Not Attained', sublabel: 'L0',      className: 'level-0', dot: 'var(--level-0)' },
};

/**
 * @param {number} level - 0, 1, 2, or 3
 * @param {number} [percentage] - Optional percentage to show
 * @param {boolean} [showSublabel] - Show High/Medium/Low/Not Attained
 * @param {'sm'|'md'|'lg'} [size]
 */
export function AttainmentBadge({ level, percentage, showSublabel = false, size = 'sm' }) {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[0];
  const sizes = {
    sm: { badge: 'text-xs px-2 py-0.5', dot: '6px' },
    md: { badge: 'text-sm px-3 py-1', dot: '8px' },
    lg: { badge: 'text-base px-4 py-1.5', dot: '10px' },
  };
  const s = sizes[size] || sizes.sm;

  return (
    <span className={`level-badge ${config.className} ${s.badge}`}>
      <span
        style={{
          width: s.dot,
          height: s.dot,
          borderRadius: '50%',
          background: config.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {showSublabel ? config.sublabel : config.label}
      {percentage !== undefined && (
        <span className="font-mono ml-1">{Number(percentage).toFixed(1)}%</span>
      )}
    </span>
  );
}

/**
 * Target achieved indicator — green check or red cross
 */
export function TargetIndicator({ achieved, className = '' }) {
  if (achieved === null || achieved === undefined) return <span style={{ color: 'var(--gray-300)' }}>—</span>;
  return (
    <span
      className={`font-semibold ${className}`}
      style={{ color: achieved ? 'var(--success)' : 'var(--danger)' }}
    >
      {achieved ? '✓ Attained' : '✗ Not Attained'}
    </span>
  );
}

export default AttainmentBadge;
