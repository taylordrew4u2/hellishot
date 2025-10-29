'use client';

import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';

interface CountdownProps {
  eventDate: Date;
}

export default function Countdown({ eventDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = differenceInSeconds(eventDate, now);

      if (diff <= 0) {
        setTimeLeft('Event is live!');
        return;
      }

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours > 0) {
        setTimeLeft(
          `${hours}h ${minutes}m ${seconds}s until event starts`
        );
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s until event starts`);
      } else {
        setTimeLeft(`${seconds}s until event starts`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [eventDate]);

  return (
    <div className="rounded-lg bg-gradient-to-r from-red-600 to-orange-600 p-4 text-center text-white">
      <p className="text-sm font-medium uppercase tracking-wide">
        Countdown
      </p>
      <p className="mt-1 text-2xl font-bold">{timeLeft}</p>
    </div>
  );
}
