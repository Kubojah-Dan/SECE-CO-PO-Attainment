import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { Department, UserRecord } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

interface DeptForm { name: string; code: string; description: string; hodId: string }
const emptyForm = (): DeptForm => ({ name: '', code: '', description: '', hodId: '' })

export function DepartmentsPage() {
  useEffect(() => { document.title = 'Departments — OBE Attain' }, [])
  const { toast } = useToast()
  const [depts, setDepts]       = useState<Department[]>([])
  const [hods, setHods]         = useState<UserRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<Department | null>(null)
  const [form, setForm]         = useState<DeptForm>(emptyForm())
  const [saving, setSaving]     = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [d, u] = await Promise.all([
        apiGet<Department[]>(EP.DEPARTMENTS),
        apiGet<UserRecord[]>(`${EP.USERS}?role=hod`),
      ])
      setDepts(d)
      setHods(u)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  function openAdd() { setEditing(null); setForm(emptyForm()); setModalOpen(true) }
  function openEdit(d: Department) {
    setEditing(d)
    setForm({ name: d.name, code: d.code, description: '', hodId: '' })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        const updated = await apiPut<Department>(EP.DEPARTMENT_UPDATE(editing.id), form)
        setDepts((prev) => prev.map((d) => d.id === editing.id ? updated : d))
        toast('Department updated.', 'success')
      } else {
        const created = await apiPost<Department>(EP.DEPARTMENT_CREATE, form)
        setDepts((prev) => [...prev, created])
        toast('Department created.', 'success')
      }
      setModalOpen(false)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await apiDelete(EP.DEPARTMENT_DELETE(id))
      setDepts((prev) => prev.filter((d) => d.id !== id))
      toast('Department deleted.', 'info')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Cannot delete — subjects exist.', 'error')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code', width: '80px', render: (v) => <span className="text-brand-500 font-medium text-[12px]">{v as string}</span> },
    { key: 'subjects', label: 'Subjects', width: '80px', render: (v) => <span className="tabular-nums">{(v as number) ?? 0}</span> },
    {
      key: 'id', label: 'Actions', width: '140px',
      render: (v, row) => (
        deleteId === v ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-red-600 font-medium">Delete?</span>
            <button type="button" onClick={() => void handleDelete(v as string)} disabled={deleting}
              className="text-[11px] text-red-600 underline">Yes</button>
            <button type="button" onClick={() => setDeleteId(null)} className="text-[11px] text-brand-300 underline">No</button>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as Department) }}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteId(v as string) }}
              className="text-red-600 border-red-100 hover:bg-red-50">Del</Button>
          </div>
        )
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Departments"
        actions={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />New department</Button>} />
      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={fetchAll} /></div>}
      <DataTable columns={columns} data={depts as Record<string, unknown>[]} loading={loading} emptyMessage="No departments found." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'New Department'}
        footer={<><Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>{editing ? 'Save' : 'Create'}</Button></>}>
        <div className="flex flex-col gap-4">
          <Input id="dept-name" label="Department name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Input id="dept-code" label="Code (e.g. CSE)" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} />
          <Input id="dept-desc" label="Description (optional)" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dept-hod" className="text-[13px] font-medium text-brand-950">HOD</label>
            <select id="dept-hod" value={form.hodId} onChange={(e) => setForm((f) => ({ ...f, hodId: e.target.value }))}
              className="border border-brand-100 rounded-input px-3.5 py-2.5 text-[13px] text-brand-950 bg-white">
              <option value="">— Not assigned —</option>
              {hods.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
