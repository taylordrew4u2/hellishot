'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { subscribeToTimeBlocks, subscribeToBookings } from '@/lib/db';
import { TimeBlock, Booking } from '@/types';
import TimeBlockCard from '@/components/TimeBlockCard';
import SignUpModal from '@/components/SignUpModal';
import ConfirmationScreen from '@/components/ConfirmationScreen';
import MyBookings from '@/components/MyBookings';
import Countdown from '@/components/Countdown';
import CurrentPerformer from '@/components/CurrentPerformer';
import { isAfter, isBefore, parse, addMinutes } from 'date-fns';

export default function Home() {
  const { timeBlocks, setTimeBlocks, selectedBlock, setSelectedBlock } =
    useAppStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [currentPerformer, setCurrentPerformer] = useState<Booking | null>(null);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribeBlocks = subscribeToTimeBlocks(setTimeBlocks);
    const unsubscribeBookings = subscribeToBookings((newBookings) => {
      setBookings(newBookings);
      if (newBookings.length > 0) {
        // Check for new bookings to show confirmation
        const newest = newBookings[0];
        setLatestBooking(newest);
      }
    });

    return () => {
      unsubscribeBlocks();
      unsubscribeBookings();
    };
  }, [setTimeBlocks]);

  useEffect(() => {
    // Determine current and next blocks based on time
    const updateBlockStatus = () => {
      const now = new Date();
      const today = new Date();
      const eventDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      timeBlocks.forEach((block) => {
        const startTime = parse(block.startTime, 'HH:mm', eventDate);
        const endTime = parse(block.endTime, 'HH:mm', eventDate);

        // Find current performer
        if (isAfter(now, startTime) && isBefore(now, endTime)) {
          const blockBookings = bookings.filter((b) => b.blockId === block.id);
          if (blockBookings.length > 0) {
            setCurrentPerformer(blockBookings[0]);
          }
        }
      });
    };

    updateBlockStatus();
    const interval = setInterval(updateBlockStatus, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [timeBlocks, bookings]);

  const getCurrentBlockStatus = (block: TimeBlock) => {
    const now = new Date();
    const today = new Date();
    const eventDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const startTime = parse(block.startTime, 'HH:mm', eventDate);
    const endTime = parse(block.endTime, 'HH:mm', eventDate);

    if (isAfter(now, startTime) && isBefore(now, endTime)) {
      return 'current';
    } else if (isAfter(now, addMinutes(startTime, -15)) && isBefore(now, startTime)) {
      return 'next';
    }
    return 'upcoming';
  };

  const handleCloseModal = () => {
    setSelectedBlock(null);
  };

  const handleCloseConfirmation = () => {
    setLatestBooking(null);
  };

  // Event date - for now, set to today at 5:30 PM
  const today = new Date();
  const eventDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    17,
    30,
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900 sm:text-5xl">
            🔥 Hell Is Hot
          </h1>
          <p className="text-lg text-gray-600">
            Performer Self-Service Sign-Up
          </p>
        </div>

        {/* Countdown */}
        <div className="mb-6">
          <Countdown eventDate={eventDate} />
        </div>

        {/* Current Performer */}
        {currentPerformer && (
          <div className="mb-6">
            <CurrentPerformer performer={currentPerformer} />
          </div>
        )}

        {/* Event Timeline */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Event Timeline
          </h2>
          <p className="text-gray-600">5:00 PM - 9:00 PM</p>
        </div>

        {/* My Bookings Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowMyBookings(true)}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 sm:w-auto"
          >
            📋 My Bookings
          </button>
        </div>

        {/* Time Blocks */}
        <div className="space-y-4">
          {timeBlocks.map((block) => {
            const status = getCurrentBlockStatus(block);
            return (
              <TimeBlockCard
                key={block.id}
                block={block}
                isCurrent={status === 'current'}
                isNext={status === 'next'}
              />
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-8 rounded-lg bg-gray-800 p-6 text-center text-white">
          <p className="mb-2 text-lg font-semibold">
            Performance Fee: $3 | Video Recording: +$10
          </p>
          <p className="text-sm text-gray-300">
            Scan QR code at venue entrance to access this page
          </p>
        </div>
      </div>

      {/* Modals */}
      {selectedBlock && (
        <SignUpModal block={selectedBlock} onClose={handleCloseModal} />
      )}

      {latestBooking && (
        <ConfirmationScreen
          booking={latestBooking}
          block={timeBlocks.find((b) => b.id === latestBooking.blockId)!}
          onClose={handleCloseConfirmation}
        />
      )}

      {showMyBookings && (
        <MyBookings
          onClose={() => setShowMyBookings(false)}
          timeBlocks={timeBlocks}
        />
      )}
    </div>
  );
}
