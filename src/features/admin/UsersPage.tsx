import { useCallback, useEffect, useState } from 'react'
import { Plus, Copy, Check } from 'lucide-react'
import { apiGet, apiPost, apiPut } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { AdminUser } from '@/types/phase4'
import type { Department } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

const ROLES = ['super_admin','hod','faculty','iqac'] as const
const ROLE_LABELS: Record<string, string> = { super_admin: 'Super Admin', hod: 'HOD', faculty: 'Faculty', iqac: 'IQAC' }
const ROLE_CHIP: Record<string, string> = {
  super_admin: 'bg-brand-900 text-white', hod: 'bg-teal-50 text-teal-600',
  faculty: 'bg-brand-50 text-brand-500', iqac: 'bg-amber-50 text-amber-700',
}

type FilterRole = 'all' | typeof ROLES[number]

interface UserForm {
  name: string; email: string; employeeId: string
  role: typeof ROLES[number]; departmentId: string; tempPassword: string
}

const emptyForm = (): UserForm => ({
  name: '', email: '', employeeId: '', role: 'faculty', departmentId: '', tempPassword: '',
})

function generateTempPassword() {
  return 'OBE@' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function UsersPage() {
  useEffect(() => { document.title = 'Users — OBE Attain' }, [])
  const { toast } = useToast()
  const [users, setUsers]       = useState<AdminUser[]>([])
  const [depts, setDepts]       = useState<Department[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all')
  const [search, setSearch]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<AdminUser | null>(null)
  const [form, setForm]         = useState<UserForm>(emptyForm())
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [u, d] = await Promise.all([
        apiGet<AdminUser[]>(EP.USERS),
        apiGet<Department[]>(EP.DEPARTMENTS),
      ])
      setUsers(u); setDepts(d)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  function openAdd() {
    setEditing(null)
    const pw = generateTempPassword()
    setForm({ ...emptyForm(), tempPassword: pw })
    setModalOpen(true)
  }

  function openEdit(u: AdminUser) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, employeeId: u.employeeId ?? '', role: u.role as typeof ROLES[number], departmentId: u.departmentId ?? '', tempPassword: '' })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        const updated = await apiPut<AdminUser>(EP.USER_UPDATE(editing.id), form)
        setUsers((prev) => prev.map((u) => u.id === editing.id ? updated : u))
        toast('User updated.', 'success')
      } else {
        const created = await apiPost<AdminUser>(EP.USER_CREATE, form)
        setUsers((prev) => [created, ...prev])
        toast('User created.', 'success')
      }
      setModalOpen(false)
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed to save.', 'error') }
    finally { setSaving(false) }
  }

  async function toggleStatus(user: AdminUser) {
    try {
      const updated = await apiPut<AdminUser>(EP.USER_UPDATE(user.id), { status: user.status === 'active' ? 'inactive' : 'active' })
      setUsers((prev) => prev.map((u) => u.id === user.id ? updated : u))
      toast(`User ${updated.status}.`, 'info')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
  }

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  function copyPw() {
    void navigator.clipboard.writeText(form.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'name', label: 'Name', render: (v) => <span className="font-medium">{v as string}</span> },
    { key: 'email', label: 'Email', render: (v) => <span className="text-brand-300 text-[12px]">{v as string}</span> },
    {
      key: 'role', label: 'Role', width: '100px',
      render: (v) => <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-medium', ROLE_CHIP[v as string] ?? 'bg-brand-50 text-brand-500')}>{ROLE_LABELS[v as string] ?? v as string}</span>,
    },
    { key: 'departmentName', label: 'Department', render: (v) => <span>{(v as string) ?? '—'}</span> },
    {
      key: 'status', label: 'Status', width: '90px',
      render: (v) => <span className={clsx('text-[11px] font-medium', v === 'active' ? 'text-teal-600' : 'text-brand-300')}>{v as string}</span>,
    },
    {
      key: 'id', label: 'Actions', width: '140px',
      render: (v, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as AdminUser) }}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); void toggleStatus(row as unknown as AdminUser) }}
            className="text-[12px]">{row.status === 'active' ? 'Deactivate' : 'Activate'}</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Users" actions={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />New user</Button>} />
      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={fetchAll} /></div>}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['all', ...ROLES] as FilterRole[]).map((r) => (
          <button key={r} type="button" onClick={() => setRoleFilter(r)}
            className={clsx('px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors',
              roleFilter === r ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-500 hover:bg-brand-100')}>
            {r === 'all' ? 'All' : ROLE_LABELS[r]}
          </button>
        ))}
        <input type="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-brand-100 rounded-input px-3 py-1.5 text-[13px] text-brand-950 ml-auto"
          aria-label="Search users" />
      </div>

      <DataTable columns={columns} data={filtered as Record<string, unknown>[]} loading={loading} emptyMessage="No users found." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'New User'}
        footer={<><Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>{editing ? 'Save' : 'Create'}</Button></>}>
        <div className="flex flex-col gap-4">
          <Input id="u-name" label="Full name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Input id="u-email" label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <Input id="u-empid" label="Employee ID" value={form.employeeId} onChange={(v) => setForm((f) => ({ ...f, employeeId: v }))} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="u-role" className="text-[13px] font-medium text-brand-950">Role</label>
            <select id="u-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof ROLES[number] }))}
              className="border border-brand-100 rounded-input px-3.5 py-2.5 text-[13px] text-brand-950 bg-white">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {(form.role === 'hod' || form.role === 'faculty') && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="u-dept" className="text-[13px] font-medium text-brand-950">Department</label>
              <select id="u-dept" value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                className="border border-brand-100 rounded-input px-3.5 py-2.5 text-[13px] text-brand-950 bg-white">
                <option value="">— Select department —</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          {!editing && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-brand-950">Temp password (shown once)</label>
              <div className="flex items-center gap-2 border border-brand-100 rounded-input px-3 py-2 bg-brand-50">
                <code className="flex-1 text-[13px] text-brand-950 font-mono">{form.tempPassword}</code>
                <button type="button" onClick={copyPw} className="text-brand-300 hover:text-brand-700 transition-colors">
                  {copied ? <Check size={15} className="text-teal-500" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
