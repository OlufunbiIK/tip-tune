import { useState, useEffect } from 'react';

export interface AmbientClockProps {
  /** Show 24h format. Default false (12h). */
  use24h?: boolean;
  className?: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function AmbientClock({ use24h = false, className = '' }: AmbientClockProps) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = time.getHours();
  const h = use24h ? hours : hours % 12 || 12;
  const ampm = use24h ? '' : (hours >= 12 ? 'PM' : 'AM');
  const str = `${pad(h)}:${pad(time.getMinutes())}${ampm ? ` ${ampm}` : ''}`;

  return (
    <time
      dateTime={time.toISOString()}
      className={`font-light tabular-nums text-white/80 ${className}`}
      aria-live="off"
    >
      {str}
    </time>
  );
}
