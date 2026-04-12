'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useISTClock } from '@/hooks/useISTClock';
import styles from './page.module.css';

import { Suspense } from 'react';

const DEFAULT_DEPARTMENT = 'Logistics';

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department = searchParams.get('department') ?? DEFAULT_DEPARTMENT;
  const { time, date } = useISTClock();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');

  const maxDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fromDate || !toDate) {
      setError('From Date and To Date are required.');
      return;
    }

    if (fromDate > toDate) {
      setError('From Date cannot be later than To Date.');
      return;
    }

    setError('');
    const params = new URLSearchParams({
      department,
      from: fromDate,
      to: toDate,
    });
    router.push(`/kiosk/files?${params.toString()}`);
  };

  return (
    <div className={styles.wrapper}>
      <section className={styles.metaRow}>
        <div className={styles.departmentBlock}>
          <div className={styles.metaLabel}>Selected Department</div>
          <div className={styles.departmentValue}>{department}</div>
        </div>

        <div className={styles.clockBlock} aria-live="polite">
          <div className={styles.time}>{time || '00:00:00 AM'}</div>
          <div className={styles.date}>{date}</div>
          <div className={styles.zone}>Indian Standard Time (IST)</div>
        </div>
      </section>

      <section className={styles.centerPanel}>
        <h1 className={styles.title}>Date Range Search</h1>
        <p className={styles.subtitle}>Select the file submission date range to continue.</p>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="from-date">From Date</label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              max={maxDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={styles.inputField}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="to-date">To Date</label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              max={maxDate}
              onChange={(e) => setToDate(e.target.value)}
              className={styles.inputField}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn}>Submit</button>
        </form>
      </section>
    </div>
  );
}
export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageInner />
    </Suspense>
  );
}
