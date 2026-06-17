import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Upload, Save } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiUpload } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { MarksData, MarkComponentDef, StudentMark } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard'
import { clsx } from 'clsx'

interface Props {
  subjectId: string
  isLab: boolean
}

export function MarkEntryTab({ subjectId, isLab }: Props) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [marksData, setMarksData]       = useState<MarksData | null>(null)
  const [editedMarks, setEditedMarks]   = useState<Record<string, Record<string, number | null>>>({})
  const [activeComp, setActiveComp]     = useState<string>('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [isDirty, setIsDirty]           = useState(false)

  useUnsavedGuard(isDirty)

  const fetchMarks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<MarksData>(EP.SUBJECT_MARKS(subjectId))
      setMarksData(data)
      /* Build initial edited marks from fetched data */
      const init: Record<string, Record<string, number | null>> = {}
      data.students.forEach((s) => {
        init[s.rollNo] = { ...s.marks }
      })
      setEditedMarks(init)
      setIsDirty(false)
      if (data.components.length > 0) {
        setActiveComp(data.components[0].key)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load marks.')
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => { void fetchMarks() }, [fetchMarks])

  function handleMarkChange(rollNo: string, compKey: string, raw: string) {
    const parsed = raw === '' ? null : parseInt(raw, 10)
    const value = parsed !== null && isNaN(parsed) ? 0 : parsed
    setEditedMarks((prev) => ({
      ...prev,
      [rollNo]: { ...prev[rollNo], [compKey]: value },
    }))
    setIsDirty(true)
  }

  async function handleSave() {
    if (!marksData) return
    setSaving(true)
    /* Build payload: array of { rollNo, marks } */
    const payload = marksData.students.map((s) => ({
      rollNo: s.rollNo,
      marks: editedMarks[s.rollNo] ?? s.marks,
    }))
    try {
      await apiPut(EP.SUBJECT_MARKS(subjectId), { students: payload })
      setIsDirty(false)
      toast('Marks saved successfully.', 'success')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save marks.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErrors([])
    const formData = new FormData()
    formData.append('file', file)
    try {
      await apiUpload(EP.MARKS_UPLOAD(subjectId), formData)
      toast('Marks imported from Excel.', 'success')
      void fetchMarks()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed.'
      setUploadErrors([msg])
      toast('Excel import failed.', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDownloadTemplate() {
    try {
      const url = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}${EP.MARKS_TEMPLATE(subjectId)}`
      window.open(url, '_blank')
    } catch {
      toast('Failed to download template.', 'error')
    }
  }

  /* Count entries for the active component */
  const currentComp: MarkComponentDef | undefined = marksData?.components.find(
    (c) => c.key === activeComp
  )
  const filledCount = marksData?.students.filter(
    (s) => editedMarks[s.rollNo]?.[activeComp] !== null &&
           editedMarks[s.rollNo]?.[activeComp] !== undefined
  ).length ?? 0

  function isExceedingMax(rollNo: string, compKey: string, max: number): boolean {
    const v = editedMarks[rollNo]?.[compKey]
    return v !== null && v !== undefined && v > max
  }

  /* Keyboard navigation — tab moves to next mark cell */
  function handleMarkKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    _compKey: string
  ) {
    if (e.key === 'Tab') return  // browser default Tab is fine
    if (e.key === 'Enter') {
      e.preventDefault()
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-mark-input]')
      const arr = Array.from(inputs)
      const idx = arr.indexOf(e.currentTarget)
      arr[idx + 1]?.focus()
    }
  }

  if (loading) {
    return (
      <div className="pt-4 animate-pulse flex flex-col gap-4">
        <div className="h-8 w-full rounded bg-brand-100" />
        <div className="h-64 rounded-card bg-brand-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-4">
        <ErrorBanner message={error} onRetry={fetchMarks} />
      </div>
    )
  }

  if (!marksData) return null

  const compsToShow = isLab
    ? marksData.components
    : marksData.components.filter((c) => c.type !== 'lab')

  return (
    <div className="pt-2 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-brand-950 text-[15px] font-medium">Mark Entry</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDownloadTemplate()}
            className="flex items-center gap-1.5 text-[12px] text-brand-700 hover:text-brand-900 transition-colors"
          >
            <Download size={13} aria-hidden="true" />
            Download template
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            id="mark-excel-upload"
            onChange={(e) => void handleExcelUpload(e)}
          />
          <Button
            variant="ghost"
            size="sm"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={13} aria-hidden="true" />
            Upload Excel
          </Button>
        </div>
      </div>

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-red-700 text-[13px] font-medium mb-1">Import errors:</p>
          <ul className="list-disc list-inside">
            {uploadErrors.map((e, i) => (
              <li key={i} className="text-red-600 text-[12px]">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Component tabs */}
      <div className="flex border-b border-brand-100">
        {compsToShow.map((comp) => (
          <button
            key={comp.key}
            type="button"
            id={`comp-tab-${comp.key}`}
            onClick={() => setActiveComp(comp.key)}
            className={clsx(
              'px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors',
              activeComp === comp.key
                ? 'border-brand-900 text-brand-900'
                : 'border-transparent text-brand-300 hover:text-brand-700'
            )}
          >
            {comp.label}
          </button>
        ))}
      </div>

      {/* CO mapping info */}
      {currentComp && currentComp.coMappings.length > 0 && (
        <div className="flex items-center gap-1.5 text-[12px] text-brand-300">
          <span className="font-medium">Maps to:</span>
          {currentComp.coMappings.map((co) => (
            <span
              key={co}
              className="bg-brand-50 text-brand-500 rounded px-1.5 py-0.5 text-[11px] font-medium"
            >
              {co}
            </span>
          ))}
        </div>
      )}

      {/* Mark table */}
      {currentComp && (
        <div className="overflow-x-auto border border-brand-100 rounded-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-brand-100">
                <th className="text-left px-4 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide whitespace-nowrap w-28">
                  Roll No.
                </th>
                <th className="text-left px-4 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">
                  Student Name
                </th>
                <th className="text-left px-4 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide w-32">
                  {currentComp.label}
                  <span className="text-brand-300 font-normal ml-1">/ {currentComp.maxMarks}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {marksData.students.map((student, i) => {
                const val = editedMarks[student.rollNo]?.[activeComp]
                const exceeds = val !== null && val !== undefined && val > currentComp.maxMarks
                return (
                  <tr
                    key={student.rollNo}
                    className={clsx(
                      'border-b border-brand-100 last:border-0',
                      i % 2 !== 0 && 'bg-brand-50/40'
                    )}
                  >
                    <td className="px-4 py-2 text-brand-500 font-medium tabular-nums">
                      {student.rollNo}
                    </td>
                    <td className="px-4 py-2 text-brand-950">{student.name}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={currentComp.maxMarks}
                        data-mark-input
                        value={val ?? ''}
                        onChange={(e) =>
                          handleMarkChange(student.rollNo, activeComp, e.target.value)
                        }
                        onKeyDown={(e) => handleMarkKeyDown(e, i, activeComp)}
                        aria-label={`${student.name} ${currentComp.label}`}
                        className={clsx(
                          'w-20 border rounded-input px-2.5 py-1.5 text-[13px] text-brand-950',
                          'focus:border-brand-900 transition-colors tabular-nums',
                          exceeds
                            ? 'border-red-400 bg-red-50'
                            : 'border-brand-100 bg-white'
                        )}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 bg-white border-t border-brand-100 -mx-7 px-7 py-3 flex items-center justify-between">
        <p className="text-brand-300 text-[12px]">
          {marksData.students.length} students ·{' '}
          <span className="text-brand-700">{filledCount}</span> marks entered
          {isDirty && (
            <span className="text-amber-700 ml-2">· Unsaved changes</span>
          )}
        </p>
        <Button
          variant="primary"
          size="sm"
          disabled={!isDirty || saving}
          loading={saving}
          onClick={() => void handleSave()}
        >
          <Save size={13} aria-hidden="true" />
          Save marks
        </Button>
      </div>
    </div>
  )
}
