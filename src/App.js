import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';

// Time blocks configuration
const TIME_BLOCKS = [
  { id: 1, label: '5:30 - 6:15 PM', startTime: '5:30 PM', endTime: '6:15 PM', slots: 10 },
  { id: 2, label: '6:15 - 7:00 PM', startTime: '6:15 PM', endTime: '7:00 PM', slots: 10 },
  { id: 3, label: '7:00 - 7:45 PM', startTime: '7:00 PM', endTime: '7:45 PM', slots: 10 },
  { id: 4, label: '7:45 - 9:00 PM', startTime: '7:45 PM', endTime: '9:00 PM', slots: 10 }
];

const STAFF_PASSWORD = process.env.REACT_APP_STAFF_PASSWORD || 'hell2024';
const BOOKING_FEE = 3;

function App() {
  const [currentView, setCurrentView] = useState('home'); // home, booking, payment, confirmation
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [formData, setFormData] = useState({ name: '', performanceType: '' });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashPassword, setCashPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Real-time listener for bookings
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);
    });

    return () => unsubscribe();
  }, []);

  // Calculate available slots for a time block
  const getAvailableSlots = (blockId) => {
    const block = TIME_BLOCKS.find(b => b.id === blockId);
    const bookedCount = bookings.filter(b => b.timeBlockId === blockId).length;
    return block.slots - bookedCount;
  };

  // Handle time block selection
  const handleBlockSelect = (block) => {
    const available = getAvailableSlots(block.id);
    if (available > 0) {
      setSelectedBlock(block);
      setCurrentView('booking');
      setError('');
    } else {
      setError('This time block is fully booked. Please select another.');
    }
  };

  // Handle form submission
  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.performanceType.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setCurrentView('payment');
    setError('');
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    // Validate cash payment password
    if (paymentMethod === 'cash') {
      if (cashPassword !== STAFF_PASSWORD) {
        setError('Invalid staff password');
        return;
      }
    }

    // Check availability again before booking
    const available = getAvailableSlots(selectedBlock.id);
    if (available <= 0) {
      setError('Sorry, this time block was just filled. Please select another time.');
      setCurrentView('home');
      return;
    }

    try {
      // Create booking
      const slotNumber = bookings.filter(b => b.timeBlockId === selectedBlock.id).length + 1;
      const booking = {
        timeBlockId: selectedBlock.id,
        timeBlock: selectedBlock.label,
        slotNumber,
        name: formData.name,
        performanceType: formData.performanceType,
        paymentMethod,
        timestamp: new Date().toISOString(),
        paid: paymentMethod === 'cash' ? true : false // Mark cash as paid, others need manual verification
      };

      const docRef = await addDoc(collection(db, 'bookings'), booking);
      
      setConfirmedBooking({ ...booking, id: docRef.id });
      setCurrentView('confirmation');
      setError('');
    } catch (err) {
      setError('Booking failed. Please try again.');
      console.error('Booking error:', err);
    }
  };

  // Reset to home
  const resetApp = () => {
    setCurrentView('home');
    setSelectedBlock(null);
    setFormData({ name: '', performanceType: '' });
    setPaymentMethod('');
    setCashPassword('');
    setError('');
    setConfirmedBooking(null);
  };

  return (
    <div className="App">
      {currentView === 'home' && (
        <div className="home-view">
          <header className="app-header">
            <h1>🔥 Hell Is Hot 🔥</h1>
            <p className="subtitle">Halloween Performance Night</p>
          </header>

          <div className="time-blocks">
            <h2>Select Your Performance Time</h2>
            <p className="fee-notice">Performance fee: ${BOOKING_FEE}</p>
            
            {TIME_BLOCKS.map(block => {
              const available = getAvailableSlots(block.id);
              const isAvailable = available > 0;
              
              return (
                <button
                  key={block.id}
                  className={`time-block ${!isAvailable ? 'full' : ''}`}
                  onClick={() => handleBlockSelect(block)}
                  disabled={!isAvailable}
                >
                  <div className="block-time">{block.label}</div>
                  <div className="block-slots">
                    {isAvailable ? `${available} slots available` : 'FULLY BOOKED'}
                  </div>
                </button>
              );
            })}
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      )}

      {currentView === 'booking' && (
        <div className="booking-view">
          <header className="app-header">
            <h1>🔥 Hell Is Hot 🔥</h1>
            <p className="subtitle">Performance Booking</p>
          </header>

          <div className="selected-time">
            Selected Time: <strong>{selectedBlock.label}</strong>
          </div>

          <form onSubmit={handleBookingSubmit} className="booking-form">
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="performanceType">Performance Type</label>
              <input
                type="text"
                id="performanceType"
                value={formData.performanceType}
                onChange={(e) => setFormData({ ...formData, performanceType: e.target.value })}
                placeholder="e.g., Singing, Dancing, Comedy"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={resetApp}>
                Back
              </button>
              <button type="submit" className="btn-primary">
                Continue to Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {currentView === 'payment' && (
        <div className="payment-view">
          <header className="app-header">
            <h1>🔥 Hell Is Hot 🔥</h1>
            <p className="subtitle">Payment - ${BOOKING_FEE}</p>
          </header>

          <div className="booking-summary">
            <h3>Booking Summary</h3>
            <p><strong>Time:</strong> {selectedBlock.label}</p>
            <p><strong>Name:</strong> {formData.name}</p>
            <p><strong>Performance:</strong> {formData.performanceType}</p>
            <p><strong>Fee:</strong> ${BOOKING_FEE}</p>
          </div>

          <form onSubmit={handlePaymentSubmit} className="payment-form">
            <h3>Select Payment Method</h3>

            <div className="payment-options">
              <label className={`payment-option ${paymentMethod === 'venmo' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="venmo"
                  checked={paymentMethod === 'venmo'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Venmo</span>
              </label>

              <label className={`payment-option ${paymentMethod === 'cashapp' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="cashapp"
                  checked={paymentMethod === 'cashapp'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Cash App</span>
              </label>

              <label className={`payment-option ${paymentMethod === 'applepay' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="applepay"
                  checked={paymentMethod === 'applepay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Apple Pay</span>
              </label>

              <label className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Cash (Staff Only)</span>
              </label>
            </div>

            {paymentMethod === 'cash' && (
              <div className="form-group">
                <label htmlFor="cashPassword">Staff Password</label>
                <input
                  type="password"
                  id="cashPassword"
                  value={cashPassword}
                  onChange={(e) => setCashPassword(e.target.value)}
                  placeholder="Enter staff password"
                  required
                />
              </div>
            )}

            {paymentMethod && paymentMethod !== 'cash' && (
              <div className="payment-instructions">
                <p>Please send ${BOOKING_FEE} via {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} to:</p>
                <p className="payment-handle"><strong>@HellIsHot2024</strong></p>
                <p className="payment-note">Click "Confirm Booking" after completing payment</p>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setCurrentView('booking')}>
                Back
              </button>
              <button type="submit" className="btn-primary">
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      )}

      {currentView === 'confirmation' && confirmedBooking && (
        <div className="confirmation-view">
          <header className="app-header">
            <h1>🔥 Hell Is Hot 🔥</h1>
            <p className="subtitle">Booking Confirmed!</p>
          </header>

          <div className="confirmation-details">
            <div className="success-icon">✓</div>
            <h2>You're All Set!</h2>
            
            <div className="booking-info">
              <div className="info-item">
                <span className="label">Slot Number:</span>
                <span className="value">#{confirmedBooking.slotNumber}</span>
              </div>
              <div className="info-item">
                <span className="label">Time:</span>
                <span className="value">{confirmedBooking.timeBlock}</span>
              </div>
              <div className="info-item">
                <span className="label">Name:</span>
                <span className="value">{confirmedBooking.name}</span>
              </div>
              <div className="info-item">
                <span className="label">Performance:</span>
                <span className="value">{confirmedBooking.performanceType}</span>
              </div>
            </div>

            <div className="next-steps">
              <p>Please arrive 10 minutes before your time slot.</p>
              <p>See you at Hell Is Hot! 🔥</p>
            </div>
          </div>

          <button className="btn-primary" onClick={resetApp}>
            Book Another Slot
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
