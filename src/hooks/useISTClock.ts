'use client';

import { useEffect, useState } from 'react';

type ISTClockState = {
  time: string;
  date: string;
};

export function useISTClock(): ISTClockState {
  const [state, setState] = useState<ISTClockState>({ time: '', date: '' });

  useEffect(() => {
    const tick = () => {
      const now = new Date();

      setState({
        time: now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        }),
        date: now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Kolkata',
        }),
      });
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return state;
}