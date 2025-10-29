'use client';

import { useEffect, useState } from 'react';
import { subscribeToTimeBlocks, subscribeToBookings, updateEventConfig } from '@/lib/db';
import { TimeBlock, Booking, PaymentMethod } from '@/types';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffPassword, setStaffPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeBlocks = subscribeToTimeBlocks(setTimeBlocks);
    const unsubscribeBookings = subscribeToBookings(setBookings);

    return () => {
      unsubscribeBlocks();
      unsubscribeBookings();
    };
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!auth) {
      setLoginError('Firebase is not configured');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsAuthenticated(true);
    } catch (error) {
      setLoginError('Invalid credentials');
      console.error(error);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      await updateEventConfig({ staffPassword });
      setShowPasswordModal(false);
      alert('Staff password updated successfully');
    } catch (error) {
      alert('Failed to update password');
      console.error(error);
    }
  };

  const exportData = () => {
    const csv = [
      ['Name', 'Block', 'Time', 'Slot', 'Type', 'Payment Method', 'Amount', 'Status'].join(','),
      ...bookings.map((b) => {
        const block = timeBlocks.find((bl) => bl.id === b.blockId);
        return [
          b.name,
          block?.name || '',
          `${block?.startTime}-${block?.endTime}` || '',
          b.slotNumber,
          b.performanceType,
          b.paymentMethod,
          b.totalAmount,
          b.paymentStatus,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hell-is-hot-performers.csv';
    a.click();
  };

  const getPaymentBreakdown = () => {
    const breakdown: Record<PaymentMethod, number> = {
      Venmo: 0,
      CashApp: 0,
      ApplePay: 0,
      Cash: 0,
    };

    bookings.forEach((b) => {
      breakdown[b.paymentMethod]++;
    });

    return breakdown;
  };

  const getTotalRevenue = () => {
    return bookings.reduce((sum, b) => sum + b.totalAmount, 0);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            Admin Dashboard
          </h1>

          {loginError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const paymentBreakdown = getPaymentBreakdown();
  const totalRevenue = getTotalRevenue();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard - Hell Is Hot
          </h1>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              if (auth) auth.signOut();
            }}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-600">
              Total Bookings
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {bookings.length}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-600">
              Total Revenue
            </h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              ${totalRevenue}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-600">Cash Pending</h3>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {bookings.filter((b) => b.paymentStatus === 'cash-pending').length}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-600">Paid</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {bookings.filter((b) => b.paymentStatus === 'paid').length}
            </p>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Payment Method Breakdown
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
            {Object.entries(paymentBreakdown).map(([method, count]) => (
              <div key={method} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600">{method}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={exportData}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            📥 Export Data
          </button>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
          >
            🔑 Set Staff Password
          </button>
        </div>

        {/* Bookings List */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            All Bookings ({bookings.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-left text-sm font-medium text-gray-600">
                    Slot
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-600">
                    Name
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-600">
                    Block
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-600">
                    Type
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-600">
                    Payment
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-600">
                    Amount
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const block = timeBlocks.find((b) => b.id === booking.blockId);
                  return (
                    <tr key={booking.id} className="border-b border-gray-100">
                      <td className="py-3 text-sm text-gray-900">
                        #{booking.slotNumber}
                      </td>
                      <td className="py-3 text-sm font-medium text-gray-900">
                        {booking.name}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {block?.name || 'N/A'}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {booking.performanceType}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {booking.paymentMethod}
                      </td>
                      <td className="py-3 text-sm font-medium text-gray-900">
                        ${booking.totalAmount}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            booking.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Set Staff Password
            </h2>
            <input
              type="text"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              placeholder="Enter new staff password"
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdatePassword}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Update
              </button>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 rounded-lg bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
