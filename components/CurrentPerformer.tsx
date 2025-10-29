'use client';

import { Booking } from '@/types';

interface CurrentPerformerProps {
  performer: Booking | null;
}

export default function CurrentPerformer({ performer }: CurrentPerformerProps) {
  if (!performer) return null;

  return (
    <div className="animate-pulse rounded-lg border-2 border-red-500 bg-red-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-red-600">
            🔴 Now Performing
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {performer.name}
          </p>
          <p className="text-sm text-gray-600">{performer.performanceType}</p>
        </div>
        <div className="rounded-full bg-red-500 px-4 py-2 text-white">
          <span className="text-lg font-bold">#{performer.slotNumber}</span>
        </div>
      </div>
    </div>
  );
}
