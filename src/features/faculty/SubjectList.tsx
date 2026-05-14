import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { Subject } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusChip } from '@/components/ui/StatusChip'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Button } from '@/components/ui/Button'

const SEMESTERS = ['All', '1', '2', '3', '4', '5', '6', '7', '8']
const ACADEMIC_YEARS = ['All', '2025-26', '2024-25', '2023-24']

export function SubjectList() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [semester, setSemester] = useState('All')
  const [academicYear, setAcademicYear] = useState('All')

  const fetchSubjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<Subject[]>(`${EP.SUBJECTS}?facultyId=me`)
      setSubjects(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load subjects.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchSubjects() }, [fetchSubjects])

  const filtered = subjects.filter((s) => {
    const matchSearch =
      search === '' ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
    const matchSem = semester === 'All' || String(s.semester) === semester
    return matchSearch && matchSem
  })

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'code',
      label: 'Code',
      width: '100px',
      render: (v) => (
        <span className="font-medium text-brand-500 text-[12px]">{v as string}</span>
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'semester', label: 'Sem', width: '60px' },
    {
      key: 'cosDefined',
      label: 'COs',
      width: '80px',
      render: (v) => <span className="tabular-nums">{v as number} / 6</span>,
    },
    {
      key: 'marksUploaded',
      label: 'Marks',
      width: '80px',
      render: (v) => (
        <span className={v ? 'text-teal-600' : 'text-brand-300'}>
          {v ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (v) => <StatusChip status={v as Subject['status']} />,
    },
    {
      key: 'id',
      label: 'Actions',
      width: '90px',
      render: (v) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/faculty/subjects/${v as string}`)
          }}
        >
          Open
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="My Subjects" />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={fetchSubjects} />
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          id="filter-year"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          aria-label="Filter by academic year"
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white focus:border-brand-900"
        >
          {ACADEMIC_YEARS.map((y) => (
            <option key={y} value={y}>
              {y === 'All' ? 'All years' : y}
            </option>
          ))}
        </select>

        <select
          id="filter-semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          aria-label="Filter by semester"
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white focus:border-brand-900"
        >
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All semesters' : `Sem ${s}`}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="subject-search"
            type="search"
            placeholder="Search by code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search subjects"
            className="w-full border border-brand-100 rounded-input pl-8 pr-3 py-2 text-[13px] text-brand-950 placeholder:text-brand-300 bg-white focus:border-brand-900"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No subjects found. Try adjusting filters."
        onRowClick={(row) => navigate(`/faculty/subjects/${row.id as string}`)}
      />
    </div>
  )
}
