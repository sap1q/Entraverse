'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Archive, ArchiveRestore, Check, RefreshCw } from 'lucide-react';
import api, { isAxiosError } from '@/lib/axios';

interface JurnalSyncButtonProps {
  productId: string;
  initialArchived?: boolean;
  showArchiveControls?: boolean;
  onSyncComplete?: () => void;
  onArchiveChange?: (archived: boolean) => void;
}

type SyncStatus = 'idle' | 'success' | 'error';
type ActionType = 'sync' | 'archive' | 'unarchive' | null;

export const JurnalSyncButton = ({
  productId,
  initialArchived = false,
  showArchiveControls = true,
  onSyncComplete,
  onArchiveChange,
}: JurnalSyncButtonProps) => {
  const [isArchived, setIsArchived] = useState(initialArchived);
  const [processingAction, setProcessingAction] = useState<ActionType>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setIsArchived(initialArchived);
  }, [initialArchived]);

  const runAction = async (
    action: Exclude<ActionType, null>,
    endpoint: string,
    successMessage: string,
    onSuccess?: () => void
  ) => {
    setProcessingAction(action);
    setStatus('idle');
    setMessage('');

    try {
      const response = await api.post(endpoint);
      if (response.data?.success) {
        setStatus('success');
        setMessage(response.data?.message ?? successMessage);
        onSuccess?.();
      } else {
        setStatus('error');
        setMessage(response.data?.message ?? 'Action failed.');
      }
    } catch (error: unknown) {
      setStatus('error');
      if (isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? 'Action failed.');
      } else {
        setMessage('Action failed.');
      }
    } finally {
      setProcessingAction(null);
      window.setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    }
  };

  const syncButtonClasses =
    status === 'success'
      ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
      : status === 'error'
        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
        : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100';

  const archiveButtonClasses = isArchived
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100';

  const handleSync = async () => {
    await runAction(
      'sync',
      `/v1/integrations/jurnal/products/${productId}/sync`,
      'Product synced to Jurnal.',
      () => onSyncComplete?.()
    );
  };

  const handleArchiveToggle = async () => {
    const targetArchivedState = !isArchived;
    const endpoint = targetArchivedState
      ? `/v1/integrations/jurnal/products/${productId}/archive`
      : `/v1/integrations/jurnal/products/${productId}/unarchive`;

    await runAction(
      targetArchivedState ? 'archive' : 'unarchive',
      endpoint,
      targetArchivedState ? 'Product archived in Jurnal.' : 'Product unarchived in Jurnal.',
      () => {
        setIsArchived(targetArchivedState);
        onArchiveChange?.(targetArchivedState);
      }
    );
  };

  const syncing = processingAction === 'sync';
  const archiving = processingAction === 'archive' || processingAction === 'unarchive';
  const hasActiveProcess = processingAction !== null;
  const syncLabel = syncing ? 'Syncing...' : 'Sync to Jurnal';
  const archiveLabel = archiving ? 'Processing...' : isArchived ? 'Unarchive Jurnal' : 'Archive Jurnal';

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleSync}
        disabled={hasActiveProcess}
        className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${syncButtonClasses}`}
        aria-label={syncLabel}
        title={syncLabel}
      >
        {syncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : status === 'success' ? (
          <Check className="h-4 w-4" />
        ) : status === 'error' ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        <span className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {syncLabel}
        </span>
      </button>

      {showArchiveControls ? (
        <button
          type="button"
          onClick={handleArchiveToggle}
          disabled={hasActiveProcess}
          className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${archiveButtonClasses}`}
          aria-label={archiveLabel}
          title={archiveLabel}
        >
          {archiving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : isArchived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          <span className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {archiveLabel}
          </span>
        </button>
      ) : null}

      {message ? <span className="sr-only">{message}</span> : null}
    </div>
  );
};

export default JurnalSyncButton;
