# Hell Is Hot - Performer Self-Service Sign-Up App

A mobile-first web application for managing performer sign-ups at live events with real-time updates, multiple payment options, and an admin dashboard.

## Features

### User Features
- **Real-time Schedule Display**: View all time blocks with available slots
- **Easy Sign-Up Flow**: Quick registration with name, performance type, and payment
- **Multiple Payment Options**: 
  - Venmo (instant)
  - Cash App (instant)
  - Apple Pay (instant)
  - Cash (requires staff password)
- **Booking Confirmation**: Instant confirmation with slot number and details
- **My Bookings**: Track all your registered performances
- **Live Updates**: Real-time slot availability and current performer display
- **Event Countdown**: Live countdown to event start

### Admin Features
- **Dashboard**: View all bookings and statistics
- **Payment Breakdown**: Track payment methods and revenue
- **Export Data**: Download performer list as CSV
- **Staff Password Management**: Set and update cash payment password
- **Real-time Monitoring**: See bookings as they happen

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Firestore + Authentication)
- **State Management**: Zustand with persistence
- **Date Handling**: date-fns

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/taylordrew4u2/hellishot.git
cd hellishot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Get your Firebase configuration

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Then fill in your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_VENMO_USERNAME=your_venmo_username_here
NEXT_PUBLIC_CASHAPP_USERNAME=your_cashapp_username_here
```

### 5. Initialize Firestore Collections

The app will automatically create these collections on first use:
- `timeBlocks`: Four default time blocks (Opening, First Main, Second Main, Final)
- `bookings`: Performer bookings
- `eventConfig`: Event configuration and staff password

### 6. Create Admin User

In Firebase Console:
1. Go to Authentication
2. Add a user with email/password for admin access

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the user interface.

Open [http://localhost:3000/admin](http://localhost:3000/admin) to access the admin dashboard.

## Project Structure

```
hellishot/
├── app/
│   ├── admin/          # Admin dashboard
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main schedule page
├── components/         # React components
│   ├── TimeBlockCard.tsx
│   ├── SignUpModal.tsx
│   ├── StaffPasswordModal.tsx
│   ├── ConfirmationScreen.tsx
│   ├── MyBookings.tsx
│   ├── Countdown.tsx
│   └── CurrentPerformer.tsx
├── lib/
│   ├── firebase.ts     # Firebase configuration
│   ├── db.ts          # Database operations
│   └── store.ts       # Zustand state management
└── types/
    └── index.ts       # TypeScript types
```

## Usage

### For Performers

1. Scan the QR code at the venue entrance
2. Browse available time blocks
3. Click "Sign Up" on your preferred block
4. Enter your name and select performance type
5. Choose video recording option (optional)
6. Select payment method and complete payment
7. Receive confirmation with slot number

### For Staff

1. Log in to `/admin` with admin credentials
2. Set the staff password for cash payments
3. Monitor bookings in real-time
4. Export data as needed
5. Provide staff password to performers paying cash

## Payment Integration

### Venmo
Uses deep links to open Venmo app with pre-filled amount and memo.

### Cash App
Uses deep links to open Cash App with pre-filled amount and note.

### Apple Pay
Placeholder for Apple Pay API integration (requires additional setup).

### Cash
Requires staff password verification before booking is confirmed.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Digital Ocean
- Self-hosted with Node.js

## Security Considerations

### Firebase Security Rules
The included `firestore.rules` file provides basic security:
- Read access to timeBlocks and bookings for all users
- Booking creation allowed with validation of required fields and data types
- Write access to admin functions restricted to authenticated users only
- Deploy these rules to your Firebase project

### Staff Password Management
- Staff password is stored in Firestore (in the `eventConfig` collection)
- Password is verified server-side via Firestore read operations
- **Important**: The password is stored in plain text. For production, consider:
  - Using Firebase Cloud Functions to hash and verify passwords
  - Implementing rate limiting on password verification attempts
  - Setting password expiration after each event

### Payment Information
- Payment app usernames (Venmo/CashApp) are client-side environment variables
- These are publicly visible in the browser
- **Important**: 
  - Enable payment verification in your Venmo/Cash App accounts
  - Monitor payments for unauthorized transactions
  - Consider implementing webhook verification for automatic payment confirmation
  - For production, use proper payment gateway APIs instead of deep links

### Authentication
- Admin dashboard requires Firebase Authentication (email/password)
- Create a strong admin password in Firebase Console
- Consider enabling 2FA for admin accounts
- Use Firebase security rules to restrict admin operations

### General Best Practices
- Never commit `.env.local` to version control
- Rotate Firebase credentials if compromised
- Monitor Firestore usage and costs
- Implement rate limiting via Firebase security rules
- Regular security audits of Firestore rules and authentication

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
