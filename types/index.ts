export type PerformanceType = 'Comedy' | 'Music' | 'Dance' | 'Poetry' | 'Karaoke';

export type PaymentMethod = 'Venmo' | 'CashApp' | 'ApplePay' | 'Cash';

export type PaymentStatus = 'pending' | 'paid' | 'cash-pending';

export interface TimeBlock {
  id: string;
  name: string;
  startTime: string; // e.g., "17:30"
  endTime: string; // e.g., "18:15"
  maxSlots: number;
  filledSlots: number;
  acceptedTypes: PerformanceType[];
}

export interface Booking {
  id: string;
  blockId: string;
  name: string;
  performanceType: PerformanceType;
  slotNumber: number;
  performanceFee: number;
  videoOption: boolean;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  userId?: string; // For tracking user's bookings in local storage
}

export interface EventConfig {
  id: string;
  eventDate: Date;
  staffPassword: string;
  isActive: boolean;
  currentBlockId?: string;
}

export interface FormData {
  name: string;
  performanceType: PerformanceType;
  videoOption: boolean;
}
