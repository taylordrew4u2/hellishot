import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isConfigured } from './firebase';
import { TimeBlock, Booking, EventConfig } from '@/types';

// Helper to check if db is available
const ensureDb = () => {
  if (!isConfigured || !db) {
    throw new Error('Firebase is not configured. Please add Firebase credentials to .env.local');
  }
  return db;
};

// Collections
const TIME_BLOCKS_COLLECTION = 'timeBlocks';
const BOOKINGS_COLLECTION = 'bookings';
const EVENT_CONFIG_COLLECTION = 'eventConfig';

// Initialize default time blocks
export const initializeTimeBlocks = async () => {
  const database = ensureDb();
  const blocksRef = collection(database, TIME_BLOCKS_COLLECTION);
  const snapshot = await getDocs(blocksRef);

  if (snapshot.empty) {
    const defaultBlocks: Omit<TimeBlock, 'id'>[] = [
      {
        name: 'Opening Block',
        startTime: '17:30',
        endTime: '18:15',
        maxSlots: 8,
        filledSlots: 0,
        acceptedTypes: ['Comedy', 'Music', 'Dance', 'Poetry', 'Karaoke'],
      },
      {
        name: 'First Main Block',
        startTime: '18:15',
        endTime: '19:15',
        maxSlots: 15,
        filledSlots: 0,
        acceptedTypes: ['Comedy', 'Music', 'Dance', 'Poetry', 'Karaoke'],
      },
      {
        name: 'Second Main Block',
        startTime: '19:30',
        endTime: '20:30',
        maxSlots: 15,
        filledSlots: 0,
        acceptedTypes: ['Comedy', 'Music', 'Dance', 'Poetry', 'Karaoke'],
      },
      {
        name: 'Final Block',
        startTime: '20:30',
        endTime: '20:55',
        maxSlots: 10,
        filledSlots: 0,
        acceptedTypes: ['Comedy', 'Music', 'Dance', 'Poetry', 'Karaoke'],
      },
    ];

    for (const block of defaultBlocks) {
      await addDoc(blocksRef, block);
    }
  }
};

// Get all time blocks
export const getTimeBlocks = async (): Promise<TimeBlock[]> => {
  const database = ensureDb();
  const blocksRef = collection(database, TIME_BLOCKS_COLLECTION);
  const snapshot = await getDocs(query(blocksRef, orderBy('startTime')));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TimeBlock[];
};

// Subscribe to time blocks changes
export const subscribeToTimeBlocks = (callback: (blocks: TimeBlock[]) => void) => {
  const database = ensureDb();
  const blocksRef = collection(database, TIME_BLOCKS_COLLECTION);
  const q = query(blocksRef, orderBy('startTime'));

  return onSnapshot(q, (snapshot) => {
    const blocks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TimeBlock[];
    callback(blocks);
  });
};

// Get bookings for a specific time block
export const getBlockBookings = async (blockId: string): Promise<Booking[]> => {
  const database = ensureDb();
  const bookingsRef = collection(database, BOOKINGS_COLLECTION);
  const q = query(
    bookingsRef,
    where('blockId', '==', blockId),
    orderBy('slotNumber')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }) as Booking[];
};

// Subscribe to all bookings
export const subscribeToBookings = (callback: (bookings: Booking[]) => void) => {
  const database = ensureDb();
  const bookingsRef = collection(database, BOOKINGS_COLLECTION);
  const q = query(bookingsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    }) as Booking[];
    callback(bookings);
  });
};

// Create a new booking
export const createBooking = async (
  booking: Omit<Booking, 'id' | 'createdAt'>
): Promise<string> => {
  const database = ensureDb();
  const bookingsRef = collection(database, BOOKINGS_COLLECTION);
  const blockRef = doc(database, TIME_BLOCKS_COLLECTION, booking.blockId);

  // Add the booking
  const docRef = await addDoc(bookingsRef, {
    ...booking,
    createdAt: serverTimestamp(),
  });

  // Update the block's filled slots
  await updateDoc(blockRef, {
    filledSlots: increment(1),
  });

  return docRef.id;
};

// Get event configuration
export const getEventConfig = async (): Promise<EventConfig | null> => {
  const database = ensureDb();
  const configRef = collection(database, EVENT_CONFIG_COLLECTION);
  const snapshot = await getDocs(configRef);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    eventDate: data.eventDate?.toDate() || new Date(),
  } as EventConfig;
};

// Verify staff password
export const verifyStaffPassword = async (password: string): Promise<boolean> => {
  const config = await getEventConfig();
  return config ? config.staffPassword === password : false;
};

// Delete a booking (admin only)
export const deleteBooking = async (bookingId: string, blockId: string): Promise<void> => {
  const database = ensureDb();
  const bookingRef = doc(database, BOOKINGS_COLLECTION, bookingId);
  const blockRef = doc(database, TIME_BLOCKS_COLLECTION, blockId);

  // Remove the booking
  await updateDoc(bookingRef, { deleted: true });

  // Update the block's filled slots
  await updateDoc(blockRef, {
    filledSlots: increment(-1),
  });
};

// Update event configuration (admin only)
export const updateEventConfig = async (
  config: Partial<EventConfig>
): Promise<void> => {
  const database = ensureDb();
  const configRef = collection(database, EVENT_CONFIG_COLLECTION);
  const snapshot = await getDocs(configRef);

  if (snapshot.empty) {
    await addDoc(configRef, {
      ...config,
      eventDate: config.eventDate || new Date(),
    });
  } else {
    const docRef = doc(database, EVENT_CONFIG_COLLECTION, snapshot.docs[0].id);
    await updateDoc(docRef, config);
  }
};
