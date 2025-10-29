'use client';

import { useState } from 'react';
import { TimeBlock, PerformanceType, PaymentMethod, FormData } from '@/types';
import { useAppStore } from '@/lib/store';
import { createBooking, getBlockBookings } from '@/lib/db';
import StaffPasswordModal from './StaffPasswordModal';

interface SignUpModalProps {
  block: TimeBlock;
  onClose: () => void;
}

const PERFORMANCE_FEE = 3;
const VIDEO_FEE = 10;

export default function SignUpModal({ block, onClose }: SignUpModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    performanceType: 'Comedy',
    videoOption: false,
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMyBooking = useAppStore((state) => state.addMyBooking);

  const totalAmount = PERFORMANCE_FEE + (formData.videoOption ? VIDEO_FEE : 0);

  const performanceTypes: PerformanceType[] = [
    'Comedy',
    'Music',
    'Dance',
    'Poetry',
    'Karaoke',
  ];

  const handleSubmit = async (method: PaymentMethod) => {
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (method === 'Cash') {
      setShowPasswordModal(true);
    } else {
      await processPayment(method);
    }
  };

  const processPayment = async (method: PaymentMethod) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current bookings to determine slot number
      const existingBookings = await getBlockBookings(block.id);
      const slotNumber = existingBookings.length + 1;

      // Create booking
      const bookingId = await createBooking({
        blockId: block.id,
        name: formData.name,
        performanceType: formData.performanceType,
        slotNumber,
        performanceFee: PERFORMANCE_FEE,
        videoOption: formData.videoOption,
        totalAmount,
        paymentMethod: method,
        paymentStatus: method === 'Cash' ? 'cash-pending' : 'paid',
        userId: crypto.randomUUID(),
      });

      // Save booking ID to user's local storage
      addMyBooking(bookingId);

      // For digital payments, redirect to payment app
      if (method !== 'Cash') {
        redirectToPayment(method);
      }

      // Close modal (confirmation will be shown on main page)
      onClose();
    } catch (err) {
      setError('Failed to create booking. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const redirectToPayment = (method: PaymentMethod) => {
    const memo = `Hell Is Hot - ${formData.name} - ${formData.performanceType}`;

    /**
     * Payment Redirection using Deep Links
     * 
     * Security Note: This implementation uses deep links to payment apps.
     * For production use, consider:
     * - Implementing proper payment gateway APIs (Stripe, Square, etc.)
     * - Using webhooks to verify payment completion
     * - Adding server-side payment verification
     * - Implementing fraud detection
     * 
     * The current implementation relies on users completing payment honestly
     * and staff verification for cash payments.
     */

    switch (method) {
      case 'Venmo':
        // Venmo deep link
        window.location.href = `venmo://paycharge?txn=pay&recipients=${process.env.NEXT_PUBLIC_VENMO_USERNAME}&amount=${totalAmount}&note=${encodeURIComponent(memo)}`;
        break;
      case 'CashApp':
        // Cash App deep link
        window.location.href = `https://cash.app/$${process.env.NEXT_PUBLIC_CASHAPP_USERNAME}/${totalAmount}?note=${encodeURIComponent(memo)}`;
        break;
      case 'ApplePay':
        // Apple Pay would require Apple Pay API integration
        alert('Apple Pay integration coming soon. Please use another payment method.');
        break;
    }
  };

  const handlePasswordSuccess = async () => {
    setShowPasswordModal(false);
    await processPayment('Cash');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Sign Up</h2>
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

          <div className="mb-4 rounded-lg bg-gray-100 p-4">
            <h3 className="font-semibold text-gray-900">{block.name}</h3>
            <p className="text-sm text-gray-600">
              {block.startTime} - {block.endTime}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Performance Type
              </label>
              <select
                value={formData.performanceType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    performanceType: e.target.value as PerformanceType,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
              >
                {performanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-gray-300 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-gray-700">Performance Fee</span>
                <span className="font-semibold text-gray-900">
                  ${PERFORMANCE_FEE}
                </span>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.videoOption}
                  onChange={(e) =>
                    setFormData({ ...formData, videoOption: e.target.checked })
                  }
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">
                  Purchase performance video (+${VIDEO_FEE})
                </span>
              </label>

              <div className="mt-3 border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-red-600">
                    ${totalAmount}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Select Payment Method
              </p>

              <button
                onClick={() => handleSubmit('Venmo')}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-[#008CFF] px-4 py-3 font-semibold text-white hover:bg-[#0077CC] disabled:opacity-50"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.83 4.5l-3.7 17.5h-5.5l2.5-11.8c.4-1.9.5-3.3.5-4.3 0-.6-.1-1.1-.2-1.4h6.4zm-8.6 0c.3.7.4 1.5.4 2.5 0 1.5-.3 3.4-1 5.8l-3.2 9.2h-5.5l3.8-17.5h5.5z" />
                </svg>
                Pay with Venmo
              </button>

              <button
                onClick={() => handleSubmit('CashApp')}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-[#00D632] px-4 py-3 font-semibold text-white hover:bg-[#00B82A] disabled:opacity-50"
              >
                <span className="mr-2 text-xl">$</span>
                Pay with Cash App
              </button>

              <button
                onClick={() => handleSubmit('ApplePay')}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-black px-4 py-3 font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Pay with Apple Pay
              </button>

              <button
                onClick={() => handleSubmit('Cash')}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                💵 Pay Cash (Staff Password Required)
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <StaffPasswordModal
          onSuccess={handlePasswordSuccess}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </>
  );
}
