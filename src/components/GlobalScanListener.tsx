'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseQRValue } from '@/lib/qrService';

type PendingFile = {
  recordId: string;
  fileId: string;
  identifier: string;
  smsRefNo: string;
  description: string;
  departmentName: string;
  currentStageName: string | null;
  nextStageName: string | null;
  status: string;
};

/** Custom event name the file-detail page listens for to reload its data after a scan-confirmed advance — it fetches client-side, so router.refresh() alone won't touch it. */
export const STAGE_ADVANCED_EVENT = 'fsms:stage-advanced';

const CONFIRM_TIMEOUT_MS = 60_000;
/**
 * The printed QR encodes multi-line text (buildFileInfoQRText), and most
 * physical scanners emit each embedded newline in the payload as a real
 * Enter keystroke — so the *first* Enter does not mean "scan finished",
 * only "one line finished". We instead wait for a short quiet gap after the
 * last keystroke (scanners fire every character within single-digit ms;
 * nothing else on this page types that fast) and only then treat whatever
 * accumulated as the complete scan.
 */
const SCAN_IDLE_MS = 150;

/**
 * GlobalScanListener — mounts invisibly and monitors keyboard input bursts
 * from physical QR scanner devices (which behave like fast keyboard input).
 *
 * Every scan resolves the file and opens it (/admin/file/[fileId]) — the
 * point is to never require manually opening the app and hunting the file
 * down. ADMIN additionally gets a confirm popup with the current/next stage
 * and three ways to resolve it: scan the *same* QR again (within
 * CONFIRM_TIMEOUT_MS) or press Next — both exit the current stage and
 * advance, sending the kiosk message; press Skip to bypass the stage with no
 * remarks and no message; or Cancel (or let it expire) to do nothing.
 */
export default function GlobalScanListener() {
  const router = useRouter();
  const bufferRef = useRef('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const confirmExpiryRef = useRef<NodeJS.Timeout | null>(null);

  const [isAdminUser, setIsAdminUser] = useState(false);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsAdminUser(d.role === 'ADMIN'))
      .catch(() => {});
  }, []);

  const clearPending = () => {
    setPending(null);
    if (confirmExpiryRef.current) clearTimeout(confirmExpiryRef.current);
  };

  const armConfirmExpiry = () => {
    if (confirmExpiryRef.current) clearTimeout(confirmExpiryRef.current);
    confirmExpiryRef.current = setTimeout(() => setPending(null), CONFIRM_TIMEOUT_MS);
  };

  const showResult = (ok: boolean, text: string) => {
    setResultMsg({ ok, text });
    setTimeout(() => setResultMsg(null), 5000);
  };

  /** Fire-and-forget audit entry for every scan outcome — never blocks or fails the scan flow. */
  const logScan = (entry: { rawIdentifier: string; fileRecordId?: string | null; result: 'OPENED' | 'ADVANCED' | 'SKIPPED' | 'NOT_FOUND' | 'ERROR'; message: string }) => {
    fetch('/api/scan-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
  };

  /**
   * Three ways to resolve the popup: scan the same QR again, or press Next
   * (both move the file to its next stage, sending the kiosk message), or
   * press Skip (bypasses the stage — no remarks, no message), or Cancel
   * (does nothing).
   */
  const confirmStageAction = async (target: PendingFile, action: 'EXIT' | 'SKIP') => {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/files/${target.recordId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const text = action === 'SKIP'
          ? `"${target.description}" (${target.smsRefNo}) — stage skipped.`
          : `"${target.description}" (${target.smsRefNo}) advanced to the next stage.`;
        showResult(true, text);
        logScan({ rawIdentifier: target.identifier, fileRecordId: target.recordId, result: action === 'SKIP' ? 'SKIPPED' : 'ADVANCED', message: text });
        window.dispatchEvent(new CustomEvent(STAGE_ADVANCED_EVENT, { detail: { fileId: target.fileId } }));
      } else {
        const d = await res.json();
        const text = d.error ?? `Failed to ${action === 'SKIP' ? 'skip' : 'advance'} stage.`;
        showResult(false, text);
        logScan({ rawIdentifier: target.identifier, fileRecordId: target.recordId, result: 'ERROR', message: text });
      }
    } catch {
      const text = `Network error ${action === 'SKIP' ? 'skipping' : 'advancing'} stage.`;
      showResult(false, text);
      logScan({ rawIdentifier: target.identifier, fileRecordId: target.recordId, result: 'ERROR', message: text });
    } finally {
      setAdvancing(false);
      clearPending();
    }
  };

  const processScan = async (raw: string, currentPending: PendingFile | null) => {
    const identifier = parseQRValue(raw);
    if (!identifier) return;

    // Same QR scanned again while its confirm popup is still open — advance to the next stage, don't re-navigate.
    if (currentPending && currentPending.identifier === identifier) {
      confirmStageAction(currentPending, 'EXIT');
      return;
    }

    try {
      const res = await fetch(`/api/qr-resolver?id=${encodeURIComponent(identifier)}`);
      const data = await res.json();
      if (!res.ok || !data.file) {
        showResult(false, 'QR not recognized — no matching file.');
        logScan({ rawIdentifier: identifier, result: 'NOT_FOUND', message: 'QR not recognized — no matching file.' });
        return;
      }
      const f = data.file;

      // Navigate with the file's own uuid, never the raw scanned identifier —
      // an sms ref no like "SMS/LOG/201" contains slashes that would otherwise
      // be misread as extra path segments by the [fileId] route.
      router.push(`/admin/file/${f.fileId}`);
      logScan({
        rawIdentifier: identifier,
        fileRecordId: f.id,
        result: 'OPENED',
        message: `Opened "${f.description}" (${f.smsRefNo})`,
      });

      if (!isAdminUser) return;

      const stages: { stageId: string; stageName: string; sequenceOrder: number }[] = f.stages ?? [];
      const sorted = [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      const currentIndex = sorted.findIndex((s) => s.stageId === f.currentStageId);
      const nextStage = currentIndex >= 0 ? sorted[currentIndex + 1] : undefined;

      setPending({
        recordId: f.id,
        fileId: f.fileId,
        identifier,
        smsRefNo: f.smsRefNo,
        description: f.description,
        departmentName: f.departmentName,
        currentStageName: f.currentStageName,
        nextStageName: nextStage ? nextStage.stageName : null,
        status: f.status,
      });
      armConfirmExpiry();
    } catch {
      showResult(false, 'Network error resolving QR.');
      logScan({ rawIdentifier: identifier, result: 'ERROR', message: 'Network error resolving QR.' });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore only actual text-entry controls. NOT button/a — after any
      // normal sidebar/nav click, the browser leaves focus sitting on that
      // <a>/<button>, and a scan can land at any time afterwards, so this
      // must not require focus to be on plain page content.
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        bufferRef.current += '\n';
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      } else {
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const raw = bufferRef.current.trim();
        bufferRef.current = '';
        if (raw.length > 4) {
          processScan(raw, pending);
        }
      }, SCAN_IDLE_MS);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (confirmExpiryRef.current) clearTimeout(confirmExpiryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminUser, pending]);

  if (!pending && !resultMsg) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: pending ? 'rgba(0,0,0,0.45)' : 'transparent',
        display: 'flex',
        alignItems: pending ? 'center' : 'flex-end',
        justifyContent: pending ? 'center' : 'flex-end',
        padding: pending ? 0 : '1.5rem',
        pointerEvents: pending ? 'auto' : 'none',
        zIndex: 2000,
      }}
    >
      {pending && (
        <div
          className="card"
          style={{ width: '100%', maxWidth: 360, background: 'var(--bg-white)', pointerEvents: 'auto' }}
        >
          <div className="card-header">Confirm Stage Change</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>{pending.description}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            File No: <span style={{ fontFamily: 'var(--font-mono)' }}>{pending.smsRefNo}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Department: {pending.departmentName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Current Stage: {pending.currentStageName ?? '—'}
          </div>
          {pending.currentStageName && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Next Stage: {pending.nextStageName ?? 'None — this completes the file'}
            </div>
          )}

          {pending.currentStageName ? (
            <>
              <div className="alert alert-info" style={{ marginTop: 'var(--space-md)', fontSize: '0.75rem' }}>
                Scan this QR code again, or press Next, to exit &quot;{pending.currentStageName}&quot; and move this
                file to {pending.nextStageName ? `"${pending.nextStageName}"` : 'completion'}. Press Skip to bypass
                this stage without sending a message. Cancel if you did not mean to.
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={clearPending} disabled={advancing}>
                  Cancel
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => confirmStageAction(pending, 'SKIP')} disabled={advancing}>
                  {advancing ? 'Working...' : 'Skip'}
                </button>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => confirmStageAction(pending, 'EXIT')} disabled={advancing}>
                  {advancing ? 'Working...' : 'Next'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="alert alert-error" style={{ marginTop: 'var(--space-md)', fontSize: '0.75rem' }}>
                This file has no active stage — it may already be completed.
              </div>
              <button type="button" className="btn btn-secondary w-full" style={{ marginTop: 'var(--space-sm)' }} onClick={clearPending}>
                Close
              </button>
            </>
          )}
        </div>
      )}

      {!pending && resultMsg && (
        <div
          className={`alert ${resultMsg.ok ? 'alert-success' : 'alert-error'}`}
          style={{ maxWidth: 360, fontSize: '0.75rem', boxShadow: 'var(--elevate-2)', pointerEvents: 'auto' }}
        >
          {resultMsg.text}
        </div>
      )}
    </div>
  );
}
