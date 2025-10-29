# Quick Setup Guide for Hell Is Hot

This guide will help you get the application running in under 30 minutes.

## Prerequisites
- Node.js 18+ installed
- A Google account for Firebase
- Git installed

## Step 1: Clone and Install (5 minutes)

```bash
git clone https://github.com/taylordrew4u2/hellishot.git
cd hellishot
npm install
```

## Step 2: Set Up Firebase (10 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project" or "Create Project"
3. Name it "hellishot" (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create Project"

### Enable Firestore Database

1. In the Firebase Console, click "Build" → "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll secure it later)
4. Choose your location (closest to your users)
5. Click "Enable"

### Enable Authentication

1. Click "Build" → "Authentication"
2. Click "Get started"
3. Click "Email/Password" under Sign-in method
4. Toggle "Email/Password" to enabled
5. Click "Save"

### Get Firebase Configuration

1. Click the gear icon ⚙️ → "Project settings"
2. Scroll down to "Your apps"
3. Click the web icon `</>`
4. Register app with nickname "hellishot-web"
5. Copy the `firebaseConfig` object

## Step 3: Configure Environment Variables (3 minutes)

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and paste your Firebase config:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   NEXT_PUBLIC_VENMO_USERNAME=your_venmo_username
   NEXT_PUBLIC_CASHAPP_USERNAME=your_cashapp_tag
   ```

## Step 4: Deploy Firestore Rules (2 minutes)

1. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in the project:
   ```bash
   firebase init firestore
   ```
   - Select your project
   - Use existing `firestore.rules` file
   - Use default for indexes

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 5: Create Admin User (2 minutes)

1. In Firebase Console, go to "Authentication"
2. Click "Add user"
3. Enter email: `admin@hellishot.com` (or your email)
4. Enter a strong password
5. Click "Add user"

## Step 6: Run the Application (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 7: Test the Application (5 minutes)

### Test User Flow
1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Sign Up" on any time block
3. Fill in your name and select a performance type
4. Click a payment method (it will try to open the payment app)
5. Check that booking appears in "My Bookings"

### Test Admin Dashboard
1. Open [http://localhost:3000/admin](http://localhost:3000/admin)
2. Login with the admin credentials you created
3. You should see the dashboard with booking statistics
4. Click "Set Staff Password" and set a password (e.g., "event2024")
5. Test cash payment flow:
   - Go back to main page
   - Sign up with "Pay Cash" option
   - Enter the staff password you just set
   - Verify booking appears as "cash-pending" in admin dashboard

## Step 8: Set Event Configuration (Optional)

To set the staff password and event configuration:
1. Login to admin dashboard
2. Click "🔑 Set Staff Password"
3. Enter a memorable password for your event
4. Give this password to door staff

## Deploy to Production

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Add all environment variables from `.env.local`
6. Click "Deploy"

Your app will be live in 2-3 minutes!

### Update Firestore Rules for Production

After deploying, update your Firestore rules to be more restrictive:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /timeBlocks/{blockId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /bookings/{bookingId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['blockId', 'name', 'performanceType'])
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.totalAmount >= 3;
      allow update, delete: if request.auth != null;
    }
    
    match /eventConfig/{configId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### "Firebase is not configured" error
- Make sure `.env.local` exists and has all Firebase credentials
- Restart the dev server after creating `.env.local`

### Can't login to admin
- Verify you created a user in Firebase Authentication
- Check that email and password are correct

### Bookings not appearing
- Check Firebase Console → Firestore Database
- Verify `timeBlocks`, `bookings` collections exist
- Check browser console for errors

### Payment apps not opening
- Make sure you have Venmo/Cash App installed on mobile
- Test on a mobile device (deep links don't work well on desktop)
- Verify usernames in `.env.local` are correct

## Getting QR Code for Venue

1. Deploy your app to production
2. Go to [QR Code Generator](https://www.qr-code-generator.com/)
3. Enter your production URL
4. Download and print the QR code
5. Post at venue entrance

## Support

For issues or questions:
- Check the main [README.md](README.md)
- Review [Firebase Documentation](https://firebase.google.com/docs)
- Open an issue on GitHub

Happy performing! 🔥🎤
