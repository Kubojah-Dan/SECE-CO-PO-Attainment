import { useEffect, useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { ReportJob } from '@/types/phase4'
import { clsx } from 'clsx'

interface ReportJobBannerProps {
  jobId: string
  filename: string
  onDismiss: () => void
}

export function ReportJobBanner({ jobId, filename, onDismiss }: ReportJobBannerProps) {
  const [status, setStatus] = useState<ReportJob['status']>('pending')
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>()

  useEffect(() => {
    if (status === 'done' || status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const job = await apiGet<ReportJob>(EP.REPORT_JOB_BY_ID(jobId))
        setStatus(job.status)
        if (job.status === 'done') {
          setDownloadUrl(job.downloadUrl)
          clearInterval(interval)
          // Auto-dismiss after 10s
          setTimeout(onDismiss, 10000)
        } else if (job.status === 'failed') {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
        setStatus('failed')
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [jobId, status, onDismiss])

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-3 rounded-card border px-4 py-3 text-[13px]',
        status === 'pending' && 'bg-brand-50 border-brand-100 text-brand-700',
        status === 'done'    && 'bg-teal-50 border-teal-200 text-teal-700',
        status === 'failed'  && 'bg-red-50 border-red-200 text-red-700'
      )}
      role="status"
    >
      <div className="flex items-center gap-2">
        {status === 'pending' && (
          <RefreshCw size={14} className="animate-spin shrink-0" aria-hidden="true" />
        )}
        {status === 'pending' && <span>Generating report…</span>}
        {status === 'done'    && <span>Report ready — {filename}</span>}
        {status === 'failed'  && <span>Report generation failed.</span>}
      </div>

      <div className="flex items-center gap-2">
        {status === 'done' && downloadUrl && (
          <a
            href={downloadUrl}
            download={filename}
            className="flex items-center gap-1 text-[12px] font-medium text-teal-700 hover:underline"
          >
            <Download size={13} aria-hidden="true" />
            Download
          </a>
        )}
        {status === 'failed' && (
          <button
            type="button"
            onClick={() => setStatus('pending')}
            className="text-[12px] text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
