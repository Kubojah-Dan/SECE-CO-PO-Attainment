import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { PendingApproval, ApprovalDetail, SubjectStatus } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusChip } from '@/components/ui/StatusChip'
import { Modal } from '@/components/ui/Modal'
import { MatrixCell } from '@/components/ui/MatrixCell'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

type FilterTab = 'all' | SubjectStatus

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'approved',  label: 'Approved' },
  { key: 'rejected',  label: 'Rejected' },
]

export function ApprovalsPage() {
  const { toast } = useToast()
  const [approvals, setApprovals]   = useState<PendingApproval[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [filter, setFilter]         = useState<FilterTab>('all')
  const [reviewId, setReviewId]     = useState<string | null>(null)
  const [detail, setDetail]         = useState<ApprovalDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [remark, setRemark]         = useState('')
  const [remarkError, setRemarkError] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [actioning, setActioning]   = useState(false)

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<PendingApproval[]>(EP.SUBJECTS)
      setApprovals(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchApprovals() }, [fetchApprovals])

  async function openReview(id: string) {
    setReviewId(id)
    setDetail(null)
    setDetailLoading(true)
    setShowReject(false)
    setRemark('')
    setRemarkError('')
    try {
      const d = await apiGet<ApprovalDetail>(EP.SUBJECT_BY_ID(id))
      setDetail(d)
    } catch {
      toast('Failed to load subject details.', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeModal() {
    setReviewId(null)
    setDetail(null)
    setShowReject(false)
    setRemark('')
  }

  async function handleApprove() {
    if (!reviewId) return
    setActioning(true)
    try {
      await apiPost(EP.SUBJECT_APPROVE(reviewId), {})
      setApprovals((prev) =>
        prev.map((a) => a.id === reviewId ? { ...a, status: 'approved' as SubjectStatus } : a)
      )
      toast('Subject approved.', 'success')
      closeModal()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Approval failed.', 'error')
    } finally {
      setActioning(false)
    }
  }

  async function handleReject() {
    if (!reviewId) return
    if (remark.trim().length < 10) {
      setRemarkError('Remarks must be at least 10 characters.')
      return
    }
    setActioning(true)
    try {
      await apiPost(EP.SUBJECT_REJECT(reviewId), { remark: remark.trim() })
      setApprovals((prev) =>
        prev.map((a) => a.id === reviewId ? { ...a, status: 'rejected' as SubjectStatus, remark } : a)
      )
      toast('Subject rejected with remarks.', 'info')
      closeModal()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Rejection failed.', 'error')
    } finally {
      setActioning(false)
    }
  }

  const filtered = filter === 'all'
    ? approvals
    : approvals.filter((a) => a.status === filter)

  const pendingCount = approvals.filter((a) => a.status === 'pending' || a.status === 'submitted').length

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'subjectCode',
      label: 'Subject',
      render: (v, row) => (
        <div>
          <p className="font-medium text-brand-500 text-[12px]">{v as string}</p>
          <p className="text-brand-950 text-[12px]">{row.subjectName as string}</p>
        </div>
      ),
    },
    { key: 'facultyName', label: 'Faculty' },
    { key: 'submittedAt', label: 'Submitted On' },
    {
      key: 'avgCOAttainment',
      label: 'Avg CO Att.',
      width: '110px',
      render: (v) => <span className="tabular-nums font-medium">{(v as number).toFixed(1)}%</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (v) => <StatusChip status={v as SubjectStatus} />,
    },
    {
      key: 'id',
      label: 'Action',
      width: '90px',
      render: (v) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            void openReview(v as string)
          }}
        >
          Review
        </Button>
      ),
    },
  ]

  const currentApproval = approvals.find((a) => a.id === reviewId)

  return (
    <div>
      <PageHeader
        title="Pending Approvals"
        actions={
          pendingCount > 0 && (
            <span className="bg-amber-50 text-amber-700 text-[11px] font-medium rounded-full px-2.5 py-0.5">
              {pendingCount} pending
            </span>
          )
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={fetchApprovals} /></div>}

      {/* Filter tabs */}
      <div className="flex border-b border-brand-100 mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={clsx(
              'px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
              filter === tab.key
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-brand-300 hover:text-brand-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No submissions found."
        onRowClick={(row) => void openReview(row.id as string)}
      />

      {/* Review Modal */}
      <Modal
        open={reviewId !== null}
        onClose={closeModal}
        title={currentApproval
          ? `Review — ${currentApproval.subjectCode} ${currentApproval.subjectName}`
          : 'Review Subject'}
        width="w-[680px]"
        footer={
          <div className="flex items-start gap-3 w-full">
            {/* Reject flow */}
            <div className="flex-1">
              {showReject && (
                <div className="flex flex-col gap-1.5 mb-2">
                  <label htmlFor="reject-remark" className="text-[13px] font-medium text-brand-950">
                    Remarks (required)
                  </label>
                  <textarea
                    id="reject-remark"
                    rows={2}
                    value={remark}
                    onChange={(e) => { setRemark(e.target.value); setRemarkError('') }}
                    placeholder="Explain what needs to be corrected…"
                    className={clsx(
                      'w-full border rounded-input px-3 py-2 text-[13px] text-brand-950 resize-none',
                      remarkError ? 'border-red-400' : 'border-brand-100 focus:border-brand-900'
                    )}
                  />
                  {remarkError && <p className="text-[12px] text-red-500">{remarkError}</p>}
                </div>
              )}
              {showReject ? (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowReject(false); setRemark('') }}
                  >
                    Cancel
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleReject()}
                    disabled={actioning}
                    className="px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded-input hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {actioning ? 'Rejecting…' : 'Confirm reject'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowReject(true)}
                  className="px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded-input hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
              )}
            </div>

            {/* Approve */}
            {!showReject && (
              <Button
                variant="primary"
                size="sm"
                loading={actioning}
                onClick={() => void handleApprove()}
                className="bg-teal-600 hover:opacity-85"
              >
                Approve
              </Button>
            )}
          </div>
        }
      >
        {detailLoading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-32 rounded-card bg-brand-100" />
            <div className="h-40 rounded-card bg-brand-100" />
          </div>
        ) : detail ? (
          <div className="flex flex-col gap-6">
            {/* CO attainment table */}
            <div>
              <h3 className="text-brand-950 text-[13px] font-medium mb-3">CO Attainment</h3>
              <div className="border border-brand-100 rounded-card overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-brand-100">
                      {['CO','Direct %','Indirect %','Final %','Target %','Status'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-brand-300 text-[11px] font-medium uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.coAttainment.map((row, i) => (
                      <tr key={row.coId} className={clsx('border-b border-brand-100 last:border-0', i % 2 !== 0 && 'bg-brand-50/40')}>
                        <td className="px-3 py-2 font-medium text-brand-500">{row.coNumber}</td>
                        <td className="px-3 py-2 tabular-nums">{row.directAttainment.toFixed(1)}%</td>
                        <td className="px-3 py-2 tabular-nums">{row.indirectAttainment?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-2 tabular-nums font-medium">{row.finalAttainment?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{row.targetPercentage}%</td>
                        <td className="px-3 py-2">
                          {row.finalAttainment !== null && row.finalAttainment !== undefined && (
                            row.finalAttainment >= row.targetPercentage
                              ? <span className="text-teal-600 text-[11px] font-medium">Met</span>
                              : <span className="text-red-600 text-[11px] font-medium">Below</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CO-PO mapping (read-only) */}
            {detail.mapping && detail.mapping.poList.length > 0 && (
              <div>
                <h3 className="text-brand-950 text-[13px] font-medium mb-3">CO-PO Mapping</h3>
                <div className="overflow-x-auto border border-brand-100 rounded-card">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-white border-b border-r border-brand-100 px-3 py-2 text-left text-[11px] font-medium text-brand-300 uppercase min-w-[60px]">
                          CO
                        </th>
                        {[...detail.mapping.poList.map((p) => p.code), ...detail.mapping.psoList.map((p) => p.code)].map((col) => (
                          <th key={col} className="border-b border-r border-brand-100 px-1 py-2 text-center text-[10px] font-medium text-brand-300 uppercase w-10">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(detail.mapping.mapping).map(([coId, colMap], ri) => {
                        const coLabel = detail.coAttainment.find((c) => c.coId === coId)?.coNumber ?? coId
                        return (
                          <tr key={coId} className={ri % 2 !== 0 ? 'bg-brand-50/30' : ''}>
                            <td className="sticky left-0 z-10 border-b border-r border-brand-100 px-3 py-1"
                              style={{ background: ri % 2 !== 0 ? '#F7F8FA' : '#FFFFFF' }}>
                              <span className="text-brand-500 text-[11px] font-medium">{coLabel}</span>
                            </td>
                            {[...detail.mapping.poList.map((p) => p.code), ...detail.mapping.psoList.map((p) => p.code)].map((col) => (
                              <td key={col} className="border-b border-r border-brand-100 p-1 text-center">
                                <MatrixCell value={(colMap[col] as 0|1|2|3) ?? 0} readonly />
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
