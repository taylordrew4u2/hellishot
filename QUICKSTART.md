# 🚀 Quick Start Guide

Get the Hell Is Hot app running in 5 minutes!

## For Development

```bash
# 1. Clone repository
git clone https://github.com/taylordrew4u2/hellishot.git
cd hellishot

# 2. Install dependencies
npm install

# 3. Create environment file (optional for local dev)
cp .env.example .env

# 4. Start development server
npm start
```

App opens at `http://localhost:3000`

**Note**: Without Firebase credentials, the app will work but won't save bookings. Real-time features will show connection errors in console (this is expected).

## For Production

```bash
# 1. Set up Firebase project at console.firebase.google.com
# 2. Enable Firestore Database
# 3. Get Firebase config and add to .env file

# 4. Install dependencies
npm install

# 5. Build for production
npm run build

# 6. Deploy to Firebase
firebase login
firebase init
firebase deploy
```

## Firebase Configuration

Create `.env` file with your Firebase credentials:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_STAFF_PASSWORD=hell2024
```

## Testing

```bash
# Run tests
npm test

# Build (check for errors)
npm run build
```

## Key Features to Test

1. ✅ Home screen shows 4 time blocks
2. ✅ Click time block → booking form appears
3. ✅ Fill name and performance type
4. ✅ Select payment method
5. ✅ For cash: enter password "hell2024"
6. ✅ Confirm booking → see confirmation screen
7. ✅ Check mobile responsiveness

## Customization

### Change Performance Fee
Edit `src/App.js`:
```javascript
const BOOKING_FEE = 3; // Change to your fee
```

### Update Time Blocks
Edit `src/App.js`:
```javascript
const TIME_BLOCKS = [
  { id: 1, label: '5:30 - 6:15 PM', startTime: '5:30 PM', endTime: '6:15 PM', slots: 10 },
  // Modify as needed
];
```

### Change Staff Password
Edit `.env`:
```env
REACT_APP_STAFF_PASSWORD=your-password
```

### Update Payment Handles
Edit `src/App.js` around line 240:
```javascript
<p className="payment-handle"><strong>@YourHandle</strong></p>
```

## Need Help?

- 📖 Full documentation: [README.md](README.md)
- 🚀 Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- 🔥 Firebase docs: [firebase.google.com/docs](https://firebase.google.com/docs)

## Common Issues

**Q: App shows Firebase errors in console**  
A: Normal in dev mode without credentials. Add `.env` file to fix.

**Q: Bookings not saving**  
A: Need Firebase setup. See DEPLOYMENT.md

**Q: Cash password not working**  
A: Default is "hell2024". Change in `.env` file.

**Q: Slots not updating in real-time**  
A: Requires Firebase connection. Check console for errors.

## Project Structure

```
hellishot/
├── public/           # Static files
├── src/
│   ├── App.js       # Main application logic
│   ├── App.css      # Application styling
│   ├── firebase.js  # Firebase configuration
│   └── ...
├── .env.example     # Environment template
├── firebase.json    # Firebase config
├── firestore.rules  # Database security rules
└── package.json     # Dependencies
```

## Scripts

- `npm start` - Development server
- `npm test` - Run tests
- `npm run build` - Production build
- `firebase deploy` - Deploy to Firebase

Happy coding! 🔥
