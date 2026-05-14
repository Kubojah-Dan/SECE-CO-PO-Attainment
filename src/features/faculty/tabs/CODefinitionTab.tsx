import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { CourseOutcome, BloomsLevel } from '@/types/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

const MAX_COS = 6

const BLOOMS_OPTIONS: { value: BloomsLevel; label: string }[] = [
  { value: 'L1', label: 'L1 – Remember' },
  { value: 'L2', label: 'L2 – Understand' },
  { value: 'L3', label: 'L3 – Apply' },
  { value: 'L4', label: 'L4 – Analyze' },
  { value: 'L5', label: 'L5 – Evaluate' },
  { value: 'L6', label: 'L6 – Create' },
]

interface COFormData {
  coNumber: string
  description: string
  bloomsLevel: BloomsLevel
  targetPercentage: number
}

const defaultForm = (): COFormData => ({
  coNumber: '',
  description: '',
  bloomsLevel: 'L1',
  targetPercentage: 60,
})

interface Props { subjectId: string }

export function CODefinitionTab({ subjectId }: Props) {
  const { toast } = useToast()
  const [cos, setCos] = useState<CourseOutcome[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCO, setEditingCO] = useState<CourseOutcome | null>(null)
  const [form, setForm] = useState<COFormData>(defaultForm())
  const [formErrors, setFormErrors] = useState<Partial<COFormData>>({})
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)  // coId being confirmed
  const [deleting, setDeleting] = useState(false)
  const descRef = useRef<HTMLTextAreaElement>(null)

  const fetchCOs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<CourseOutcome[]>(EP.COS_BY_SUBJECT(subjectId))
      setCos(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load COs.')
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => { void fetchCOs() }, [fetchCOs])

  function openAdd() {
    const nextNum = `CO${cos.length + 1}`
    setEditingCO(null)
    setForm({ ...defaultForm(), coNumber: nextNum })
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(co: CourseOutcome) {
    setEditingCO(co)
    setForm({
      coNumber: co.coNumber,
      description: co.description,
      bloomsLevel: co.bloomsLevel,
      targetPercentage: co.targetPercentage,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function validate(): boolean {
    const errs: Partial<COFormData> = {}
    if (!form.coNumber.trim()) errs.coNumber = 'Required'
    if (!editingCO && cos.some((c) => c.coNumber === form.coNumber.trim())) {
      errs.coNumber = 'CO number already exists'
    }
    if (!form.description.trim() || form.description.trim().length < 10) {
      errs.description = 'Min 10 characters required'
    }
    if (form.targetPercentage < 0 || form.targetPercentage > 100) {
      errs.targetPercentage = 60 as unknown as string
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      if (editingCO) {
        const updated = await apiPut<CourseOutcome>(
          EP.CO_UPDATE(subjectId, editingCO.id),
          form
        )
        setCos((prev) => prev.map((c) => (c.id === editingCO.id ? updated : c)))
        toast('CO updated successfully.', 'success')
      } else {
        const created = await apiPost<CourseOutcome>(EP.CO_CREATE(subjectId), form)
        setCos((prev) => [...prev, created])
        toast('CO added successfully.', 'success')
      }
      setModalOpen(false)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save CO.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(coId: string) {
    setDeleting(true)
    try {
      await apiDelete(EP.CO_DELETE(subjectId, coId))
      setCos((prev) => prev.filter((c) => c.id !== coId))
      toast('CO deleted.', 'info')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete CO.', 'error')
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-card bg-brand-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-brand-950 text-[15px] font-medium">Course Outcomes</h2>
        <div className="flex items-center gap-2">
          {cos.length >= MAX_COS && (
            <span className="text-brand-300 text-[12px]">Max {MAX_COS} COs reached</span>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={cos.length >= MAX_COS}
            onClick={openAdd}
            title={cos.length >= MAX_COS ? `Maximum ${MAX_COS} COs per subject` : undefined}
          >
            <Plus size={14} aria-hidden="true" />
            Add CO
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchCOs} />}

      {/* CO table */}
      {cos.length === 0 && !loading ? (
        <div className="text-center py-14 text-brand-300 text-[13px]">
          No COs defined yet. Click "Add CO" to start.
        </div>
      ) : (
        <div className="bg-white border border-brand-100 rounded-card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-brand-100">
                {['CO No.', 'Description', "Bloom's Level", 'Target %', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cos.map((co, i) => (
                <tr key={co.id} className={clsx('border-b border-brand-100 last:border-0', i % 2 !== 0 && 'bg-brand-50/40')}>
                  <td className="px-4 py-3 font-medium text-brand-500 w-20">{co.coNumber}</td>
                  <td className="px-4 py-3 text-brand-950 max-w-[280px]">
                    <p className="line-clamp-2 leading-snug">{co.description}</p>
                  </td>
                  <td className="px-4 py-3 text-brand-950 w-36">
                    {BLOOMS_OPTIONS.find((b) => b.value === co.bloomsLevel)?.label ?? co.bloomsLevel}
                  </td>
                  <td className="px-4 py-3 tabular-nums w-24">{co.targetPercentage}%</td>
                  <td className="px-4 py-3 w-32">
                    {deleteConfirm === co.id ? (
                      /* Inline delete confirm */
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-red-600 font-medium">Delete?</span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(co.id)}
                          disabled={deleting}
                          className="text-[11px] text-red-600 underline hover:no-underline"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[11px] text-brand-300 underline hover:no-underline"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(co)}
                          className="p-1.5 rounded text-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                          aria-label={`Edit ${co.coNumber}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(co.id)}
                          className="p-1.5 rounded text-brand-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label={`Delete ${co.coNumber}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCO ? `Edit ${editingCO.coNumber}` : 'Add Course Outcome'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>
              {editingCO ? 'Save changes' : 'Add CO'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="co-number"
            label="CO Number"
            placeholder="CO1"
            value={form.coNumber}
            onChange={(v) => setForm((f) => ({ ...f, coNumber: v }))}
            error={formErrors.coNumber as string}
          />

          {/* Description textarea */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="co-description" className="text-[13px] font-medium text-brand-950">
              Description
            </label>
            <textarea
              id="co-description"
              ref={descRef}
              rows={3}
              maxLength={250}
              placeholder="Describe what students will be able to do…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={clsx(
                'w-full border rounded-input px-3.5 py-2.5 text-[13px] text-brand-950 resize-none',
                'placeholder:text-brand-300 focus:border-brand-900 transition-colors',
                formErrors.description ? 'border-red-400' : 'border-brand-100'
              )}
            />
            <div className="flex justify-between">
              {formErrors.description && (
                <p className="text-[12px] text-red-500">{formErrors.description as string}</p>
              )}
              <p className="text-[11px] text-brand-300 ml-auto">
                {form.description.length} / 250
              </p>
            </div>
          </div>

          {/* Bloom's level select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="co-blooms" className="text-[13px] font-medium text-brand-950">
              Bloom's Level
            </label>
            <select
              id="co-blooms"
              value={form.bloomsLevel}
              onChange={(e) => setForm((f) => ({ ...f, bloomsLevel: e.target.value as BloomsLevel }))}
              className="border border-brand-100 rounded-input px-3.5 py-2.5 text-[13px] text-brand-950 bg-white focus:border-brand-900"
            >
              {BLOOMS_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* Target % */}
          <Input
            id="co-target"
            label="Target %"
            type="number"
            placeholder="60"
            value={String(form.targetPercentage)}
            onChange={(v) => setForm((f) => ({ ...f, targetPercentage: Number(v) }))}
            error={typeof formErrors.targetPercentage === 'string' ? formErrors.targetPercentage : undefined}
          />
        </div>
      </Modal>
    </div>
  )
}
