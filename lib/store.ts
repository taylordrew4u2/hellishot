import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Booking, TimeBlock } from '@/types';

interface AppState {
  timeBlocks: TimeBlock[];
  bookings: Booking[];
  myBookings: string[]; // Array of booking IDs for current user
  selectedBlock: TimeBlock | null;
  setTimeBlocks: (blocks: TimeBlock[]) => void;
  setBookings: (bookings: Booking[]) => void;
  addMyBooking: (bookingId: string) => void;
  setSelectedBlock: (block: TimeBlock | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      timeBlocks: [],
      bookings: [],
      myBookings: [],
      selectedBlock: null,
      setTimeBlocks: (blocks) => set({ timeBlocks: blocks }),
      setBookings: (bookings) => set({ bookings }),
      addMyBooking: (bookingId) =>
        set((state) => ({
          myBookings: [...state.myBookings, bookingId],
        })),
      setSelectedBlock: (block) => set({ selectedBlock: block }),
    }),
    {
      name: 'hellishot-storage',
    }
  )
);
