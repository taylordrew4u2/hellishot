'use client';

import { TimeBlock } from '@/types';
import { useAppStore } from '@/lib/store';

interface TimeBlockCardProps {
  block: TimeBlock;
  isNext?: boolean;
  isCurrent?: boolean;
}

export default function TimeBlockCard({
  block,
  isNext = false,
  isCurrent = false,
}: TimeBlockCardProps) {
  const setSelectedBlock = useAppStore((state) => state.setSelectedBlock);
  const isFull = block.filledSlots >= block.maxSlots;

  const handleSignUp = () => {
    if (!isFull) {
      setSelectedBlock(block);
    }
  };

  return (
    <div
      className={`relative rounded-lg border-2 p-6 transition-all ${
        isCurrent
          ? 'border-red-500 bg-red-50'
          : isNext
          ? 'border-orange-500 bg-orange-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {isFull && (
        <div className="absolute right-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
          FULL
        </div>
      )}
      {isCurrent && (
        <div className="absolute right-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white animate-pulse">
          LIVE
        </div>
      )}
      {isNext && !isFull && (
        <div className="absolute right-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
          NEXT UP
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900">{block.name}</h3>
        <p className="text-sm text-gray-600">
          {block.startTime} - {block.endTime}
        </p>
      </div>

      <div className="mb-4">
        <div className="text-lg font-semibold text-gray-900">
          {block.filledSlots}/{block.maxSlots} slots filled
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full ${
              isFull ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{
              width: `${(block.filledSlots / block.maxSlots) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Accepts: {block.acceptedTypes.join(', ')}
        </p>
      </div>

      <button
        onClick={handleSignUp}
        disabled={isFull}
        className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
          isFull
            ? 'cursor-not-allowed bg-gray-300 text-gray-500'
            : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        {isFull ? 'Block Full' : 'Sign Up'}
      </button>
    </div>
  );
}
