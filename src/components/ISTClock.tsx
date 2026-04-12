'use client';

import { useISTClock } from '@/hooks/useISTClock';

export default function ISTClock() {
  const { time, date } = useISTClock();

  return (
    <div className="ist-clock">
      <div className="ist-time">{time || '00:00:00 AM'}</div>
      <div>{date}</div>
      <div className="ist-label">IST</div>
    </div>
  );
}
