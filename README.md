# 🔥 Hell Is Hot - Halloween Performance Night

A mobile-responsive web application for managing performance bookings at the "Hell Is Hot" Halloween event. Users can scan a QR code to access the app, select time slots, book performances, and make payments.

## Features

- **QR Code Access**: No download needed - users access via QR code
- **Time Block Selection**: 4 performance time slots (5:30-9:00 PM)
- **Real-time Slot Tracking**: Prevents overbooking with live availability updates
- **Multiple Payment Options**: Venmo, Cash App, Apple Pay, or cash (with staff password)
- **Mobile-Responsive**: Optimized for all device sizes
- **Instant Confirmation**: Shows slot number and performance time

## Time Blocks

1. 5:30 - 6:15 PM (10 slots)
2. 6:15 - 7:00 PM (10 slots)
3. 7:00 - 7:45 PM (10 slots)
4. 7:45 - 9:00 PM (10 slots)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/taylordrew4u2/hellishot.git
cd hellishot
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Firestore Database
   - Copy your Firebase configuration

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Firebase configuration values
   - Set staff password for cash payments

```bash
cp .env.example .env
```

5. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Firebase Setup

### Firestore Database

Create a collection called `bookings` with the following structure:

```javascript
{
  timeBlockId: number,
  timeBlock: string,
  slotNumber: number,
  name: string,
  performanceType: string,
  paymentMethod: string,
  timestamp: string,
  paid: boolean
}
```

### Security Rules

Add these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bookings/{booking} {
      allow read: if true;
      allow create: if request.resource.data.name is string &&
                      request.resource.data.performanceType is string &&
                      request.resource.data.timeBlockId is int;
      allow update, delete: if false; // Prevent modifications
    }
  }
}
```

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase Hosting:
```bash
firebase init hosting
```

4. Deploy:
```bash
firebase deploy
```

### Generate QR Code

After deployment, generate a QR code pointing to your app's URL using a QR code generator service.

## Configuration

### Staff Password

The default staff password for cash payments is `hell2024`. Change it in your `.env` file:

```
REACT_APP_STAFF_PASSWORD=your-secure-password
```

### Performance Fee

The booking fee is set to $3. To change it, edit the `BOOKING_FEE` constant in `src/App.js`.

### Payment Handles

Update the payment handles in the payment view section of `src/App.js`:

```javascript
<p className="payment-handle"><strong>@YourVenmoHandle</strong></p>
```

## Tech Stack

- **Frontend**: React 18
- **Backend**: Firebase Firestore
- **Styling**: Custom CSS with mobile-first design
- **Real-time Updates**: Firebase real-time listeners

## Usage Flow

1. User scans QR code to access the app
2. User selects an available time block
3. User enters name and performance type
4. User chooses payment method
5. For digital payments: User completes payment externally and confirms
6. For cash: Staff enters password and confirms payment
7. User receives confirmation with slot number and time

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please create an issue in the GitHub repository.
