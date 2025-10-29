# 🔥 Hell Is Hot - Deployment Guide

This guide will help you deploy the Hell Is Hot web application to Firebase Hosting.

## Prerequisites

- Node.js (v14 or higher) installed
- npm or yarn installed
- Firebase account
- Firebase CLI installed globally: `npm install -g firebase-tools`

## Step 1: Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enter project name: `hellishot` (or your preferred name)
4. Follow the setup wizard

## Step 2: Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll update rules later)
4. Select your preferred location
5. Click "Enable"

## Step 3: Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register app with nickname: "Hell Is Hot Web App"
5. Copy the Firebase configuration object

## Step 4: Configure Environment Variables

1. Create `.env` file in project root:
```bash
cp .env.example .env
```

2. Add your Firebase configuration to `.env`:
```env
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_STAFF_PASSWORD=your-secure-password
```

## Step 5: Test Locally

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Open browser to `http://localhost:3000`
4. Test all functionality:
   - Select a time block
   - Fill in booking form
   - Test payment options
   - Test staff password for cash payments

## Step 6: Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Step 7: Initialize Firebase Hosting

1. Login to Firebase:
```bash
firebase login
```

2. Initialize Firebase in your project:
```bash
firebase init
```

3. Select the following:
   - **Firestore**: Configure security rules
   - **Hosting**: Configure files for Firebase Hosting

4. For Firestore rules:
   - File: `firestore.rules` (already exists)

5. For Hosting:
   - Public directory: `build`
   - Single-page app: `Yes`
   - Set up automatic builds: `No`
   - Overwrite index.html: `No`

## Step 8: Deploy Firestore Rules

Deploy security rules to protect your database:

```bash
firebase deploy --only firestore:rules
```

Verify rules in Firebase Console > Firestore Database > Rules

## Step 9: Deploy to Firebase Hosting

Deploy your app:

```bash
firebase deploy --only hosting
```

You'll get a hosting URL like: `https://your-project.web.app`

## Step 10: Generate QR Code

1. Copy your Firebase Hosting URL
2. Use a QR code generator (e.g., [qr-code-generator.com](https://www.qr-code-generator.com/))
3. Enter your URL
4. Download QR code as PNG
5. Print or display QR code for event

## Step 11: Configure Payment Details

Update payment handles in `src/App.js`:

```javascript
<p className="payment-handle"><strong>@YourVenmoHandle</strong></p>
```

Replace with your actual payment handles for:
- Venmo
- Cash App
- Apple Pay

Then rebuild and redeploy:
```bash
npm run build
firebase deploy --only hosting
```

## Step 12: Test Production Deployment

1. Scan QR code with mobile device
2. Test complete booking flow
3. Verify real-time slot updates across multiple devices
4. Test all payment methods
5. Verify staff password works for cash payments

## Monitoring and Maintenance

### View Live Data

1. Go to Firebase Console > Firestore Database
2. View `bookings` collection
3. See real-time bookings

### View Analytics

1. Go to Firebase Console > Analytics
2. Set up Google Analytics (optional)
3. View user engagement

### Update Slot Availability

To change number of slots per time block, edit `src/App.js`:

```javascript
const TIME_BLOCKS = [
  { id: 1, label: '5:30 - 6:15 PM', startTime: '5:30 PM', endTime: '6:15 PM', slots: 10 },
  // Change 'slots' value as needed
];
```

Then rebuild and redeploy.

### Clear Bookings (After Event)

If you need to clear bookings for a new event:

1. Go to Firebase Console > Firestore Database
2. Select `bookings` collection
3. Delete documents manually or use Firebase CLI

Or programmatically:
```bash
firebase firestore:delete bookings --recursive
```

## Troubleshooting

### Build Errors

If build fails, check:
- Node.js version (should be v14+)
- Run `npm install` again
- Check for syntax errors in code

### Firebase Connection Issues

If app can't connect to Firebase:
- Verify `.env` file exists and has correct values
- Check Firebase API key is enabled
- Verify Firestore is enabled in Firebase Console

### Payment Not Working

- Verify payment handles are correct
- Check staff password matches `.env` value
- Ensure user completes external payment before confirming

## Production Checklist

Before going live:

- [ ] Firebase project created and configured
- [ ] Firestore Database enabled
- [ ] Security rules deployed
- [ ] Environment variables configured
- [ ] Local testing completed
- [ ] Production build successful
- [ ] App deployed to Firebase Hosting
- [ ] QR code generated and printed
- [ ] Payment handles updated
- [ ] Staff password shared with staff
- [ ] Mobile responsiveness tested
- [ ] Multiple devices tested
- [ ] Real-time updates verified

## Security Notes

- Never commit `.env` file to git
- Keep staff password secure
- Review Firestore security rules regularly
- Monitor usage in Firebase Console
- Set up billing alerts in Firebase

## Support

For issues or questions:
- Check Firebase Console logs
- Review browser console for errors
- Check network tab for API failures
- Test with Firebase Emulator for development

## Updating the App

To make changes after deployment:

1. Make code changes locally
2. Test with `npm start`
3. Build: `npm run build`
4. Deploy: `firebase deploy --only hosting`
5. Clear browser cache and test

## Costs

Firebase free tier includes:
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage
- 10 GB/month transfer

For this event with ~40 total bookings, free tier is sufficient.
