'use client';

import { useState } from 'react';
import { verifyStaffPassword } from '@/lib/db';

interface StaffPasswordModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function StaffPasswordModal({
  onSuccess,
  onClose,
}: StaffPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      const isValid = await verifyStaffPassword(password);

      if (isValid) {
        onSuccess();
      } else {
        setError('Invalid password. Please check with staff.');
      }
    } catch (err) {
      setError('Failed to verify password. Please try again.');
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Staff Password</h2>
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

        <p className="mb-4 text-sm text-gray-600">
          Please enter the staff password to complete your cash payment booking.
          Ask the door person for the password.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter staff password"
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            autoFocus
          />

          <button
            type="submit"
            disabled={isVerifying || !password}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isVerifying ? 'Verifying...' : 'Confirm'}
          </button>
        </form>
      </div>
    </div>
  );
}
