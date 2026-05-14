import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Plus, Upload } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { Student } from '@/types/phase4'
import type { Department } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'

interface StudentForm { rollNo: string; name: string; departmentId: string; batch: string; email: string }
const emptyForm = (): StudentForm => ({ rollNo: '', name: '', departmentId: '', batch: '', email: '' })

export function StudentsPage() {
  useEffect(() => { document.title = 'Students — OBE Attain' }, [])
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [students, setStudents]   = useState<Student[]>([])
  const [depts, setDepts]         = useState<Department[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Student | null>(null)
  const [form, setForm]           = useState<StudentForm>(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [filterDept, setFilterDept] = useState('all')
  const [search, setSearch]       = useState('')
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [errModal, setErrModal]   = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, d] = await Promise.all([
        apiGet<Student[]>(EP.STUDENTS),
        apiGet<Department[]>(EP.DEPARTMENTS),
      ])
      setStudents(s); setDepts(d)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  function openAdd() { setEditing(null); setForm(emptyForm()); setModalOpen(true) }
  function openEdit(s: Student) { setEditing(s); setForm({ rollNo: s.rollNo, name: s.name, departmentId: s.departmentId, batch: s.batch, email: s.email ?? '' }); setModalOpen(true) }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        const u = await apiPut<Student>(EP.STUDENT_UPDATE(editing.id), form)
        setStudents((prev) => prev.map((s) => s.id === editing.id ? u : s))
        toast('Student updated.', 'success')
      } else {
        const c = await apiPost<Student>(EP.STUDENT_CREATE, form)
        setStudents((prev) => [...prev, c])
        toast('Student added.', 'success')
      }
      setModalOpen(false)
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(EP.STUDENT_DELETE(id))
      setStudents((prev) => prev.filter((s) => s.id !== id))
      toast('Student deleted.', 'info')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
    finally { setDeleteId(null) }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await apiPost<{ count: number; errors?: string[] }>(EP.STUDENTS_IMPORT, fd)
      toast(`${res.count} students imported.`, 'success')
      if (res.errors && res.errors.length > 0) { setUploadErrors(res.errors); setErrModal(true) }
      void fetchAll()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Import failed.', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filtered = students.filter((s) => {
    const d = filterDept === 'all' || s.departmentId === filterDept
    const q = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.includes(search)
    return d && q
  })

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'rollNo', label: 'Roll No.', width: '100px', render: (v) => <span className="text-brand-500 font-medium text-[12px]">{v as string}</span> },
    { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-brand-950">{v as string}</span> },
    { key: 'departmentName', label: 'Department' },
    { key: 'batch', label: 'Batch', width: '80px' },
    { key: 'email', label: 'Email', render: (v) => <span className="text-brand-300 text-[12px]">{(v as string) ?? '—'}</span> },
    {
      key: 'id', label: 'Actions', width: '140px',
      render: (v, row) => deleteId === v ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-red-600 font-medium">Delete?</span>
          <button type="button" onClick={() => void handleDelete(v as string)} className="text-[11px] text-red-600 underline">Yes</button>
          <button type="button" onClick={() => setDeleteId(null)} className="text-[11px] text-brand-300 underline">No</button>
        </div>
      ) : (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as Student) }}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteId(v as string) }}
            className="text-red-600 border-red-100 hover:bg-red-50">Del</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Students"
        actions={
          <div className="flex items-center gap-2">
            <a href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}${EP.STUDENTS_TEMPLATE}`}
              download className="text-[12px] text-brand-700 hover:text-brand-900 flex items-center gap-1">
              <Download size={13} />Template
            </a>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              id="student-import" onChange={(e) => void handleImport(e)} />
            <Button variant="ghost" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Upload size={13} />Import Excel
            </Button>
            <Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />Add student</Button>
          </div>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={fetchAll} /></div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white">
          <option value="all">All departments</option>
          {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="search" placeholder="Search name or roll no…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950"
          aria-label="Search students" />
      </div>

      <DataTable columns={columns} data={filtered as Record<string, unknown>[]} loading={loading} emptyMessage="No students found." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Student' : 'Add Student'}
        footer={<><Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>{editing ? 'Save' : 'Add'}</Button></>}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="st-roll" label="Roll Number" value={form.rollNo} onChange={(v) => setForm((f) => ({ ...f, rollNo: v }))} />
            <Input id="st-batch" label="Batch (e.g. 2023)" value={form.batch} onChange={(v) => setForm((f) => ({ ...f, batch: v }))} />
          </div>
          <Input id="st-name" label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="st-dept" className="text-[13px] font-medium text-brand-950">Department</label>
            <select id="st-dept" value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              className="border border-brand-100 rounded-input px-3 py-2 text-[13px] bg-white">
              <option value="">— Select —</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <Input id="st-email" label="Email (optional)" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
        </div>
      </Modal>

      <Modal open={errModal} onClose={() => setErrModal(false)} title="Import Errors"
        footer={<Button variant="primary" size="sm" onClick={() => setErrModal(false)}>Close</Button>}>
        <p className="text-brand-700 text-[13px] mb-3">Some rows had errors:</p>
        <ul className="list-disc list-inside flex flex-col gap-1">
          {uploadErrors.map((e, i) => <li key={i} className="text-red-600 text-[12px]">{e}</li>)}
        </ul>
      </Modal>
    </div>
  )
}
