import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { Subject, Department, UserRecord } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'

interface SubjectForm { code: string; name: string; departmentId: string; regulation: string; semester: string; isLab: boolean }
const emptyForm = (): SubjectForm => ({ code: '', name: '', departmentId: '', regulation: '', semester: '1', isLab: false })

export function SubjectsPage() {
  useEffect(() => { document.title = 'Subjects — OBE Attain' }, [])
  const { toast } = useToast()
  const [subjects, setSubjects]   = useState<Subject[]>([])
  const [depts, setDepts]         = useState<Department[]>([])
  const [facultyList, setFacultyList] = useState<UserRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModal, setAssignModal] = useState<string | null>(null)
  const [editing, setEditing]     = useState<Subject | null>(null)
  const [form, setForm]           = useState<SubjectForm>(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [selectedFaculty, setSelectedFaculty] = useState<string[]>([])
  const [filterDept, setFilterDept] = useState('all')
  const [filterSem, setFilterSem]   = useState('all')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, d] = await Promise.all([
        apiGet<Subject[]>(EP.SUBJECTS),
        apiGet<Department[]>(EP.DEPARTMENTS),
      ])
      setSubjects(s); setDepts(d)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  function openAdd() { setEditing(null); setForm(emptyForm()); setModalOpen(true) }
  function openEdit(s: Subject) { setEditing(s); setForm({ code: s.code, name: s.name, departmentId: s.departmentId, regulation: s.regulation ?? '', semester: String(s.semester), isLab: s.isLab ?? false }); setModalOpen(true) }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = { ...form, semester: parseInt(form.semester, 10) }
      if (editing) {
        const u = await apiPut<Subject>(EP.SUBJECT_UPDATE(editing.id), payload)
        setSubjects((prev) => prev.map((s) => s.id === editing.id ? u : s))
        toast('Subject updated.', 'success')
      } else {
        const c = await apiPost<Subject>(EP.SUBJECT_CREATE, payload)
        setSubjects((prev) => [...prev, c])
        toast('Subject created.', 'success')
      }
      setModalOpen(false)
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  async function openAssignModal(subjectId: string) {
    setAssignModal(subjectId)
    setSelectedFaculty([])
    try {
      const s = subjects.find((x) => x.id === subjectId)
      const fl = await apiGet<UserRecord[]>(`${EP.USERS}?role=faculty&deptId=${s?.departmentId ?? ''}`)
      setFacultyList(fl)
    } catch { setFacultyList([]) }
  }

  async function handleAssignFaculty() {
    if (!assignModal) return
    try {
      await apiPut(EP.SUBJECT_ASSIGN_FACULTY(assignModal), { facultyIds: selectedFaculty })
      toast('Faculty assigned.', 'success')
      setAssignModal(null)
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
  }

  const filtered = subjects.filter((s) => {
    const d = filterDept === 'all' || s.departmentId === filterDept
    const sem = filterSem === 'all' || String(s.semester) === filterSem
    return d && sem
  })

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'code', label: 'Code', width: '80px', render: (v) => <span className="text-brand-500 font-medium text-[12px]">{v as string}</span> },
    { key: 'name', label: 'Name' },
    { key: 'semester', label: 'Sem', width: '50px' },
    { key: 'regulation', label: 'Regulation', width: '90px', render: (v) => <span>{(v as string) ?? '—'}</span> },
    { key: 'facultyName', label: 'Faculty', render: (v) => <span className="text-brand-300 text-[12px]">{(v as string) ?? '—'}</span> },
    { key: 'status', label: 'Status', width: '100px', render: (v) => <StatusChip status={(v as Subject['status']) ?? 'draft'} /> },
    {
      key: 'id', label: 'Actions', width: '180px',
      render: (v, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as Subject) }}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); void openAssignModal(v as string) }}>Assign</Button>
          {deleteId === v ? (
            <>
              <button type="button" onClick={() => { void apiDelete(EP.SUBJECT_DELETE(v as string)); setSubjects((p) => p.filter((s) => s.id !== v)); setDeleteId(null) }}
                className="text-[11px] text-red-600 underline">Yes</button>
              <button type="button" onClick={() => setDeleteId(null)} className="text-[11px] text-brand-300 underline">No</button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteId(v as string) }}
              className="text-red-600 border-red-100 hover:bg-red-50">Del</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Subjects" actions={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />New subject</Button>} />
      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={fetchAll} /></div>}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white">
          <option value="all">All departments</option>
          {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterSem} onChange={(e) => setFilterSem(e.target.value)}
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white">
          <option value="all">All semesters</option>
          {['1','2','3','4','5','6','7','8'].map((s) => <option key={s} value={s}>Sem {s}</option>)}
        </select>
      </div>
      <DataTable columns={columns} data={filtered as Record<string, unknown>[]} loading={loading} emptyMessage="No subjects found." />

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subject' : 'New Subject'}
        footer={<><Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>{editing ? 'Save' : 'Create'}</Button></>}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="s-code" label="Subject Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} />
            <Input id="s-sem" label="Semester" type="number" value={form.semester} onChange={(v) => setForm((f) => ({ ...f, semester: v }))} />
          </div>
          <Input id="s-name" label="Subject Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="s-dept" className="text-[13px] font-medium text-brand-950">Department</label>
              <select id="s-dept" value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                className="border border-brand-100 rounded-input px-3 py-2 text-[13px] bg-white">
                <option value="">— Select —</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <Input id="s-reg" label="Regulation" value={form.regulation} onChange={(v) => setForm((f) => ({ ...f, regulation: v }))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="s-lab" checked={form.isLab} onChange={(e) => setForm((f) => ({ ...f, isLab: e.target.checked }))} />
            <label htmlFor="s-lab" className="text-[13px] text-brand-950">Lab subject</label>
          </div>
        </div>
      </Modal>

      {/* Assign Faculty Modal */}
      <Modal open={assignModal !== null} onClose={() => setAssignModal(null)} title="Assign Faculty"
        footer={<><Button variant="ghost" size="sm" onClick={() => setAssignModal(null)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => void handleAssignFaculty()}>Assign</Button></>}>
        <div className="flex flex-col gap-2">
          {facultyList.length === 0 && <p className="text-brand-300 text-[13px]">No faculty in this department.</p>}
          {facultyList.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-[13px] text-brand-950 cursor-pointer">
              <input type="checkbox" checked={selectedFaculty.includes(f.id)}
                onChange={(e) => setSelectedFaculty((prev) => e.target.checked ? [...prev, f.id] : prev.filter((x) => x !== f.id))} />
              {f.name} <span className="text-brand-300">· {f.email}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  )
}
