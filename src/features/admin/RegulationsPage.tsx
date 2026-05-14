import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { apiGet, apiPost, apiPut } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { Regulation, AcademicYear } from '@/types/phase4'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

export function RegulationsPage() {
  useEffect(() => { document.title = 'Regulations — OBE Attain' }, [])
  const { toast } = useToast()
  const [regs, setRegs]       = useState<Regulation[]>([])
  const [years, setYears]     = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [editingReg, setEditingReg]   = useState<string | null>(null)
  const [editRegVal, setEditRegVal]   = useState('')
  const [newReg, setNewReg]           = useState('')
  const [addingReg, setAddingReg]     = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, y] = await Promise.all([
        apiGet<Regulation[]>(EP.REGULATIONS),
        apiGet<AcademicYear[]>(EP.ACADEMIC_YEARS),
      ])
      setRegs(r); setYears(y)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  async function saveReg(id: string) {
    try {
      const updated = await apiPut<Regulation>(EP.REGULATION_UPDATE(id), { code: editRegVal })
      setRegs((prev) => prev.map((r) => r.id === id ? updated : r))
      setEditingReg(null)
      toast('Regulation updated.', 'success')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
  }

  async function addReg() {
    if (!newReg.trim()) return
    try {
      const created = await apiPost<Regulation>(EP.REGULATION_CREATE, { code: newReg.trim() })
      setRegs((prev) => [...prev, created])
      setNewReg('')
      setAddingReg(false)
      toast('Regulation added.', 'success')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
  }

  async function setCurrentYear(yearId: string) {
    try {
      await apiPut(EP.ACADEMIC_YEAR_UPDATE(yearId), { isCurrent: true })
      setYears((prev) => prev.map((y) => ({ ...y, isCurrent: y.id === yearId })))
      toast('Current year updated.', 'success')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
  }

  return (
    <div>
      <PageHeader title="Regulations & Academic Years" />
      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={fetchAll} /></div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regulations */}
        <SectionCard title="Regulations" actions={
          <Button variant="primary" size="sm" onClick={() => setAddingReg(true)}><Plus size={13} />Add</Button>
        }>
          {loading ? (
            <div className="flex flex-col gap-2 animate-pulse">
              {[1,2,3].map((i) => <div key={i} className="h-10 rounded bg-brand-100" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {regs.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-brand-50 group">
                  {editingReg === reg.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input value={editRegVal} onChange={(e) => setEditRegVal(e.target.value)}
                        className="border border-brand-100 rounded-input px-2 py-1 text-[13px] flex-1 focus:border-brand-900" />
                      <button type="button" onClick={() => void saveReg(reg.id)} className="text-teal-600 hover:text-teal-700"><Check size={15} /></button>
                      <button type="button" onClick={() => setEditingReg(null)} className="text-brand-300 hover:text-brand-700"><X size={15} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-brand-950 text-[13px]">{reg.code}</span>
                      <div className="flex items-center gap-2">
                        {reg.subjectCount !== undefined && (
                          <span className="text-brand-300 text-[11px]">{reg.subjectCount} subjects</span>
                        )}
                        <button type="button" onClick={() => { setEditingReg(reg.id); setEditRegVal(reg.code) }}
                          className="opacity-0 group-hover:opacity-100 text-brand-300 hover:text-brand-700 transition-opacity">
                          <Pencil size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {addingReg && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <input value={newReg} onChange={(e) => setNewReg(e.target.value)} placeholder="e.g. R2023"
                    autoFocus
                    className="border border-brand-100 rounded-input px-2 py-1 text-[13px] flex-1 focus:border-brand-900" />
                  <button type="button" onClick={() => void addReg()} className="text-teal-600"><Check size={15} /></button>
                  <button type="button" onClick={() => setAddingReg(false)} className="text-brand-300"><X size={15} /></button>
                </div>
              )}
              {regs.length === 0 && !addingReg && (
                <p className="text-brand-300 text-[13px] text-center py-4">No regulations defined.</p>
              )}
            </div>
          )}
        </SectionCard>

        {/* Academic Years */}
        <SectionCard title="Academic Years">
          {loading ? (
            <div className="flex flex-col gap-2 animate-pulse">
              {[1,2,3].map((i) => <div key={i} className="h-10 rounded bg-brand-100" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {years.map((year) => (
                <div key={year.id} className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-brand-50">
                  <span className="text-brand-950 text-[13px]">{year.label}</span>
                  <div className="flex items-center gap-2">
                    {year.isCurrent && (
                      <span className="bg-teal-50 text-teal-600 text-[11px] font-medium rounded-full px-2 py-0.5">Current</span>
                    )}
                    <input type="radio" name="current-year" checked={year.isCurrent}
                      onChange={() => void setCurrentYear(year.id)}
                      aria-label={`Set ${year.label} as current`}
                      className="accent-teal-500" />
                  </div>
                </div>
              ))}
              {years.length === 0 && <p className="text-brand-300 text-[13px] text-center py-4">No academic years defined.</p>}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
