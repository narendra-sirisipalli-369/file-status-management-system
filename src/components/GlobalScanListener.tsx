'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseQRValue } from '@/lib/qrService';

/**
 * GlobalScanListener — mounts invisibly and monitors keyboard input bursts
 * from physical QR scanner devices (which behave like fast keyboard input ending in Enter).
 */
export default function GlobalScanListener() {
  const router = useRouter();
  const bufferRef = useRef('');
  const timerRef  = useRef<NodeJS.Timeout | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      if (e.key === 'Enter') {
        const raw = bufferRef.current.trim();
        bufferRef.current = '';
        if (timerRef.current) clearTimeout(timerRef.current);

        if (raw.length > 4) {
          const fileId = parseQRValue(raw);
          if (fileId) {
            setLastScan(fileId);
            router.push(`/admin/file/${fileId}`);
          }
        }
        return;
      }

      // Accumulate characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        // Reset buffer if user pauses too long (>500ms = human typing, not scanner)
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 500);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  if (!lastScan) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        background: 'var(--navy-faint)',
        border: '2px solid var(--navy)',
        borderRadius: 'var(--radius-md)',
        padding: '0.5rem 1rem',
        fontSize: '0.68rem',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'var(--navy)',
        zIndex: 999,
        animation: 'fadeUp 0.25s ease',
      }}
    >
      QR RESOLVED: {lastScan.slice(0, 20)}
    </div>
  );
}
