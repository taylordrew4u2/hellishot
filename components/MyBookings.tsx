'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Booking, TimeBlock } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, isConfigured } from '@/lib/firebase';

interface MyBookingsProps {
  onClose: () => void;
  timeBlocks: TimeBlock[];
}

export default function MyBookings({ onClose, timeBlocks }: MyBookingsProps) {
  const myBookingIds = useAppStore((state) => state.myBookings);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (myBookingIds.length === 0 || !isConfigured || !db) {
        setLoading(false);
        return;
      }

      try {
        const bookingsRef = collection(db, 'bookings');
        const fetchedBookings: Booking[] = [];

        // Fetch bookings in batches (Firestore 'in' query limit is 10)
        for (let i = 0; i < myBookingIds.length; i += 10) {
          const batch = myBookingIds.slice(i, i + 10);
          const q = query(bookingsRef, where('__name__', 'in', batch));
          const snapshot = await getDocs(q);

          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            fetchedBookings.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as Booking);
          });
        }

        setBookings(fetchedBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [myBookingIds]);

  const getBlockInfo = (blockId: string) => {
    return timeBlocks.find((b) => b.id === blockId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-red-600"></div>
            <p className="mt-4 text-gray-600">Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">You don&apos;t have any bookings yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const block = getBlockInfo(booking.blockId);
              return (
                <div
                  key={booking.id}
                  className="rounded-lg border-2 border-gray-200 p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {booking.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {booking.performanceType}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                      Slot #{booking.slotNumber}
                    </span>
                  </div>

                  {block && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">
                        {block.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {block.startTime} - {block.endTime}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                    <span className="text-sm text-gray-600">
                      {booking.paymentMethod}
                      {booking.paymentStatus === 'cash-pending' && (
                        <span className="ml-1 text-yellow-600">(Pending)</span>
                      )}
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${booking.totalAmount}
                    </span>
                  </div>

                  {booking.videoOption && (
                    <div className="mt-2 text-xs text-blue-600">
                      📹 Video recording included
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
