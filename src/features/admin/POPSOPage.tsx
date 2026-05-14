import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { apiGet, apiPut } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { POItem, PSOItem } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

interface EditRow { id: string; editing: boolean; draftValue: string }

function PORow({ item, onSave }: { item: POItem; onSave: (id: string, desc: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.description)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(item.id, draft)
    setSaving(false)
    setEditing(false)
  }

  return (
    <tr className="border-b border-brand-100 last:border-0 group hover:bg-brand-50">
      <td className="px-4 py-3 w-16 font-medium text-brand-500 text-[12px]">{item.code}</td>
      <td className="px-4 py-3">
        {editing ? (
          <textarea value={draft} rows={2} onChange={(e) => setDraft(e.target.value)}
            className="w-full border border-brand-100 rounded-input px-2 py-1 text-[13px] text-brand-950 resize-none focus:border-brand-900" />
        ) : (
          <span className="text-brand-950 text-[13px] cursor-pointer" onClick={() => setEditing(true)}>
            {item.description || <span className="text-brand-300">Click to edit…</span>}
          </span>
        )}
      </td>
      <td className="px-4 py-3 w-20 text-right">
        {editing ? (
          <div className="flex items-center gap-1 justify-end">
            <button type="button" onClick={() => void save()} disabled={saving}
              className="text-teal-600 hover:text-teal-700 disabled:opacity-50"><Check size={15} /></button>
            <button type="button" onClick={() => { setEditing(false); setDraft(item.description) }}
              className="text-brand-300 hover:text-brand-700"><X size={15} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-[11px] text-brand-300 hover:text-brand-700 transition-opacity">
            Edit
          </button>
        )}
      </td>
    </tr>
  )
}

export function POPSOPage() {
  useEffect(() => { document.title = 'PO / PSO — OBE Attain' }, [])
  const { toast } = useToast()
  const [pos, setPos]   = useState<POItem[]>([])
  const [psos, setPsos] = useState<PSOItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, ps] = await Promise.all([
        apiGet<POItem[]>(EP.PO_LIST),
        apiGet<PSOItem[]>(EP.PSO_LIST),
      ])
      setPos(p); setPsos(ps)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  async function savePO(id: string, description: string) {
    try {
      const updated = await apiPut<POItem>(EP.PO_UPDATE(id), { description })
      setPos((prev) => prev.map((p) => p.id === id ? updated : p))
      toast('PO updated.', 'success')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
  }

  async function savePSO(id: string, description: string) {
    try {
      const updated = await apiPut<PSOItem>(EP.PSO_UPDATE(id), { description })
      setPsos((prev) => prev.map((p) => p.id === id ? updated : p))
      toast('PSO updated.', 'success')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="PO / PSO Definitions" />

      {/* Warning banner */}
      <div className="flex items-start gap-2 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="text-amber-700 text-[13px]">
          <strong>Note:</strong> Editing PO/PSO descriptions affects display only. Attainment calculations are not affected.
        </span>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchAll} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PO definitions */}
        <SectionCard title="Programme Outcomes (PO1–PO12)">
          {loading ? (
            <div className="flex flex-col gap-2 animate-pulse">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 rounded bg-brand-100" />)}
            </div>
          ) : (
            <div className="overflow-x-auto border border-brand-100 rounded-card">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-brand-100">
                    <th className="text-left px-4 py-2.5 text-brand-300 text-[11px] font-medium uppercase tracking-wide w-16">PO</th>
                    <th className="text-left px-4 py-2.5 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Description</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po) => <PORow key={po.id} item={po} onSave={savePO} />)}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* PSO definitions */}
        <SectionCard title="Programme Specific Outcomes (PSO1–PSO2)">
          {loading ? (
            <div className="flex flex-col gap-2 animate-pulse">
              {[1,2].map((i) => <div key={i} className="h-10 rounded bg-brand-100" />)}
            </div>
          ) : (
            <div className="overflow-x-auto border border-brand-100 rounded-card">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-brand-100">
                    <th className="text-left px-4 py-2.5 text-brand-300 text-[11px] font-medium uppercase tracking-wide w-16">PSO</th>
                    <th className="text-left px-4 py-2.5 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Description</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {psos.map((pso) => <PORow key={pso.id} item={pso as unknown as POItem} onSave={savePSO} />)}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
