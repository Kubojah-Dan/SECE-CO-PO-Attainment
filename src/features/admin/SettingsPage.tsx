import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPut, apiPost } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { AttainmentSettings, BackupEntry } from '@/types/phase4'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'

export function SettingsPage() {
  useEffect(() => { document.title = 'Settings — OBE Attain' }, [])
  const { toast } = useToast()

  /* Attainment settings */
  const [settings, setSettings]   = useState<AttainmentSettings>({ directWeight: 80, indirectWeight: 20, targetMetThreshold: 60, nearTargetThreshold: 50 })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savingSettings, setSavingSettings]   = useState(false)

  /* Backup */
  const [backups, setBackups]     = useState<BackupEntry[]>([])
  const [backupsLoading, setBackupsLoading] = useState(true)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoreId, setRestoreId] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const s = await apiGet<AttainmentSettings>(EP.SETTINGS)
      setSettings(s)
    } catch { /* use defaults */ } finally { setSettingsLoading(false) }
  }, [])

  const fetchBackups = useCallback(async () => {
    try {
      const b = await apiGet<BackupEntry[]>(EP.CONFIG_BACKUP_LIST)
      setBackups(b)
    } catch { /* ignore */ } finally { setBackupsLoading(false) }
  }, [])

  useEffect(() => { void fetchSettings(); void fetchBackups() }, [fetchSettings, fetchBackups])

  async function saveSettings() {
    setSavingSettings(true)
    try {
      await apiPut(EP.SETTINGS, settings)
      toast('Settings saved. Recalculate all subjects to apply changes.', 'success')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed.', 'error') }
    finally { setSavingSettings(false) }
  }

  async function createBackup() {
    setCreatingBackup(true)
    try {
      const b = await apiPost<BackupEntry>(EP.CONFIG_BACKUP, {})
      setBackups((prev) => [b, ...prev])
      toast('Backup created.', 'success')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Backup failed.', 'error') }
    finally { setCreatingBackup(false) }
  }

  async function restoreBackup(id: string) {
    try {
      await apiPost(`${EP.CONFIG_BACKUP}/${id}/restore`, {})
      toast('Restore initiated. This may take a moment.', 'info')
      setRestoreId(null)
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Restore failed.', 'error') }
  }

  const backupCols: Column<Record<string, unknown>>[] = [
    { key: 'filename', label: 'File' },
    { key: 'createdAt', label: 'Created' },
    { key: 'sizeKb', label: 'Size', width: '80px', render: (v) => <span className="tabular-nums">{v as number} KB</span> },
    {
      key: 'id', label: 'Restore', width: '90px',
      render: (v) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setRestoreId(v as string) }}>Restore</Button>
      ),
    },
  ]

  const indirectWeight = 100 - settings.directWeight

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />

      {/* Card 1: Attainment weightage */}
      <SectionCard title="Attainment Weightage"
        actions={<Button variant="primary" size="sm" loading={savingSettings} onClick={() => void saveSettings()}>Save weightage</Button>}>
        {settingsLoading ? (
          <div className="h-20 rounded bg-brand-100 animate-pulse" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-card bg-amber-50 border border-amber-200">
              <p className="text-amber-700 text-[12px]">Warning: Changing this requires recalculating all subject attainments.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="direct-weight" className="text-[13px] font-medium text-brand-950">Direct attainment weight (%)</label>
                <input id="direct-weight" type="number" min={0} max={100} value={settings.directWeight}
                  onChange={(e) => setSettings((s) => ({ ...s, directWeight: Number(e.target.value), indirectWeight: 100 - Number(e.target.value) }))}
                  className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 focus:border-brand-900" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-brand-950">Indirect attainment weight (auto)</label>
                <div className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-300 bg-brand-50">{indirectWeight}%</div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Card 2: Thresholds */}
      <SectionCard title="CO Attainment Thresholds"
        actions={<Button variant="primary" size="sm" loading={savingSettings} onClick={() => void saveSettings()}>Save thresholds</Button>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="met-threshold" className="text-[13px] font-medium text-brand-950">Target met threshold (%)</label>
            <input id="met-threshold" type="number" min={0} max={100} value={settings.targetMetThreshold}
              onChange={(e) => setSettings((s) => ({ ...s, targetMetThreshold: Number(e.target.value) }))}
              className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 focus:border-brand-900" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="near-threshold" className="text-[13px] font-medium text-brand-950">Near target threshold (%)</label>
            <input id="near-threshold" type="number" min={0} max={100} value={settings.nearTargetThreshold}
              onChange={(e) => setSettings((s) => ({ ...s, nearTargetThreshold: Number(e.target.value) }))}
              className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 focus:border-brand-900" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-brand-950">Below target (auto)</label>
            <div className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-300 bg-brand-50">
              &lt; {settings.nearTargetThreshold}%
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Card 3: Backup */}
      <SectionCard title="Backup & Restore"
        actions={<Button variant="primary" size="sm" loading={creatingBackup} onClick={() => void createBackup()}>Create backup now</Button>}>
        <DataTable
          columns={backupCols}
          data={backups as Record<string, unknown>[]}
          loading={backupsLoading}
          emptyMessage="No backups yet. Create one above."
        />
      </SectionCard>

      {/* Restore confirm modal */}
      <Modal open={restoreId !== null} onClose={() => setRestoreId(null)} title="Confirm Restore"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRestoreId(null)}>Cancel</Button>
            <Button variant="primary" size="sm" className="bg-red-600 hover:opacity-85"
              onClick={() => void restoreBackup(restoreId!)}>Restore</Button>
          </>
        }>
        <p className="text-brand-950 text-[13px]">
          Restoring will <strong>overwrite all current data</strong>. This cannot be undone. Are you sure?
        </p>
      </Modal>
    </div>
  )
}
