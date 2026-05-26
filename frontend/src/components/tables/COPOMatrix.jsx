/**
 * SECE CO-PO Platform — CO-PO Mapping Matrix
 * The signature heatmap component of the application.
 * Displays correlation levels (0, 1, 2, 3) between COs and POs.
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DESIGN_TOKENS } from '../../constants';

const CELL_STYLES = {
  0: 'matrix-cell-0',
  1: 'matrix-cell-1',
  2: 'matrix-cell-2',
  3: 'matrix-cell-3',
};

const TOOLTIP_LABELS = {
  0: 'No correlation',
  1: 'Low correlation',
  2: 'Medium correlation',
  3: 'High correlation',
};

/**
 * Read-only matrix — shows correlation levels as heatmap cells
 */
export function COPOMatrix({ cos, pos, mappings, showAttainment, coAttainments }) {
  const getLevel = (coId, poId) => {
    const m = mappings?.find((x) => x.co_id === coId && x.po_id === poId);
    return m ? m.correlation_level : 0;
  };

  const getCoAttainmentLevel = (coId) => {
    const att = coAttainments?.find((a) => a.co_id === coId);
    return att?.attainment_level ?? null;
  };

  if (!cos?.length || !pos?.length) {
    return (
      <div className="text-center py-10" style={{ color: 'var(--gray-400)' }}>
        No CO-PO mapping data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <table className="data-table min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 w-32" style={{ minWidth: '200px' }}>
              <span className="font-mono text-xs">CO ↓ \ PO →</span>
            </th>
            {pos.map((po) => (
              <th
                key={po.id}
                className="px-2 py-3 text-center"
                style={{ minWidth: '48px', maxWidth: '48px' }}
                title={po.description}
              >
                <span className="font-mono text-xs">{po.po_code || `PO${po.po_number}`}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cos.map((co, i) => (
            <tr key={co.id}>
              <td className="px-4 py-2.5 font-medium" style={{ minWidth: '200px' }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--primary-600)' }}>
                    {co.co_code || `CO${co.co_number}`}
                  </span>
                  {showAttainment && (
                    <AttainmentLevelDot level={getCoAttainmentLevel(co.id)} />
                  )}
                </div>
                <div
                  className="text-xs truncate max-w-xs mt-0.5"
                  style={{ color: 'var(--gray-400)' }}
                  title={co.description}
                >
                  {co.description?.substring(0, 60)}...
                </div>
              </td>
              {pos.map((po) => {
                const level = getLevel(co.id, po.id);
                return (
                  <td key={po.id} className="px-2 py-2.5 text-center">
                    <motion.span
                      className={`matrix-cell ${CELL_STYLES[level]}`}
                      title={TOOLTIP_LABELS[level]}
                      whileHover={{ scale: 1.2 }}
                    >
                      {level || '—'}
                    </motion.span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div
        className="flex items-center gap-6 px-4 py-2.5 border-t"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--gray-500)' }}>
          Correlation:
        </span>
        {[0, 1, 2, 3].map((l) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className={`matrix-cell ${CELL_STYLES[l]}`} style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.7rem' }}>
              {l || '—'}
            </span>
            <span className="text-xs" style={{ color: 'var(--gray-500)' }}>
              {['None', 'Low', 'Medium', 'High'][l]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Editable matrix — allows setting correlation levels (for faculty CO-PO mapping page)
 */
export function COPOMappingEditor({ cos, pos, initialMappings = [], onChange }) {
  const [mappings, setMappings] = useState(() => {
    const map = {};
    initialMappings.forEach((m) => {
      map[`${m.co_id}-${m.po_id}`] = m.correlation_level;
    });
    return map;
  });

  const updateMapping = useCallback(
    (coId, poId, level) => {
      const key = `${coId}-${poId}`;
      const newMappings = { ...mappings, [key]: parseInt(level) };
      setMappings(newMappings);
      // Notify parent of full mapping array
      const result = Object.entries(newMappings)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => {
          const [co_id, po_id] = k.split('-').map(Number);
          return { co_id, po_id, correlation_level: v };
        });
      onChange?.(result);
    },
    [mappings, onChange]
  );

  const getLevel = (coId, poId) => mappings[`${coId}-${poId}`] ?? 0;

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <table className="data-table min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left px-4 py-3" style={{ minWidth: '220px' }}>
              Course Outcome
            </th>
            {pos.map((po) => (
              <th
                key={po.id}
                className="px-1 py-3 text-center"
                style={{ minWidth: '52px' }}
                title={po.description}
              >
                <span className="font-mono text-xs">{po.po_code}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cos.map((co) => (
            <tr key={co.id}>
              <td className="px-4 py-2" style={{ minWidth: '220px' }}>
                <div className="font-mono text-sm font-bold" style={{ color: 'var(--primary-600)' }}>
                  {co.co_code}
                </div>
                <div className="text-xs" style={{ color: 'var(--gray-400)' }}>
                  {co.description?.substring(0, 50)}...
                </div>
              </td>
              {pos.map((po) => (
                <td key={po.id} className="px-1 py-2 text-center">
                  <select
                    value={getLevel(co.id, po.id)}
                    onChange={(e) => updateMapping(co.id, po.id, e.target.value)}
                    className="text-xs font-bold text-center border rounded cursor-pointer"
                    style={{
                      width: '44px',
                      height: '32px',
                      padding: '0 4px',
                      background: getLevel(co.id, po.id) === 3 ? 'var(--primary-500)' :
                                  getLevel(co.id, po.id) === 2 ? '#BFDBFE' :
                                  getLevel(co.id, po.id) === 1 ? '#DBEAFE' : 'var(--gray-50)',
                      color: getLevel(co.id, po.id) === 3 ? 'white' :
                             getLevel(co.id, po.id) >= 1 ? '#1E3A8A' : 'var(--gray-300)',
                      borderColor: getLevel(co.id, po.id) === 0 ? 'var(--border)' : 'transparent',
                    }}
                  >
                    <option value={0}>—</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div
        className="flex items-center gap-6 px-4 py-2.5 border-t text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)', color: 'var(--gray-500)' }}
      >
        <strong>Correlation strength:</strong>
        <span>— = No correlation</span>
        <span style={{ color: '#1D4ED8' }}>1 = Low</span>
        <span style={{ color: '#1E3A8A', fontWeight: 700 }}>2 = Medium</span>
        <span style={{ color: 'var(--primary-500)', fontWeight: 800 }}>3 = High</span>
      </div>
    </div>
  );
}

function AttainmentLevelDot({ level }) {
  if (level === null || level === undefined) return null;
  const colors = { 3: '#059669', 2: '#2563EB', 1: '#F59E0B', 0: '#DC2626' };
  return (
    <span
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: colors[level] ?? '#9CA3AF',
        flexShrink: 0,
      }}
      title={`Level ${level}`}
    />
  );
}

export default COPOMatrix;
