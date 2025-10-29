'use client';

import { Booking, TimeBlock } from '@/types';

interface ConfirmationScreenProps {
  booking: Booking;
  block: TimeBlock;
  onClose: () => void;
}

export default function ConfirmationScreen({
  booking,
  block,
  onClose,
}: ConfirmationScreenProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hell Is Hot - Booking Confirmed',
          text: `I'm performing at Hell Is Hot! ${block.name} - Slot #${booking.slotNumber}`,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      const text = `Hell Is Hot Booking\nName: ${booking.name}\nBlock: ${block.name}\nSlot: #${booking.slotNumber}\nType: ${booking.performanceType}`;
      navigator.clipboard.writeText(text);
      alert('Booking details copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">You&apos;re Booked!</h2>
        </div>

        <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 text-left">
          <div>
            <span className="text-sm text-gray-600">Name</span>
            <p className="font-semibold text-gray-900">{booking.name}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Time Block</span>
            <p className="font-semibold text-gray-900">
              {block.name} ({block.startTime} - {block.endTime})
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Slot Position</span>
            <p className="font-semibold text-gray-900">
              #{booking.slotNumber} of {block.maxSlots}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Performance Type</span>
            <p className="font-semibold text-gray-900">
              {booking.performanceType}
            </p>
          </div>
          {booking.paymentMethod === 'Cash' && (
            <div className="rounded-lg bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Cash payment pending - Please pay at the door
              </p>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-lg border-2 border-orange-500 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-orange-800">
            ⏰ Reminder: Arrive 10 minutes before your block starts
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            📤 Share Confirmation
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
